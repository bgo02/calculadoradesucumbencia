import { CalcResult } from '@/lib/calculator';
import { formatDate } from '@/lib/periodParser';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

function pct(v: number, dec: number): string {
  return (v * 100).toFixed(dec) + '%';
}

function fmtMoney(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface Props {
  result: CalcResult;
}

export function CalculationMemory({ result: r }: Props) {
  const [open, setOpen] = useState(false);
  const d = r.casasDecimais;

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold text-card-foreground hover:bg-muted/50 transition-colors rounded-lg"
      >
        <span>📊 Memória de Cálculo</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4 text-sm">
          {/* Períodos */}
          <div>
            <h4 className="font-semibold text-primary mb-1">Períodos</h4>
            <div className="space-y-0.5 text-muted-foreground">
              <p>Dias controvertidos: <span className="font-mono text-foreground">{r.diasCont}</span></p>
              <p>Dias acolhidos: <span className="font-mono text-foreground">{r.diasAcol}</span></p>
              <p>Score períodos: <span className="font-mono text-foreground">{pct(r.scorePeriodos, d)}</span></p>
            </div>
          </div>

          {/* Benefício */}
          <div>
            <h4 className="font-semibold text-primary mb-1">Benefício / Pedido Temporal</h4>
            <div className="space-y-0.5 text-muted-foreground">
              <p>Concedido: <span className="font-mono text-foreground">{r.beneficioConcedido ? 'Sim' : 'Não'}</span></p>
              {r.ajuizamento && <p>Ajuizamento: <span className="font-mono text-foreground">{formatDate(r.ajuizamento)}</span></p>}
              {r.derPedida && <p>DIB postulada: <span className="font-mono text-foreground">{formatDate(r.derPedida)}</span></p>}
              {r.dibFixada && <p>DIB fixada: <span className="font-mono text-foreground">{formatDate(r.dibFixada)}</span></p>}
              {r.marcoDefinidoPor && <p>Marco: <span className="font-mono text-foreground">{r.marcoDefinidoPor}</span></p>}
              {r.beneficioConcedido && (
                <>
                  <p>Retroativo pretendido: <span className="font-mono text-foreground">{r.totalDiasRetro} dias</span></p>
                  <p>Retroativo obtido: <span className="font-mono text-foreground">{r.obtidoDiasRetro} dias</span></p>
                </>
              )}
              <p>Score benefício: <span className="font-mono text-foreground">{pct(r.scoreBeneficio, d)}</span></p>
            </div>
          </div>

          {/* Combinação */}
          <div>
            <h4 className="font-semibold text-primary mb-1">Combinação (50/50)</h4>
            <p className="text-muted-foreground">Score tempo: <span className="font-mono text-foreground">{pct(r.scoreTempo, d)}</span></p>
          </div>

          {/* Dano moral */}
          {r.danoPedido && (
            <div>
              <h4 className="font-semibold text-primary mb-1">Dano Moral</h4>
              <div className="space-y-0.5 text-muted-foreground">
                <p>Valor da causa: <span className="font-mono text-foreground">{fmtMoney(r.valorCausa)}</span></p>
                <p>Valor danos morais: <span className="font-mono text-foreground">{fmtMoney(r.valorDanos)}</span></p>
                <p>Proporção (redutor): <span className="font-mono text-foreground">{pct(r.propDecDanos, d)}</span></p>
              </div>
            </div>
          )}

          {/* Resultado */}
          <div>
            <h4 className="font-semibold text-primary mb-1">Resultado</h4>
            <div className="space-y-0.5 text-muted-foreground">
              <p>Score final: <span className="font-mono text-foreground font-semibold">{pct(r.scoreFinal, d)}</span></p>
              <p>Sucumbência mínima: <span className="font-mono text-foreground">{r.sucumbMinAplicada ? 'Sim' : 'Não'}</span></p>
              {r.sucumbMinAplicada && <p className="text-xs text-warning">{r.sucumbMinRegra}</p>}
              <p>Autor: <span className="font-mono text-foreground">{r.honorAutorPct.toFixed(d)}%</span> · Réu: <span className="font-mono text-foreground">{r.honorReuPct.toFixed(d)}%</span></p>
            </div>
          </div>

          {/* Warnings */}
          {r.warnings.length > 0 && (
            <div>
              <h4 className="font-semibold text-warning mb-1">Avisos</h4>
              {r.warnings.map((w, i) => (
                <p key={i} className="text-xs text-warning">⚠ {w.message}</p>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground italic">
            Contagem: datas inclusivas, diferença em dias corridos + 1.
          </p>
        </div>
      )}
    </div>
  );
}
