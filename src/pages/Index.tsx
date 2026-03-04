import { useState, useCallback } from 'react';
import { Scale, Calendar, FileText, ClipboardCopy, Download, RotateCcw, Beaker, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FormSection } from '@/components/FormSection';
import { CalculationMemory } from '@/components/CalculationMemory';
import { CalcInput, CalcResult, calculate } from '@/lib/calculator';
import { generateMinuta } from '@/lib/minutaGenerator';
import { EXAMPLES, ExampleData } from '@/lib/examples';
import { formatDateInput, formatCurrencyInput, parseCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

const MARCO_OPTIONS = ['', 'DER original', 'Reafirmação da DER', 'Desde a citação (tema 1124)', 'Outro'] as const;

const Index = () => {
  const [periodosControvertidos, setPeriodosControvertidos] = useState('');
  const [periodosAcolhidos, setPeriodosAcolhidos] = useState('');
  const [beneficioConcedido, setBeneficioConcedido] = useState(false);
  const [dataAjuizamento, setDataAjuizamento] = useState('');
  const [derPedida, setDerPedida] = useState('');
  const [dibFixada, setDibFixada] = useState('');
  const [marcoDefinidoPor, setMarcoDefinidoPor] = useState('');
  const [danoPedido, setDanoPedido] = useState(false);
  const [valorCausaDisplay, setValorCausaDisplay] = useState('');
  const [valorDanosDisplay, setValorDanosDisplay] = useState('');
  const [ajg, setAjg] = useState(true);
  const [casasDecimais, setCasasDecimais] = useState(1);
  const [limiarSucumbencia, setLimiarSucumbencia] = useState(10);

  const [result, setResult] = useState<CalcResult | null>(null);
  const [minuta, setMinuta] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const loadExample = useCallback((ex: ExampleData) => {
    setPeriodosControvertidos(ex.periodosControvertidos);
    setPeriodosAcolhidos(ex.periodosAcolhidos);
    setBeneficioConcedido(ex.beneficioConcedido);
    setDataAjuizamento(ex.dataAjuizamento);
    setDerPedida(ex.derPedida);
    setDibFixada(ex.dibFixada);
    setMarcoDefinidoPor(ex.marcoDefinidoPor);
    setDanoPedido(ex.danoPedido);
    const vc = ex.valorCausa;
    const vd = ex.valorDanos;
    setValorCausaDisplay(vc ? (vc / 100 * 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');
    setValorDanosDisplay(vd ? (vd / 100 * 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');
    setAjg(ex.ajg);
    setCasasDecimais(ex.casasDecimais);
    setLimiarSucumbencia(ex.limiarSucumbencia);
    setResult(null);
    setMinuta('');
    setErrors([]);
    toast.success('Exemplo carregado!');
  }, []);

  const handleCalculate = useCallback(() => {
    const valorCausa = parseCurrency(valorCausaDisplay);
    const valorDanos = parseCurrency(valorDanosDisplay);
    const input: CalcInput = {
      periodosControvertidos,
      periodosAcolhidos,
      beneficioConcedido,
      dataAjuizamento,
      derPedida,
      dibFixada,
      marcoDefinidoPor,
      danoPedido,
      valorCausa,
      valorDanos,
      ajg,
      casasDecimais,
      limiarSucumbencia,
    };

    const { result: r, errors: errs } = calculate(input);

    if (errs.length > 0) {
      setErrors(errs);
      setResult(null);
      setMinuta('');
      return;
    }

    setErrors([]);
    setResult(r);
    setMinuta(generateMinuta(r));
    toast.success('Cálculo realizado com sucesso!');
  }, [periodosControvertidos, periodosAcolhidos, beneficioConcedido, dataAjuizamento, derPedida, dibFixada, marcoDefinidoPor, danoPedido, valorCausaDisplay, valorDanosDisplay, ajg, casasDecimais, limiarSucumbencia]);

  const handleCopy = useCallback(() => {
    if (!minuta) return;
    navigator.clipboard.writeText(minuta).then(() => {
      toast.success('Minuta copiada!');
    });
  }, [minuta]);

  const handleDownload = useCallback(() => {
    if (!minuta) return;
    const blob = new Blob([minuta], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minuta-sucumbencia.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [minuta]);

  const handleClear = useCallback(() => {
    setPeriodosControvertidos('');
    setPeriodosAcolhidos('');
    setBeneficioConcedido(false);
    setDataAjuizamento('');
    setDerPedida('');
    setDibFixada('');
    setMarcoDefinidoPor('');
    setDanoPedido(false);
    setValorCausaDisplay('');
    setValorDanosDisplay('');
    setAjg(true);
    setCasasDecimais(1);
    setLimiarSucumbencia(10);
    setResult(null);
    setMinuta('');
    setErrors([]);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground sm:text-lg">
              Calculadora de Sucumbência Previdenciária
            </h1>
            <p className="text-xs text-muted-foreground">
              Minuta automática · 100% offline
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Beaker className="h-4 w-4" />
            <span className="font-medium">Exemplos:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => loadExample(ex)}
                className="rounded-md border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground shadow-sm transition-colors hover:bg-muted"
                title={ex.description}
              >
                {ex.label.replace(/^Exemplo \d+ — /, '')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <FormSection
              title="Períodos Controvertidos"
              description="Cole períodos da planilha, PDF ou texto livre"
              icon={<Calendar className="h-4 w-4" />}
            >
              <div>
                <label htmlFor="periodosControvertidos" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Todos os períodos controvertidos *
                </label>
                <textarea
                  id="periodosControvertidos"
                  value={periodosControvertidos}
                  onChange={e => setPeriodosControvertidos(e.target.value)}
                  placeholder={"Ex.: 01/01/1990 a 31/12/1995\n01/06/1998 a 30/06/2003"}
                  className="min-h-[100px] w-full resize-vertical rounded-md border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="periodosAcolhidos" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Períodos acolhidos (deferidos) *
                </label>
                <textarea
                  id="periodosAcolhidos"
                  value={periodosAcolhidos}
                  onChange={e => setPeriodosAcolhidos(e.target.value)}
                  placeholder="Ex.: 01/01/1990 a 31/12/1995"
                  className="min-h-[80px] w-full resize-vertical rounded-md border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Aceita dd/mm/aaaa, d/m/aa, separadores . ou -, datas inclusivas.
              </p>
            </FormSection>

            <FormSection
              title="Resultado do Benefício"
              description="Dados sobre concessão e datas (DER/DIB)"
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Benefício concedido? *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBeneficioConcedido(true)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                        beneficioConcedido
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-card text-card-foreground hover:bg-muted'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setBeneficioConcedido(false)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                        !beneficioConcedido
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-card text-card-foreground hover:bg-muted'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <label htmlFor="dataAjuizamento" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Data do ajuizamento *
                  </label>
                  <input
                    id="dataAjuizamento"
                    type="text"
                    value={dataAjuizamento}
                    onChange={e => setDataAjuizamento(formatDateInput(e.target.value))}
                    placeholder="dd/mm/aaaa"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="derPedida" className="mb-1 block text-xs font-medium text-muted-foreground">
                    DER/DIB pedida *
                  </label>
                  <input
                    id="derPedida"
                    type="text"
                    value={derPedida}
                    onChange={e => setDerPedida(formatDateInput(e.target.value))}
                    placeholder="dd/mm/aaaa"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {beneficioConcedido && (
                  <div>
                    <label htmlFor="dibFixada" className="mb-1 block text-xs font-medium text-muted-foreground">
                      DIB fixada *
                    </label>
                    <input
                      id="dibFixada"
                      type="text"
                      value={dibFixada}
                      onChange={e => setDibFixada(formatDateInput(e.target.value))}
                      placeholder="dd/mm/aaaa"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>

              {beneficioConcedido && (
                <div>
                  <label htmlFor="marcoDefinidoPor" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Marco definido por (opcional)
                  </label>
                  <select
                    id="marcoDefinidoPor"
                    value={marcoDefinidoPor}
                    onChange={e => setMarcoDefinidoPor(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {MARCO_OPTIONS.map(o => (
                      <option key={o} value={o}>{o || '— Selecione (opcional) —'}</option>
                    ))}
                  </select>
                </div>
              )}
            </FormSection>

            <FormSection
              title="Dano Moral"
              description="Se houver pedido de indenização por danos morais"
              icon={<AlertCircle className="h-4 w-4" />}
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Há pedido de danos morais?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDanoPedido(false)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      !danoPedido
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card text-card-foreground hover:bg-muted'
                    }`}
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    onClick={() => setDanoPedido(true)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      danoPedido
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card text-card-foreground hover:bg-muted'
                    }`}
                  >
                    Sim
                  </button>
                </div>
              </div>

              {danoPedido && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="valorCausa" className="mb-1 block text-xs font-medium text-muted-foreground">
                      Valor da causa (R$) *
                    </label>
                    <input
                      id="valorCausa"
                      type="text"
                      value={valorCausaDisplay}
                      onChange={e => setValorCausaDisplay(formatCurrencyInput(e.target.value))}
                      placeholder="R$ 0,00"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="valorDanos" className="mb-1 block text-xs font-medium text-muted-foreground">
                      Valor danos morais (R$) *
                    </label>
                    <input
                      id="valorDanos"
                      type="text"
                      value={valorDanosDisplay}
                      onChange={e => setValorDanosDisplay(formatCurrencyInput(e.target.value))}
                      placeholder="R$ 0,00"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </FormSection>

            <FormSection
              title="AJG e Parâmetros"
              description="Gratuidade, casas decimais e limiar de sucumbência mínima"
              icon={<Scale className="h-4 w-4" />}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Autora possui AJG?
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAjg(true)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                        ajg
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-card text-card-foreground hover:bg-muted'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setAjg(false)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                        !ajg
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-card text-card-foreground hover:bg-muted'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="casasDecimais" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Casas decimais
                  </label>
                  <select
                    id="casasDecimais"
                    value={casasDecimais}
                    onChange={e => setCasasDecimais(Number(e.target.value))}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={1}>1 casa</option>
                    <option value={2}>2 casas</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="limiarSucumbencia" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Sucumbência mínima (%)
                  </label>
                  <input
                    id="limiarSucumbencia"
                    type="number"
                    min={0}
                    max={50}
                    value={limiarSucumbencia}
                    onChange={e => setLimiarSucumbencia(Number(e.target.value))}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Se o êxito for inferior a este limiar, aplica-se sucumbência integral.
                  </p>
                </div>
              </div>
            </FormSection>

            {errors.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                {errors.map((e, i) => (
                  <p key={i} className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {e}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCalculate}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Scale className="h-4 w-4" />
                Calcular e Gerar Minuta
              </button>
              <button
                onClick={handleCopy}
                disabled={!minuta}
                className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-40"
              >
                <ClipboardCopy className="h-4 w-4" />
                Copiar
              </button>
              <button
                onClick={handleDownload}
                disabled={!minuta}
                className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Baixar .txt
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted"
              >
                <RotateCcw className="h-4 w-4" />
                Limpar
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {result && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground">Autor</p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {result.honorAutorPct.toFixed(result.casasDecimais)}%
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground">Réu</p>
                  <p className="mt-1 text-2xl font-bold text-accent">
                    {result.honorReuPct.toFixed(result.casasDecimais)}%
                  </p>
                </div>
              </div>
            )}

            {result && <CalculationMemory result={result} />}

            <div className="rounded-lg border bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-card-foreground">Minuta</h3>
                <span className="text-xs text-muted-foreground">pronta para colagem</span>
              </div>
              <div className="p-4">
                {minuta ? (
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs leading-relaxed text-foreground">
                    {minuta}
                  </pre>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Preencha os dados e clique em "Calcular" para gerar a minuta.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
          Funciona 100% offline no navegador. Nenhum dado é enviado a servidores.
        </footer>
      </main>
    </div>
  );
};

export default Index;
