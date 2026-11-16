import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, eachDayOfInterval, endOfMonth, format, getDate, isAfter, isSameDay, isSameMonth, startOfDay, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkline } from '@/components/charts/SmoothCharts';
import { cn } from '@/lib/utils';
import { useTeamNames } from '@/hooks/useTeamNames';
import { useCrcContagens, useCrcTarefas, useToggleCrcTarefa } from '@/hooks/useCrcTarefas';
import { ROTINA_CRC, TOTAL_TAREFAS, type Contagem } from '@/lib/ascension/crcGuide';

const CONTAGEM_LABEL: Record<Contagem, (n: number) => string> = {
  leads_hoje: n => `${n} ${n === 1 ? 'lead novo' : 'leads novos'}`,
  consultas_hoje: n => `${n} ${n === 1 ? 'consulta hoje' : 'consultas hoje'}`,
  consultas_amanha: n => `${n} ${n === 1 ? 'consulta amanhã' : 'consultas amanhã'}`,
  consultas_48h: n => `${n} em 2 dias`,
  faltas_ontem: n => `${n} sem comparecimento ontem`,
};

/** ASCENSION → Tarefas: rotina diária da CRC marcada no sistema, com histórico do mês. */
export default function AscensionTarefas() {
  const hoje = startOfDay(new Date());
  const [dia, setDia] = useState(hoje);
  const { data: marcas } = useCrcTarefas(dia);
  const toggle = useToggleCrcTarefa(dia);
  const { data: contagens } = useCrcContagens(dia);
  const { data: team } = useTeamNames();

  const d = getDate(dia);
  const doDia = marcas?.[d] ?? {};
  const feitas = Object.keys(doDia).length;
  const pct = Math.round((feitas / TOTAL_TAREFAS) * 100);

  const diasMes = useMemo(() => eachDayOfInterval({ start: startOfMonth(dia), end: endOfMonth(dia) }), [dia]);
  const pctDia = (x: Date) => Math.round((Object.keys(marcas?.[getDate(x)] ?? {}).length / TOTAL_TAREFAS) * 100);
  const passados = diasMes.filter(x => !isAfter(x, hoje));
  const serie = passados.map(pctDia);
  const media = serie.length ? Math.round(serie.reduce((a, b) => a + b, 0) / serie.length) : 0;
  const completos = serie.filter(v => v === 100).length;

  const quem = (by: string | null) => (by && team?.[by]?.name) || null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4 min-w-0">
        <div className="monday-card p-4 sm:p-5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDia(x => subDays(x, 1))} aria-label="Dia anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <div className="min-w-[170px] text-center">
              <p className="font-semibold first-letter:uppercase">{format(dia, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
              {!isSameDay(dia, hoje) && <button className="text-xs text-primary hover:underline" onClick={() => setDia(hoje)}>voltar para hoje</button>}
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDia(x => addDays(x, 1))} disabled={isSameDay(dia, hoje)} aria-label="Próximo dia"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm"><span className="hero-number text-3xl text-primary mr-1.5">{feitas}</span>de {TOTAL_TAREFAS} tarefas da rotina diária</p>
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', pct === 100 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {ROTINA_CRC.map(bloco => (
          <section key={bloco.bloco} className="monday-card p-4 sm:p-5 space-y-2">
            <h3 className="font-semibold">{bloco.bloco}</h3>
            <ul className="divide-y">
              {bloco.tarefas.map(t => {
                const m = doDia[t.id];
                const n = t.contagem && isSameDay(dia, hoje) ? contagens?.[t.contagem] : undefined;
                return (
                  <li key={t.id} className="flex items-start gap-3 py-3">
                    <Checkbox
                      id={`crc-t-${t.id}`}
                      checked={!!m}
                      onCheckedChange={v => toggle.mutate({ item: t.id, dia: d, marcado: v === true })}
                      className="mt-0.5 h-5 w-5"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <label htmlFor={`crc-t-${t.id}`} className={cn('text-sm cursor-pointer', m && 'text-muted-foreground line-through decoration-muted-foreground/50')}>
                        {t.texto}
                      </label>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        {n !== undefined && (
                          <span className={cn('rounded-full px-2 py-0.5', n > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                            {CONTAGEM_LABEL[t.contagem!](n)}
                          </span>
                        )}
                        {t.script && (
                          <Link to={`/ascension?aba=suporte&script=${t.script}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                            <FileText className="h-3.5 w-3.5" aria-hidden /> Ver script
                          </Link>
                        )}
                        {m && (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            {quem(m.by) ? `${quem(m.by)} · ` : ''}{format(new Date(m.at), 'HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

      </div>

      <aside className="space-y-4">
        <section className="monday-card p-4 space-y-3">
          <h3 className="font-semibold first-letter:uppercase">{format(dia, 'MMMM yyyy', { locale: ptBR })}</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="hero-number text-2xl text-primary">{media}%</p>
              <p className="text-xs text-muted-foreground">média de conclusão por dia</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="hero-number text-2xl text-primary">{completos}</p>
              <p className="text-xs text-muted-foreground">{completos === 1 ? 'dia com tudo feito' : 'dias com tudo feito'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">% concluído por dia</p>
            <Sparkline data={serie} height={56} />
          </div>
        </section>
        <section className="monday-card p-4 space-y-2">
          <h3 className="font-semibold">Dias do mês</h3>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => <span key={i}>{l}</span>)}
            {Array.from({ length: (startOfMonth(dia).getDay() + 6) % 7 }).map((_, i) => <span key={`v${i}`} />)}
            {diasMes.map(x => {
              const futuro = isAfter(x, hoje);
              const p = futuro ? 0 : pctDia(x);
              return (
                <button
                  key={x.toISOString()}
                  disabled={futuro}
                  onClick={() => setDia(x)}
                  title={futuro ? undefined : `${format(x, 'dd/MM')}: ${p}% concluído`}
                  aria-label={`${format(x, 'dd/MM')}: ${futuro ? 'futuro' : `${p}% concluído`}`}
                  className={cn(
                    'aspect-square rounded-md text-xs font-medium transition-colors',
                    futuro ? 'text-muted-foreground/40' : p === 0 ? 'bg-muted text-muted-foreground hover:bg-muted/70' : 'text-foreground hover:opacity-80',
                    isSameDay(x, dia) && 'ring-2 ring-primary ring-offset-1',
                  )}
                  style={!futuro && p > 0 ? { background: `hsl(var(--primary) / ${0.15 + (p / 100) * 0.65})`, color: p > 60 ? 'hsl(var(--primary-foreground))' : undefined } : undefined}
                >
                  {getDate(x)}
                </button>
              );
            })}
          </div>
          {!isSameMonth(dia, hoje) && <p className="text-xs text-muted-foreground">Mostrando um mês anterior.</p>}
        </section>
      </aside>
    </div>
  );
}
