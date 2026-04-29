/**
 * Calculation engine for sucumbência previdenciária.
 * All formulas are documented inline for auditability.
 */

import {
  parsePeriods,
  consolidate,
  countDays,
  intersect,
  parseSingleDate,
  MS_PER_DAY,
} from './periodParser';

/** Tolerância numérica para comparações de ponto flutuante. */
const EPSILON = 1e-9;

export interface CalcInput {
  periodosControvertidos: string;
  periodosAcolhidos: string;
  beneficioConcedido: boolean;
  dataAjuizamento: string;
  derPedida: string;
  dibFixada: string;
  marcoDefinidoPor: string;
  danoPedido: boolean;
  valorCausa: number;
  valorDanos: number;
  ajg: boolean;
  casasDecimais: number;
  limiarSucumbencia: number; // percent, e.g. 10
}

export interface CalcWarning {
  field: string;
  message: string;
}

export interface CalcResult {
  // Períodos
  diasCont: number;
  diasAcol: number;
  scorePeriodos: number;

  // Benefício
  beneficioConcedido: boolean;
  ajuizamento: Date | null;
  derPedida: Date | null;
  dibFixada: Date | null;
  marcoDefinidoPor: string;
  totalDiasRetro: number;
  obtidoDiasRetro: number;
  scoreBeneficio: number;

  // Combinação
  scoreTempo: number;

  // Dano moral
  danoPedido: boolean;
  valorCausa: number;
  valorDanos: number;
  propDecDanos: number;

  // Resultado
  scoreFinal: number;
  sucumbMinAplicada: boolean;
  sucumbMinRegra: string;
  autorShare: number;
  reuShare: number;
  honorAutorPct: number;
  honorReuPct: number;

  // AJG
  ajg: boolean;
  casasDecimais: number;
  limiarSucumbencia: number;

  // Warnings
  warnings: CalcWarning[];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Dias entre duas datas, contagem inclusiva:
 *   daysBetween(01/01, 31/01) = 31.
 * Unifica a convenção adotada em countDays (períodos), de modo que
 * ambos os componentes do score (períodos e retroativo) utilizem a
 * mesma unidade de medida.
 */
function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY) + 1;
}

