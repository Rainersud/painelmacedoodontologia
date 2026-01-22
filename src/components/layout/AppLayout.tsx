import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { fullName } = useAuth();
  const initials = fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="h-full px-8 flex items-center justify-between">
              <div className="flex items-center gap-6">
                {title && (
                  <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="hidden md:flex relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar leads, agendamentos..." 
                    className="w-64 pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                </Button>

                {/* User info */}
                <div className="flex items-center gap-3 pl-4 border-l border-border">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-medium text-foreground">
                      {fullName?.split(' ')[0] || 'Usuário'}
                    </span>
                    <span className="text-xs text-muted-foreground">Online</span>
                  </div>
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-8 bg-muted/30">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
