import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { fullName, role } = useAuth();
  const initials = fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <header className="sticky top-0 z-10 h-14 sm:h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shrink-0">
            <div className="h-full px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <SidebarTrigger className="shrink-0 md:hidden" />
                {title && (
                  <h1 className="text-base sm:text-xl font-semibold text-foreground tracking-tight truncate">{title}</h1>
                )}
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <div className="hidden lg:flex relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar leads, agendamentos..." 
                    className="w-48 xl:w-64 pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                </Button>

                <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-border">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                      {fullName?.split(' ')[0] || 'Usuário'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {role === 'admin' ? 'Administrador' : 'Colaborador'}
                    </span>
                  </div>
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </header>
          
          <div className="flex-1 min-h-0 p-3 sm:p-6 lg:p-8 bg-muted/30 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