function roundTo(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

/**
 * Normaliza pequenos resíduos de ponto flutuante para 0 ou 1.
 * Operações como scoreTempo * (1 - propDecDanos) podem produzir,
 * em certos cenários, valores como 0.999…998 ou 1.000…002. Sem
 * normalização, comparações de igualdade exata usadas no gerador
 * de minuta podem disparar o ramo errado (ex.: sucumbência
 * recíproca em lugar de sucumbência integral).
 */
function snap(v: number): number {
  if (Math.abs(v) < EPSILON) return 0;
  if (Math.abs(v - 1) < EPSILON) return 1;
  return v;
}

export function calculate(input: CalcInput): { result: CalcResult; errors: string[] } {
  const errors: string[] = [];
  const warnings: CalcWarning[] = [];

  // Parse periods
  const contRaw = parsePeriods(input.periodosControvertidos);
  const contPeriods = consolidate(contRaw);
  const diasCont = countDays(contPeriods);

  if (diasCont === 0) {
    errors.push('Informe ao menos um período controvertido válido.');
  }

  let acolPeriods = consolidate(parsePeriods(input.periodosAcolhidos));
  if (acolPeriods.length > 0 && contPeriods.length > 0) {
    acolPeriods = intersect(contPeriods, acolPeriods);
  }
  const diasAcol = countDays(acolPeriods);
  const scorePeriodos = diasCont > 0 ? clamp(diasAcol / diasCont, 0, 1) : 0;

  // Parse benefit dates
  const ajuizamento = parseSingleDate(input.dataAjuizamento);
  const derPedida = parseSingleDate(input.derPedida);
  const dibFixada = input.beneficioConcedido ? parseSingleDate(input.dibFixada) : null;

  if (!ajuizamento) errors.push('Informe a data do ajuizamento.');
  if (!derPedida) errors.push('Informe a DIB postulada.');
  if (input.beneficioConcedido && !dibFixada) errors.push('Informe a DIB fixada (benefício concedido).');

  // Sanity check: datas futuras
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const isFuture = (d: Date | null): boolean => !!d && d > todayUtc;
  if (isFuture(ajuizamento)) {
    warnings.push({ field: 'dataAjuizamento', message: 'Data de ajuizamento posterior a hoje; verifique.' });
  }
  if (isFuture(derPedida)) {
    warnings.push({ field: 'derPedida', message: 'DIB postulada posterior a hoje; verifique.' });
  }
  if (isFuture(dibFixada)) {
    warnings.push({ field: 'dibFixada', message: 'DIB fixada posterior a hoje; verifique.' });
  }

  // Score benefício
  let scoreBeneficio = 0;
  let totalDiasRetro = 0;
  let obtidoDiasRetro = 0;

  if (!input.beneficioConcedido) {
    scoreBeneficio = 0;
  } else if (ajuizamento && derPedida && dibFixada) {
    if (dibFixada <= derPedida) {
      scoreBeneficio = 1;
    } else if (dibFixada >= ajuizamento) {
      scoreBeneficio = 0;
    } else {
      totalDiasRetro = daysBetween(derPedida, ajuizamento);
      obtidoDiasRetro = daysBetween(dibFixada, ajuizamento);
      if (totalDiasRetro <= 0) {
        scoreBeneficio = dibFixada <= derPedida ? 1 : 0;
        warnings.push({
          field: 'derPedida',
          message: 'DIB postulada igual ou posterior ao ajuizamento; verifique as datas.',
        });
      } else {
        scoreBeneficio = clamp(obtidoDiasRetro / totalDiasRetro, 0, 1);
      }
    }
  }

  // Score tempo (50/50)
  const scoreTempo = 0.5 * scorePeriodos + 0.5 * scoreBeneficio;

  // Dano moral
  let propDecDanos = 0;
  if (input.danoPedido && input.valorCausa > 0) {
    propDecDanos = Math.min(1, input.valorDanos / input.valorCausa);
  }

  // Score final
  const scoreFinal = scoreTempo * (1 - propDecDanos);

  // Normaliza resíduos de ponto flutuante para valores limpos,
  // assegurando que o gerador de minuta receba sempre 0 ou 1 exatos
  // quando o resultado matemático assim o indicar.
  let autorShare = snap(scoreFinal);
  let reuShare = snap(1 - autorShare);
  let sucumbMinAplicada = false;
  let sucumbMinRegra = '';

  // Sucumbência mínima
  const limiar = input.limiarSucumbencia / 100;
  if (autorShare < limiar && autorShare > 0) {
    autorShare = 0;
    reuShare = 1;
    sucumbMinAplicada = true;
    sucumbMinRegra = `Êxito do autor (${(scoreFinal * 100).toFixed(1)}%) inferior ao limiar de ${input.limiarSucumbencia}%. Sucumbência integral em favor do réu.`;
  } else if (reuShare < limiar && reuShare > 0) {
    reuShare = 0;
    autorShare = 1;
    sucumbMinAplicada = true;
    sucumbMinRegra = `Êxito do réu (${((1 - scoreFinal) * 100).toFixed(1)}%) inferior ao limiar de ${input.limiarSucumbencia}%. Sucumbência integral em favor do autor.`;
  }

  const dec = input.casasDecimais;
  const honorAutorPct = roundTo(autorShare * 10, dec);
  const honorReuPct = roundTo(reuShare * 10, dec);

  return {
    result: {
      diasCont,
      diasAcol,
      scorePeriodos,
      beneficioConcedido: input.beneficioConcedido,
      ajuizamento,
      derPedida,
      dibFixada,
      marcoDefinidoPor: input.marcoDefinidoPor,
      totalDiasRetro,
      obtidoDiasRetro,
      scoreBeneficio,
      scoreTempo,
      danoPedido: input.danoPedido,
      valorCausa: input.valorCausa,
      valorDanos: input.valorDanos,
      propDecDanos,
      scoreFinal,
      sucumbMinAplicada,
      sucumbMinRegra,
      autorShare,
      reuShare,
      honorAutorPct,
      honorReuPct,
      ajg: input.ajg,
      casasDecimais: dec,
      limiarSucumbencia: input.limiarSucumbencia,
      warnings,
    },
    errors,
  };
}
