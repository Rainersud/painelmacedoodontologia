import { MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9"
          aria-label={pend ? `Recados da equipe: ${pend} para você` : 'Recados da equipe'}>
          <MessagesSquare className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
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
