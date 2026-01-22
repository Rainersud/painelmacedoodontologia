import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  Calendar, 
  Target, 
  Bell, 
  FileText, 
  Settings,
  LogOut,
  UserCircle
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Leads', url: '/leads', icon: Users },
  { title: 'Funil de Vendas', url: '/funil', icon: Phone },
  { title: 'Agendamentos', url: '/agendamentos', icon: Calendar },
];

const managementNavItems = [
  { title: 'Metas', url: '/metas', icon: Target },
  { title: 'Alertas', url: '/alertas', icon: Bell },
  { title: 'Relatórios', url: '/relatorios', icon: FileText },
];

const adminNavItems = [
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { fullName, role, signOut, isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const initials = fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const NavItem = ({ item }: { item: { title: string; url: string; icon: React.ElementType } }) => (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive(item.url)}>
        <NavLink 
          to={item.url} 
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            isActive(item.url) 
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg">
            <span className="text-base font-bold text-sidebar-primary-foreground">DC</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground text-base">Dental CRM</span>
            <span className="text-xs text-sidebar-muted">Call Center</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted mb-2">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted mb-2">
            Gestão
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {managementNavItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted mb-2">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminNavItems.map((item) => (
                  <NavItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-sidebar-accent transition-colors">
              <Avatar className="h-10 w-10 ring-2 ring-sidebar-primary/30">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-sm font-medium truncate w-full text-left text-sidebar-foreground">
                  {fullName || 'Usuário'}
                </span>
                <span className="text-xs text-sidebar-muted capitalize">
                  {role === 'admin' ? 'Administrador' : 'Agente'}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <NavLink to="/perfil" className="flex items-center gap-2 cursor-pointer">
                <UserCircle className="h-4 w-4" />
                Meu Perfil
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={signOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
