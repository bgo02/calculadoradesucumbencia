/**
 * Generates the "minuta" text for pasting into court decisions.
 * Architecture: scenario-based templates with derived flags.
 */

import { CalcResult } from './calculator';
import { formatDate } from './periodParser';

// ── Helpers ──────────────────────────────────────────────────

function pct(v: number, dec: number): string {
  return (v * 100).toFixed(dec) + '%';
}

function fmtMoney(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Derived context ──────────────────────────────────────────

interface MinutaCtx {
  r: CalcResult;
  dec: number;
  sp: string;
  st: string;
  sf: string;
  isBeneficioConcedido: boolean;
  isDibIgualOuAnterior: boolean;
  isDibPosterior: boolean;
  isSucumbenciaIntegralReu: boolean;
  isSucumbenciaIntegralAutor: boolean;
  isReciproca: boolean;
  isMinimaAutor: boolean;
  isMinimaReu: boolean;
  hasDanos: boolean;
  hasAjg: boolean;
}

function buildCtx(r: CalcResult): MinutaCtx {
  const dec = r.casasDecimais;
  const isBeneficioConcedido = r.beneficioConcedido;
  const isDibIgualOuAnterior = isBeneficioConcedido && !!r.dibFixada && !!r.derPedida && r.dibFixada <= r.derPedida;
  const isDibPosterior = isBeneficioConcedido && !isDibIgualOuAnterior;

  const isMinimaReu = r.sucumbMinAplicada && r.autorShare === 1;
  const isMinimaAutor = r.sucumbMinAplicada && r.autorShare === 0;
  const isSucumbenciaIntegralReu = r.autorShare === 1;
  const isSucumbenciaIntegralAutor = r.autorShare === 0;
  const isReciproca = !isSucumbenciaIntegralReu && !isSucumbenciaIntegralAutor;

  return {
    r, dec,
    sp: pct(r.scorePeriodos, dec),
    st: pct(r.scoreTempo, dec),
    sf: pct(r.scoreFinal, dec),
    isBeneficioConcedido,
    isDibIgualOuAnterior,
    isDibPosterior,
    isSucumbenciaIntegralReu,
    isSucumbenciaIntegralAutor,
    isReciproca,
    isMinimaAutor,
    isMinimaReu,
    hasDanos: r.danoPedido && r.propDecDanos > 0,
    hasAjg: r.ajg,
  };
}

// ── 1) Fundamentação ────────────────────────────────────────

function buildFundamentacao(ctx: MinutaCtx): string[] {
  const parts: string[] = [];

  // Abertura
  parts.push('Para a distribuição dos ônus de sucumbência, adota-se critério objetivo de proveito econômico estimado, à luz do resultado efetivo dos pedidos formulados.');

  // Metodologia
  parts.push('Nos pedidos relacionados ao tempo de contribuição, considera-se, com igual peso, o êxito no reconhecimento dos períodos controvertidos e o êxito no pedido de concessão do benefício na data postulada, aferido segundo a diferença entre a DER/DIB requerida e a DIB efetivamente fixada.');

  // Subtipo do benefício
  if (!ctx.isBeneficioConcedido) {
    parts.push(`Na hipótese, o êxito quanto aos períodos controvertidos corresponde a ${ctx.sp}. Como não houve concessão do benefício, o êxito combinado nos pedidos relacionados ao tempo de contribuição corresponde a ${ctx.st}.`);
  } else if (ctx.isDibIgualOuAnterior) {
    parts.push(`Na hipótese, o êxito quanto aos períodos controvertidos corresponde a ${ctx.sp}. Tendo o benefício sido deferido na data postulada, ou em data anterior, o êxito combinado nos pedidos relacionados ao tempo de contribuição corresponde a ${ctx.st}.`);
  } else {
    parts.push(`Na hipótese, o êxito quanto aos períodos controvertidos corresponde a ${ctx.sp}. Como o benefício foi deferido em data posterior à DER/DIB requerida, o atendimento do pedido temporal é aferido pela razão entre o retroativo efetivamente obtido na data do ajuizamento (${ctx.r.obtidoDiasRetro} dias) e o retroativo pretendido (${ctx.r.totalDiasRetro} dias), o que conduz a êxito combinado de ${ctx.st} nos pedidos relacionados ao tempo de contribuição.`);
  }

  // Dano moral + fecho
  if (ctx.hasDanos) {
    parts.push(`Existindo pedido de indenização por dano moral no valor de ${fmtMoney(ctx.r.valorDanos)}, inserido em valor de causa de ${fmtMoney(ctx.r.valorCausa)}, aplica-se redutor proporcional de ${pct(ctx.r.propDecDanos, ctx.dec)}, a fim de refletir a participação econômica do pedido indenizatório rejeitado na composição do valor da causa. Após a incidência desse redutor, extrai-se êxito global de ${ctx.sf} para fins de sucumbência.`);
  } else {
    parts.push(`Desse conjunto, extrai-se êxito global de ${ctx.sf} para fins de sucumbência.`);
  }

  return parts;
}

// ── 2) Enquadramento do resultado ───────────────────────────

function buildResultadoSucumbencia(ctx: MinutaCtx): string[] {
  if (ctx.isSucumbenciaIntegralReu) {
    return ['Verifica-se que a parte autora decaiu de parcela mínima de seus pedidos, razão pela qual os ônus sucumbenciais devem ser integralmente suportados pela parte ré.'];
  }

  if (ctx.isSucumbenciaIntegralAutor) {
    if (ctx.isMinimaAutor) {
      return ['Verifica-se que a parte autora obteve êxito mínimo em seus pedidos, razão pela qual deve arcar integralmente com os ônus sucumbenciais.'];
    }
    return ['Verifica-se que a parte autora decaiu integralmente dos pedidos, razão pela qual deve arcar integralmente com os ônus sucumbenciais.'];
  }

  // Recíproca
  const autorPct = ctx.r.honorAutorPct.toFixed(ctx.dec);
  const reuPct = ctx.r.honorReuPct.toFixed(ctx.dec);
  return [`Caracterizada a sucumbência recíproca, os ônus sucumbenciais ficam distribuídos na proporção de ${autorPct}% em favor da parte autora e de ${reuPct}% em favor da parte ré.`];
}

// ── 3) Honorários ───────────────────────────────────────────

function buildHonorarios(ctx: MinutaCtx): string[] {
  const honAutor = ctx.r.honorAutorPct.toFixed(ctx.dec);
  const honReu = ctx.r.honorReuPct.toFixed(ctx.dec);

  if (ctx.isBeneficioConcedido) {
    if (ctx.isSucumbenciaIntegralReu) {
      return ['Condena-se o réu ao pagamento de honorários advocatícios, fixados nos patamares mínimos do art. 85, §3º, do CPC, observada a Súmula 111 do STJ, incidindo sobre as parcelas vencidas até a data desta sentença.'];
    }
    if (ctx.isSucumbenciaIntegralAutor) {
      return ['Condena-se a parte autora ao pagamento de honorários advocatícios em favor do procurador da parte ré, fixados nos patamares mínimos do art. 85, §3º, do CPC, observada a Súmula 111 do STJ, incidindo sobre as parcelas vencidas até a data desta sentença.'];
    }
    return [`Os honorários advocatícios são fixados nos patamares mínimos do art. 85, §3º, do CPC, observada a Súmula 111 do STJ, incidindo sobre as parcelas vencidas até a data desta sentença, cabendo ao réu o pagamento de ${honAutor}% desse montante em favor do procurador da parte autora, e à parte autora o pagamento de ${honReu}% em favor do procurador da parte ré.`];
  }

  // Benefício não concedido
  if (ctx.isSucumbenciaIntegralReu) {
    return ['Condena-se o réu ao pagamento de honorários advocatícios fixados em 10% sobre o valor atualizado da causa.'];
  }
  if (ctx.isSucumbenciaIntegralAutor) {
    return ['Condena-se a parte autora ao pagamento de honorários advocatícios fixados em 10% sobre o valor atualizado da causa.'];
  }
  return [`Os honorários advocatícios são fixados em 10% sobre o valor atualizado da causa, cabendo ao réu o pagamento de ${honAutor}% desse montante em favor do procurador da parte autora, e à parte autora o pagamento de ${honReu}% em favor do procurador da parte ré.`];
}

// ── 4) AJG e Custas ─────────────────────────────────────────

function buildAjgECustas(ctx: MinutaCtx): string[] {
  const parts: string[] = [];

  if (ctx.hasAjg && !ctx.isSucumbenciaIntegralReu) {
    parts.push('Suspende-se a exigibilidade das verbas sucumbenciais impostas à parte autora, nos termos do art. 98, §3º, do CPC.');
  }

  if (ctx.hasAjg) {
    parts.push('As partes ficam isentas do pagamento de custas, na forma da lei.');
  } else {
    parts.push('Condena-se o INSS ao ressarcimento proporcional das custas adiantadas pela parte autora.');
  }

  return parts;
}

// ── Montagem final ──────────────────────────────────────────

export function generateMinuta(r: CalcResult): string {
  const ctx = buildCtx(r);

  const blocks = [
    ...buildFundamentacao(ctx),
    ...buildResultadoSucumbencia(ctx),
    ...buildHonorarios(ctx),
    ...buildAjgECustas(ctx),
  ];

  return blocks.join('\n\n');
}

// ── Memória de cálculo ──────────────────────────────────────

export function generateMemoria(r: CalcResult): string {
  const dec = r.casasDecimais;
  const lines: string[] = [];

  lines.push('═══ MEMÓRIA DE CÁLCULO ═══');
  lines.push('');

  lines.push('▸ PERÍODOS');
  lines.push(`  Dias controvertidos: ${r.diasCont}`);
  lines.push(`  Dias acolhidos: ${r.diasAcol}`);
  lines.push(`  Score períodos: ${pct(r.scorePeriodos, dec)}`);
  lines.push('');

  lines.push('▸ BENEFÍCIO / PEDIDO TEMPORAL');
  lines.push(`  Concedido: ${r.beneficioConcedido ? 'Sim' : 'Não'}`);
  if (r.ajuizamento) lines.push(`  Data do ajuizamento: ${formatDate(r.ajuizamento)}`);
  if (r.derPedida) lines.push(`  DER/DIB pedida: ${formatDate(r.derPedida)}`);
  if (r.dibFixada) lines.push(`  DIB fixada: ${formatDate(r.dibFixada)}`);
  if (r.marcoDefinidoPor) lines.push(`  Marco definido por: ${r.marcoDefinidoPor}`);
  if (r.beneficioConcedido) {
    lines.push(`  Retroativo pretendido (dias): ${r.totalDiasRetro}`);
    lines.push(`  Retroativo obtido (dias): ${r.obtidoDiasRetro}`);
  }
  lines.push(`  Score benefício: ${pct(r.scoreBeneficio, dec)}`);
  lines.push('');

  lines.push('▸ COMBINAÇÃO (50% períodos + 50% benefício)');
  lines.push(`  Score tempo: ${pct(r.scoreTempo, dec)}`);
  lines.push('');

  if (r.danoPedido) {
    lines.push('▸ DANO MORAL');
    lines.push(`  Valor da causa: ${fmtMoney(r.valorCausa)}`);
    lines.push(`  Valor danos morais: ${fmtMoney(r.valorDanos)}`);
    lines.push(`  Proporção (redutor): ${pct(r.propDecDanos, dec)}`);
    lines.push('');
  }

  lines.push('▸ RESULTADO');
  lines.push(`  Score final (êxito autor): ${pct(r.scoreFinal, dec)}`);
  lines.push(`  Sucumbência mínima aplicada: ${r.sucumbMinAplicada ? 'Sim' : 'Não'}`);
  if (r.sucumbMinAplicada) lines.push(`  Regra: ${r.sucumbMinRegra}`);
  lines.push(`  Proporção autor: ${pct(r.autorShare, dec)}`);
  lines.push(`  Proporção réu: ${pct(r.reuShare, dec)}`);
  lines.push(`  Honorários autor: ${r.honorAutorPct.toFixed(dec)}%`);
  lines.push(`  Honorários réu: ${r.honorReuPct.toFixed(dec)}%`);
  lines.push('');

  lines.push('▸ OBSERVAÇÕES');
  lines.push('  Contagem de dias: datas inclusivas, diferença em dias corridos + 1.');
  if (r.warnings.length > 0) {
    lines.push('  Avisos:');
    r.warnings.forEach(w => lines.push(`    ⚠ ${w.message}`));
  }

  return lines.join('\n');
}
