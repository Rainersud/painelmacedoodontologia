import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, Copy, FileText, Lightbulb, Phone, MessageCircle, Mic, Video, Search, X, ShieldQuestion } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CHECKLIST_MESA, ETAPAS, METAS_BANCADA, OBJECOES, PRINCIPIOS, REGUAS, SCRIPTS,
  buscarScripts, preencher, type Canal, type Etapa, type Objecao, type Preenchimento, type Script,
} from '@/lib/ascension/crcGuide';

const CANAL_ICON: Record<Canal, typeof Phone> = { Ligação: Phone, WhatsApp: MessageCircle, Áudio: Mic, Vídeo: Video };
const FILL_KEY = 'crc-preenchimento';

function loadFill(): Partial<Preenchimento> {
  try { return JSON.parse(localStorage.getItem(FILL_KEY) || '{}'); } catch { return {}; }
}

/** Texto do script com os campos ainda não preenchidos destacados. */
function Fala({ texto }: { texto: string }) {
  const parts = texto.split(/(\[[^\]]+\])/g);
  return (
    <p className="whitespace-pre-line text-[15px] leading-relaxed">
      {parts.map((p, i) => p.startsWith('[') && p.endsWith(']')
        ? <mark key={i} className="rounded bg-warning/20 px-1 text-foreground">{p}</mark>
        : <span key={i}>{p}</span>)}
    </p>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm" variant="outline" className="h-8 shrink-0 gap-1.5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true); setTimeout(() => setDone(false), 1500);
        } catch { toast.error('Não foi possível copiar; selecione o texto e copie.'); }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copiado' : 'Copiar'}
    </Button>
  );
}

function ScriptCard({ s, fill, highlighted }: { s: Script; fill: Partial<Preenchimento>; highlighted: boolean }) {
  const etapa = ETAPAS.find(e => e.key === s.etapa)!;
  return (
    <article
      id={`script-${s.id}`}
      className={cn('monday-card p-4 sm:p-5 space-y-3 scroll-mt-24 transition-shadow', highlighted && 'ring-2 ring-primary')}
    >
      <header className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">{etapa.label}</span>
          {s.canal.map(c => {
            const Icon = CANAL_ICON[c];
            return <span key={c} className="inline-flex items-center gap-1 text-muted-foreground"><Icon className="h-3.5 w-3.5" aria-hidden />{c}</span>;
          })}
        </div>
        <h3 className="text-base font-semibold leading-snug">{s.titulo}</h3>
        <p className="text-sm text-muted-foreground"><strong className="font-medium text-foreground">Quando usar:</strong> {s.quando}</p>
      </header>
      <div className="space-y-3">
        {s.falas.map((f, i) => {
          const texto = preencher(f.texto, fill);
          return (
            <div key={i} className="rounded-xl bg-muted/40 p-3 sm:p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground pt-1.5">{f.rotulo ?? (s.falas.length > 1 ? `Parte ${i + 1}` : 'Script')}</p>
                <CopyButton text={texto} />
              </div>
              <Fala texto={texto} />
            </div>
          );
        })}
      </div>
      {s.acao && (
        <p className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-sm">
          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
          <span>{s.acao}</span>
        </p>
      )}
      {s.objecoes?.length ? (
        <p className="text-xs text-muted-foreground">
          Ajuda com: {s.objecoes.map(o => OBJECOES.find(x => x.key === o)?.label).join(' · ')}
        </p>
      ) : null}
    </article>
  );
}

