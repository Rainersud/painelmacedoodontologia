import { useNavigate } from 'react-router-dom';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { PERFIL_LABELS } from '@/lib/access';

/** Faixa no topo enquanto o administrador visualiza o sistema como um colaborador. */
export function PreviewBanner() {
  const { previewAs, setPreviewAs } = useAuth();
  const navigate = useNavigate();
  if (!previewAs) return null;
  return (
    <div className="shrink-0 bg-warning/15 border-b border-warning/40 px-3 sm:px-6 py-2 flex items-center gap-3 text-sm" role="status">
      <Eye className="h-4 w-4 text-warning-strong shrink-0" aria-hidden />
      <p className="flex-1 min-w-0">
        Você está vendo o sistema como <strong>{previewAs.name}</strong>
        <span className="text-muted-foreground"> · {PERFIL_LABELS[previewAs.perfil]}</span>
        <span className="hidden md:inline text-muted-foreground">. As ações ficam travadas como para ela.</span>
      </p>
      <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => { setPreviewAs(null); navigate('/configuracoes'); }}>
        <X className="h-3.5 w-3.5 mr-1" /> Sair da visualização
      </Button>
    </div>
  );
}
