import { MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMessages } from '@/hooks/useTeamMessages';
import { TeamMessagesWidget } from './TeamMessagesWidget';

/** Botão do topo: recados da equipe em qualquer tela, com o número de pendentes para a pessoa. */
export function TeamMessagesButton() {
  const { user } = useAuth();
  const { data: msgs = [] } = useTeamMessages();
  const pend = msgs.filter(m => m.to_user === user?.id && !m.done_at).length;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn('relative h-9 gap-2 rounded-full px-2.5 sm:px-3', pend > 0 && 'border-primary/40 bg-primary/10 text-primary')}
          aria-label={pend ? `Recados da equipe: ${pend} para você` : 'Recados da equipe'}>
          <MessagesSquare className="h-4 w-4" />
          <span className="hidden md:inline text-sm font-medium">Recados</span>
          {pend > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full bg-destructive px-1 text-[10px] font-semibold leading-[18px] text-destructive-foreground">
              {pend > 9 ? '9+' : pend}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-4">
        <SheetHeader className="sr-only">
          <SheetTitle>Comunicação da equipe</SheetTitle>
          <SheetDescription>Recados entre as pessoas da equipe</SheetDescription>
        </SheetHeader>
        <TeamMessagesWidget compact />
      </SheetContent>
    </Sheet>
  );
}
