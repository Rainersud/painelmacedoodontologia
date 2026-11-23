import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, Check, FileText, Loader2, MessagesSquare, Mic, Paperclip, Send, Square, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamNames } from '@/hooks/useTeamNames';
import {
  useDeleteTeamMessage, useSendTeamMessage, useTeamMessages, useToggleTeamMessage,
  type TeamMessage, type TeamMessageFile,
} from '@/hooks/useTeamMessages';

type Aba = 'para_mim' | 'enviados' | 'todos';
const MAX_MB = 50;

function Anexo({ f }: { f: TeamMessageFile }) {
  if (!f.url) return <span className="text-xs text-muted-foreground">{f.name}</span>;
  const mime = f.mime ?? '';
  if (mime.startsWith('image/')) {
    return (
      <a href={f.url} target="_blank" rel="noreferrer" className="block">
        <img src={f.url} alt={f.name} className="max-h-40 rounded-lg border object-cover" loading="lazy" />
      </a>
    );
  }
  if (mime.startsWith('audio/')) return <audio controls src={f.url} className="h-9 w-full max-w-xs" preload="none" aria-label={f.name} />;
  if (mime.startsWith('video/')) return <video controls src={f.url} className="max-h-56 w-full max-w-sm rounded-lg border" preload="metadata" aria-label={f.name} />;
  return (
    <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted">
      <FileText className="h-3.5 w-3.5" aria-hidden /> {f.name}
    </a>
  );
}

/** Grava áudio pelo microfone e devolve um arquivo .webm para anexar ao recado. */
function useGravador(onPronto: (f: File) => void) {
  const rec = useRef<MediaRecorder | null>(null);
  const [gravando, setGravando] = useState(false);
  const [seg, setSeg] = useState(0);
  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => setSeg(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [gravando]);
  const iniciar = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const partes: Blob[] = [];
      r.ondataavailable = e => e.data.size && partes.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const tipo = r.mimeType || 'audio/webm';
        const ext = tipo.includes('mp4') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : 'webm';
        onPronto(new File(partes, `audio-${format(new Date(), 'HHmmss')}.${ext}`, { type: tipo }));
      };
      rec.current = r;
      r.start();
      setSeg(0);
      setGravando(true);
    } catch {
      toast.error('Não foi possível usar o microfone. Libere o acesso no navegador.');
    }
  };
  const parar = () => { rec.current?.stop(); setGravando(false); };
  return { gravando, seg, iniciar, parar };
}

/**
 * Comunicação da equipe: recados De → Para, com texto, áudio, imagem ou vídeo.
 * Cada pessoa vê só os recados de que participa (o administrador vê todos);
 * só quem recebe o recado pode marcar como concluído.
 */