function GuiaRapido({ onOpen }: { onOpen: (titulo: string, ids: string[]) => void }) {
  return (
    <aside className="space-y-4">
      <section className="monday-card p-4 space-y-3">
        <h3 className="font-semibold">Regras de ouro</h3>
        <ul className="space-y-2.5">
          {PRINCIPIOS.map(p => (
            <li key={p.titulo} className="text-sm">
              <p className="font-medium">{p.titulo}</p>
              <p className="text-muted-foreground">{p.texto}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="monday-card p-4 space-y-3">
        <h3 className="font-semibold">Metas da bancada</h3>
        <div className="grid grid-cols-2 gap-2">
          {METAS_BANCADA.map(m => (
            <div key={m.texto} className="rounded-xl bg-muted/40 p-3">
              <p className="hero-number text-2xl text-primary">{m.valor}</p>
              <p className="text-xs text-muted-foreground">{m.texto}</p>
            </div>
          ))}
        </div>
      </section>
      {REGUAS.map(r => (
        <section key={r.titulo} className="monday-card p-4 space-y-3">
          <div>
            <h3 className="font-semibold">{r.titulo}</h3>
            <p className="text-xs text-muted-foreground">Clique numa etapa para abrir a copy.</p>
          </div>
          <ol className="relative space-y-1 border-l-2 border-primary/25 pl-4">
            {r.passos.map(p => (
              <li key={p.quando} className="relative">
                <span className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
                {p.scripts?.length ? (
                  <button
                    type="button"
                    onClick={() => onOpen(`${r.titulo} · ${p.quando}`, p.scripts!)}
                    className="group w-full rounded-lg px-2 py-1.5 -mx-2 text-left text-sm transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{p.quando}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-primary opacity-70 group-hover:opacity-100">
                        <FileText className="h-3.5 w-3.5" aria-hidden /> Copy
                      </span>
                    </span>
                    <span className="block text-muted-foreground">{p.oque}</span>
                  </button>
                ) : (
                  <div className="px-2 py-1.5 -mx-2 text-sm">
                    <p className="font-medium">{p.quando}</p>
                    <p className="text-muted-foreground">{p.oque}</p>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
      <section className="monday-card p-4 space-y-3">
        <h3 className="font-semibold">Checklist de mesa</h3>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-4">
          {CHECKLIST_MESA.map(c => <li key={c}>{c}</li>)}
        </ul>
      </section>
    </aside>
  );
}

/** ASCENSION → SCRIPTS CRC: guia da CRC com scripts pesquisáveis e quebra de objeção. */
export default function AscensionSuporte() {
  const [params] = useSearchParams();
  const alvo = params.get('script');
  const [termo, setTermo] = useState('');
  const [etapa, setEtapa] = useState<Etapa | 'todas'>('todas');
  const [objecao, setObjecao] = useState<Objecao | null>(null);
  const [fill, setFill] = useState<Partial<Preenchimento>>(loadFill);
  const [fillOpen, setFillOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState<{ titulo: string; ids: string[] } | null>(null);

  useEffect(() => { try { localStorage.setItem(FILL_KEY, JSON.stringify(fill)); } catch { /* sem storage */ } }, [fill]);

  // vindo das Tarefas: abre direto no script
  useEffect(() => {
    if (!alvo) return;
    setTermo(''); setEtapa('todas'); setObjecao(null);
    const t = setTimeout(() => document.getElementById(`script-${alvo}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => clearTimeout(t);
  }, [alvo]);

  const lista = useMemo(() => buscarScripts(SCRIPTS, termo, etapa, objecao), [termo, etapa, objecao]);
  const dica = objecao ? OBJECOES.find(o => o.key === objecao) : null;
  const filtrando = !!termo || etapa !== 'todas' || !!objecao;

  const F = ({ k, label, ph, pre = 'fill' }: { k: keyof Preenchimento; label: string; ph: string; pre?: string }) => (
    <div className="space-y-1">
      <Label htmlFor={`${pre}-${k}`} className="text-xs">{label}</Label>
      <Input id={`${pre}-${k}`} value={fill[k] ?? ''} placeholder={ph} className="h-9"
        onChange={e => setFill(f => ({ ...f, [k]: e.target.value }))} />
    </div>
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4 min-w-0">
        {/* busca */}
        <div className="monday-card p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              ref={searchRef}
              value={termo}
              onChange={e => setTermo(e.target.value)}
              placeholder='Buscar script: "preço", "família", "faltou", "24h", "vídeo"…'
              className="pl-9 pr-9 h-11 text-base"
              aria-label="Buscar script"
            />
            {termo && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted" onClick={() => { setTermo(''); searchRef.current?.focus(); }} aria-label="Limpar busca">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Etapa">
            {[{ key: 'todas' as const, label: 'Todas as etapas' }, ...ETAPAS].map(e => (
              <button
                key={e.key}
                onClick={() => setEtapa(e.key)}
                className={cn('rounded-full border px-3 py-1 text-sm transition-colors',
                  etapa === e.key ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}
                aria-pressed={etapa === e.key}
              >
                {e.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><ShieldQuestion className="h-3.5 w-3.5" /> Quebra de objeção: o que o paciente disse?</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Objeção">
              {OBJECOES.map(o => (
                <button
                  key={o.key}
                  onClick={() => setObjecao(objecao === o.key ? null : o.key)}
                  className={cn('rounded-lg border px-2.5 py-1 text-sm transition-colors',
                    objecao === o.key ? 'bg-warning/20 border-warning text-foreground' : 'hover:bg-muted')}
                  aria-pressed={objecao === o.key}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {/* preencher campos */}
          <div className="border-t pt-3">
            <button className="flex w-full items-center justify-between text-sm font-medium" onClick={() => setFillOpen(o => !o)} aria-expanded={fillOpen}>
              <span>Preencher os campos dos scripts <span className="font-normal text-muted-foreground">(nome do paciente, seu nome, clínica…)</span></span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', fillOpen && 'rotate-180')} />
            </button>
            {fillOpen && (
              <div className="mt-3 grid gap-3 grid-cols-2 md:grid-cols-4">
                {F({ k: 'paciente', label: 'Paciente', ph: 'Maria' })}
                {F({ k: 'crc', label: 'Seu nome', ph: 'Ariane' })}
                {F({ k: 'clinica', label: 'Clínica', ph: 'Macedo Odontologia' })}
                {F({ k: 'dra', label: 'Dra. avaliadora', ph: 'Nome' })}
                {F({ k: 'data', label: 'Data da consulta', ph: '18/11' })}
                {F({ k: 'horario', label: 'Horário', ph: '14h30' })}
                {F({ k: 'tratamento', label: 'Tratamento', ph: 'implantes' })}
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" className="h-9" onClick={() => setFill(f => ({ crc: f.crc, clinica: f.clinica, dra: f.dra }))}>Limpar paciente</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {dica && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
            <p className="font-medium">Como quebrar: {dica.label}</p>
            <p className="text-muted-foreground">{dica.dica}</p>
          </div>
        )}

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {lista.length} {lista.length === 1 ? 'script' : 'scripts'}{filtrando ? ' encontrados' : ''}
          {filtrando && (
            <button className="ml-2 text-primary hover:underline" onClick={() => { setTermo(''); setEtapa('todas'); setObjecao(null); }}>limpar filtros</button>
          )}
        </p>

        {lista.length === 0 ? (
          <div className="monday-card p-8 text-center text-sm text-muted-foreground">
            Nenhum script com essas palavras. Tente outra palavra, como "preço", "família" ou "confirmação".
          </div>
        ) : (
          <div className="space-y-4">
            {(etapa === 'todas' && !termo && !objecao ? ETAPAS : [null]).map(grupo => {
              const itens = grupo ? lista.filter(s => s.etapa === grupo.key) : lista;
              if (!itens.length) return null;
              return (
                <section key={grupo?.key ?? 'busca'} className="space-y-3">
                  {grupo && (
                    <div className="pt-2">
                      <h2 className="text-lg font-semibold">{grupo.label}</h2>
                      <p className="text-sm text-muted-foreground">{grupo.desc}</p>
                    </div>
                  )}
                  {itens.map(s => <ScriptCard key={s.id} s={s} fill={fill} highlighted={alvo === s.id} />)}
                </section>
              );
            })}
          </div>
        )}
      </div>
      <GuiaRapido onOpen={(titulo, ids) => setAberto({ titulo, ids })} />
      <Dialog open={!!aberto} onOpenChange={o => !o && setAberto(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{aberto?.titulo}</DialogTitle>
            <DialogDescription>Copie a fala pronta. O nome do paciente e os outros campos entram direto no texto.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 rounded-xl bg-muted/40 p-3">
            {F({ k: 'paciente', label: 'Paciente', ph: 'Maria', pre: 'dlg' })}
            {F({ k: 'crc', label: 'Seu nome', ph: 'Ariane', pre: 'dlg' })}
            {F({ k: 'horario', label: 'Horário', ph: '14h30', pre: 'dlg' })}
          </div>
          <div className="space-y-4">
            {aberto?.ids.map(id => {
              const sc = SCRIPTS.find(x => x.id === id);
              return sc ? <ScriptCard key={id} s={sc} fill={fill} highlighted={false} /> : null;
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
