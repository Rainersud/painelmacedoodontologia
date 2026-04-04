import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  Gift,
  Calendar, 
  CreditCard,
  Target, 
  Bell, 
  FileText, 
  Settings,
  LogOut,
  UserCircle,
  CalendarCheck
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

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
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, module: 'dashboard' },
  { title: 'Call Center', url: '/call-center', icon: Phone, module: 'call_center' },
  { title: 'Funil de Vendas', url: '/funil', icon: Phone, module: 'funil' },
  { title: 'Indicações', url: '/indicacoes', icon: Gift, module: 'indicacoes' },
  { title: 'Tarefas', url: '/tarefas', icon: Calendar, module: 'tarefas' },
  { title: 'Crédito Liberado', url: '/credito-liberado', icon: CreditCard, module: 'credito_liberado' },
];

const managementNavItems = [
  { title: 'Metas da Clínica', url: '/metas-clinica', icon: Target, module: 'metas_clinica' },
  { title: 'Bônus por Metas', url: '/bonus-metas', icon: Target, module: 'bonus_metas' },
  { title: 'Plano Incentivo', url: '/plano-incentivo', icon: Target, module: 'plano_incentivo' },
  { title: 'CAC & Financeiro', url: '/cac', icon: LayoutDashboard, module: 'cac' },
  { title: 'Métricas de Vendas', url: '/metricas-vendas', icon: Target, module: 'metricas_vendas' },
  { title: 'Alertas', url: '/alertas', icon: Bell, module: 'alertas' },
  { title: 'Relatórios', url: '/relatorios', icon: FileText, module: 'relatorios' },
  { title: 'Reuniões Semanais', url: '/reunioes', icon: CalendarCheck, module: 'reunioes' },
  { title: 'Funil Tráfego Pago', url: '/funil-trafego', icon: Megaphone, module: 'funil_trafego' },
];

const adminNavItems = [
  { title: 'Configurações', url: '/configuracoes', icon: Settings, module: 'configuracoes' },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fullName, role, isAdmin, signOut } = useAuth();
  const { canView } = usePermissions();

  const isActive = (path: string) => location.pathname === path;
  const initials = fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const filterVisible = (items: typeof mainNavItems) => 
    items.filter(item => isAdmin || canView(item.module));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavItem = ({ item }: { item: typeof mainNavItems[0] }) => (
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

  const visibleMain = filterVisible(mainNavItems);
  const visibleMgmt = filterVisible(managementNavItems);

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
        {visibleMain.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted mb-2">
              Principal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {visibleMain.map((item) => (
                  <NavItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleMgmt.length > 0 && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted mb-2">
              Gestão
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {visibleMgmt.map((item) => (
                  <NavItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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
                  {role === 'admin' ? 'Administrador' : 'Colaborador'}
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
            <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-destructive">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