export function TeamMessagesWidget({ compact = false }: { compact?: boolean }) {
  const { user, isAdmin } = useAuth();
  const me = user?.id ?? '';
  const { data: team } = useTeamNames();
  const { data: msgs = [], isLoading } = useTeamMessages();
  const send = useSendTeamMessage();
  const toggle = useToggleTeamMessage();
  const del = useDeleteTeamMessage();

  const pessoas = useMemo(
    () => Object.entries(team ?? {}).map(([id, t]) => ({ id, nome: t.name, painel: t.painel }))
      .filter(p => p.painel !== 'Aguardando liberação')
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [team],
  );
  const nome = (id: string) => (id === me ? 'Você' : team?.[id]?.name ?? 'Alguém');

  const [de, setDe] = useState(me);
  useEffect(() => { if (!de && me) setDe(me); }, [me, de]);
  const [para, setPara] = useState('');
  const [texto, setTexto] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [aba, setAba] = useState<Aba>('para_mim');
  const [mostrarFeitos, setMostrarFeitos] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const grav = useGravador(f => setFiles(fs => [...fs, f]));

  const addFiles = (list: FileList | null) => {
    const ok = Array.from(list ?? []).filter(f => {
      if (f.size > MAX_MB * 1024 * 1024) { toast.error(`${f.name} passa de ${MAX_MB} MB.`); return false; }
      return true;
    });
    setFiles(fs => [...fs, ...ok]);
  };

  const enviar = () => {
    const remetente = isAdmin ? de || me : me;
    if (!para) { toast.error('Escolha para quem é o recado.'); return; }
    if (para === remetente) { toast.error('O recado precisa ir para outra pessoa.'); return; }
    if (!texto.trim() && files.length === 0) { toast.error('Escreva o recado ou anexe um arquivo.'); return; }
    send.mutate({ from: remetente, to: para, texto, files }, {
      onSuccess: () => { toast.success(`Recado enviado para ${nome(para)}`); setTexto(''); setFiles([]); setPara(''); },
      onError: () => toast.error('Não foi possível enviar agora. Tente de novo.'),
    });
  };

  const pendentesParaMim = msgs.filter(m => m.to_user === me && !m.done_at).length;
  const lista = msgs.filter(m => {
    if (aba === 'para_mim' && m.to_user !== me) return false;
    if (aba === 'enviados' && m.from_user !== me) return false;
    if (!mostrarFeitos && m.done_at) return false;
    return true;
  });

  const abas: { key: Aba; label: string }[] = [
    { key: 'para_mim', label: `Para mim${pendentesParaMim ? ` (${pendentesParaMim})` : ''}` },
    { key: 'enviados', label: 'Enviados' },
    ...(isAdmin ? [{ key: 'todos' as const, label: 'Todos' }] : []),
  ];

  return (
    <section className="monday-card p-4 sm:p-5 space-y-4" aria-labelledby="recados-titulo">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="recados-titulo" className="text-base font-semibold flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-primary" aria-hidden /> Comunicação da equipe
          </h2>
          <p className="text-sm text-muted-foreground">
            Recados de uma pessoa para outra. Só quem recebe marca como concluído{isAdmin ? '; você vê todos.' : '; você vê só os seus.'}
          </p>
        </div>
        {pendentesParaMim > 0 && (
          <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            {pendentesParaMim} para você
          </span>
        )}
      </div>

      <div className={cn('grid gap-4', !compact && 'xl:grid-cols-[minmax(300px,1fr)_1.6fr]')}>
        {/* novo recado */}
        <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-1 min-w-0">
              <Label className="text-xs">De</Label>
              {isAdmin ? (
                <Select value={de} onValueChange={setDe}>
                  <SelectTrigger className="h-9 bg-card"><SelectValue placeholder="Quem manda" /></SelectTrigger>
                  <SelectContent>{pessoas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <div className="flex h-9 items-center rounded-md border bg-card px-3 text-sm">{team?.[me]?.name ?? 'Você'}</div>
              )}
            </div>
            <ArrowRight className="mb-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <div className="space-y-1 min-w-0">
              <Label className="text-xs">Para</Label>
              <Select value={para} onValueChange={setPara}>
                <SelectTrigger className="h-9 bg-card"><SelectValue placeholder="Quem faz" /></SelectTrigger>
                <SelectContent>
                  {pessoas.filter(p => p.id !== (isAdmin ? de : me)).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="recado-texto" className="text-xs">Recado</Label>
            <Textarea id="recado-texto" value={texto} onChange={e => setTexto(e.target.value)} rows={3} className="bg-card" placeholder="O que precisa ser feito?" />
          </div>
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <li key={i} className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-xs">
                  {f.type.startsWith('audio/') ? <Mic className="h-3 w-3" aria-hidden /> : <Paperclip className="h-3 w-3" aria-hidden />}
                  <span className="max-w-[140px] truncate">{f.name}</span>
                  <button type="button" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} aria-label={`Tirar ${f.name}`} className="rounded p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" multiple accept="image/*,audio/*,video/*,.pdf" className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
            <Button type="button" variant="outline" size="sm" className="gap-1.5 bg-card" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-3.5 w-3.5" /> Anexar
            </Button>
            {grav.gravando ? (
              <Button type="button" variant="destructive" size="sm" className="gap-1.5" onClick={grav.parar}>
                <Square className="h-3.5 w-3.5" /> Parar · {Math.floor(grav.seg / 60)}:{String(grav.seg % 60).padStart(2, '0')}
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-1.5 bg-card" onClick={grav.iniciar}>
                <Mic className="h-3.5 w-3.5" /> Gravar áudio
              </Button>
            )}
            <Button type="button" size="sm" className="ml-auto gap-1.5" onClick={enviar} disabled={send.isPending || grav.gravando}>
              {send.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Enviar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Anexe imagem, áudio, vídeo ou PDF (até {MAX_MB} MB cada).</p>
        </div>

        {/* lista */}
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border p-0.5 text-xs" role="tablist" aria-label="Recados">
              {abas.map(a => (
                <button key={a.key} role="tab" aria-selected={aba === a.key} onClick={() => setAba(a.key)}
                  className={cn('rounded-md px-2.5 py-1 font-medium', aba === a.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                  {a.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={mostrarFeitos} onChange={e => setMostrarFeitos(e.target.checked)} className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" />
              Mostrar concluídos
            </label>
          </div>

          {isLoading ? (
            <div className="h-24 rounded-xl bg-muted/60 animate-pulse" />
          ) : lista.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {aba === 'para_mim' ? 'Nenhum recado pendente para você.' : 'Nenhum recado aqui.'}
            </p>
          ) : (
            <ul className={cn('space-y-2 overflow-y-auto pr-1', compact ? 'max-h-[60vh]' : 'max-h-[520px]')}>
              {lista.map(m => <RecadoItem key={m.id} m={m} me={me} isAdmin={isAdmin} nome={nome}
                onToggle={done => toggle.mutate({ id: m.id, done }, { onError: e => toast.error((e as Error).message) })}
                onDelete={() => del.mutate(m)} />)}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function RecadoItem({ m, me, isAdmin, nome, onToggle, onDelete }: {
  m: TeamMessage; me: string; isAdmin: boolean; nome: (id: string) => string; onToggle: (done: boolean) => void; onDelete: () => void;
}) {
  const souResponsavel = m.to_user === me;
  const quando = new Date(m.created_at);
  return (
    <li className={cn('rounded-xl border p-3 space-y-2', m.done_at ? 'bg-muted/40' : 'bg-card', souResponsavel && !m.done_at && 'border-primary/40')}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => souResponsavel && onToggle(!m.done_at)}
          disabled={!souResponsavel}
          aria-label={m.done_at ? 'Reabrir recado' : 'Marcar como concluído'}
          title={souResponsavel ? undefined : 'Só quem recebeu o recado pode concluir'}
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            m.done_at ? 'border-success bg-success text-white' : 'border-muted-foreground/40',
            souResponsavel ? 'hover:border-success cursor-pointer' : 'cursor-not-allowed opacity-60',
          )}
        >
          {m.done_at && <Check className="h-3.5 w-3.5" />}
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="flex flex-wrap items-center gap-1.5 text-xs">
            <b className="font-semibold">{nome(m.from_user)}</b>
            <ArrowRight className="h-3 w-3 text-muted-foreground" aria-label="para" />
            <b className="font-semibold">{nome(m.to_user)}</b>
            <span className="text-muted-foreground">· {isToday(quando) ? `hoje ${format(quando, 'HH:mm')}` : format(quando, "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
          </p>
          {m.texto && <p className={cn('whitespace-pre-line text-sm', m.done_at && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{m.texto}</p>}
          {m.files.length > 0 && <div className="flex flex-wrap gap-2">{m.files.map(f => <Anexo key={f.id} f={f} />)}</div>}
          {m.done_at && (
            <p className="text-[11px] text-success">Concluído por {nome(m.done_by ?? m.to_user)} em {format(new Date(m.done_at), 'dd/MM HH:mm')}</p>
          )}
        </div>
        {(isAdmin || m.from_user === me) && (
          <button type="button" onClick={onDelete} aria-label="Apagar recado" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  );
}
