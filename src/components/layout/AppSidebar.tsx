import {
  LayoutDashboard,
  Headset,
  Filter,
  Gift,
  PhoneCall,
  CreditCard,
  Target,
  Bell,
  FileText,
  Settings,
  LogOut,
  UserCircle,
  CalendarCheck,
  Megaphone,
  Layers,
  Repeat,
  Zap,
  BarChart3,
  Award,
  TrendingUp,
  Wallet,
  LineChart,
  HeartHandshake,
  type LucideIcon,
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
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

function CollapsibleGroup({
  label,
  open,
  onToggle,
  className,
  current,
  count,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  className?: string;
  /** tela aberta agora, se pertence a este grupo (aparece com o grupo fechado) */
  current?: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <SidebarGroup className={cn('p-0', className)}>
        <CollapsibleTrigger
          className="flex w-full min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          aria-label={`${label}, ${count} ${count === 1 ? 'tela' : 'telas'}`}
        >
          <span className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground">{label}</span>
            {!open && current && (
              <span className="text-xs text-sidebar-muted truncate">Aberta: {current}</span>
            )}
          </span>
          <span className="flex items-center gap-2 shrink-0 text-sidebar-muted">
            {!open && <span className="text-xs">{count}</span>}
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <SidebarGroupContent className="mt-1">
            <SidebarMenu className="space-y-1">{children}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}


type NavItemDef = { title: string; url: string; icon: LucideIcon; module: string };

// Comercial / Vendas: o dia a dia do atendimento
const mainNavItems: NavItemDef[] = [
  { title: 'Comercial 1', url: '/funil', icon: Filter, module: 'funil' },
  { title: 'Follow Up', url: '/follow-up', icon: Repeat, module: 'funil' },
  { title: 'Retorno', url: '/tarefas', icon: PhoneCall, module: 'tarefas' },
  { title: 'Remarketing', url: '/remarketing', icon: Zap, module: 'remarketing' },
  { title: 'Comercial 2 – LTV', url: '/comercial-2', icon: HeartHandshake, module: 'comercial_2' },
  { title: 'Indicações', url: '/indicacoes', icon: Gift, module: 'indicacoes' },
  { title: 'Crédito Liberado', url: '/credito-liberado', icon: CreditCard, module: 'credito_liberado' },
];

const managementNavItems: NavItemDef[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, module: 'dashboard' },
  { title: 'Call Center', url: '/call-center', icon: Headset, module: 'call_center' },
  { title: 'Dashboard BI', url: '/bi', icon: BarChart3, module: 'bi' },
  { title: 'Metas da Clínica', url: '/metas-clinica', icon: Target, module: 'metas_clinica' },
  { title: 'Bônus por Metas', url: '/bonus-metas', icon: Award, module: 'bonus_metas' },
  { title: 'Plano Incentivo', url: '/plano-incentivo', icon: TrendingUp, module: 'plano_incentivo' },
  { title: 'CAC & Financeiro', url: '/cac', icon: Wallet, module: 'cac' },
  { title: 'Métricas de Vendas', url: '/metricas-vendas', icon: LineChart, module: 'metricas_vendas' },
  { title: 'Alertas', url: '/alertas', icon: Bell, module: 'alertas' },
  { title: 'Relatórios', url: '/relatorios', icon: FileText, module: 'relatorios' },
  { title: 'Reuniões Semanais', url: '/reunioes', icon: CalendarCheck, module: 'reunioes' },
  { title: 'Funil Tráfego Pago', url: '/funil-trafego', icon: Megaphone, module: 'funil_trafego' },
  { title: 'Central de Funis', url: '/central-funis', icon: Layers, module: 'central_funis' },
];


const adminNavItems: NavItemDef[] = [
  { title: 'Configurações', url: '/configuracoes', icon: Settings, module: 'configuracoes' },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fullName, role, isAdmin, signOut } = useAuth();
  const { canView } = usePermissions();
  const { isMobile, setOpenMobile } = useSidebar();
  const groupForPath = (path: string): string => {
    if (adminNavItems.some((i) => i.url === path)) return 'admin';
    if (managementNavItems.some((i) => i.url === path)) return 'gestao';
    if (mainNavItems.some((i) => i.url === path)) return 'principal';
    return 'principal';
  };

  const [openGroup, setOpenGroup] = useState<string | null>(() => groupForPath(location.pathname));

  // Mantém aberta a sanfona da rota atual ao navegar/recarregar
  useEffect(() => {
    setOpenGroup(groupForPath(location.pathname));
  }, [location.pathname]);



  const isActive = (path: string) => location.pathname === path;
  const initials = fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const filterVisible = (items: NavItemDef[]) =>
    items.filter(item => isAdmin || canView(item.module));
  const currentTitle = (items: NavItemDef[]) => items.find(i => isActive(i.url))?.title;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavItem = ({ item }: { item: NavItemDef }) => (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive(item.url)} className="h-auto">
        <NavLink
          to={item.url}
          // no celular, o menu fecha ao escolher uma tela
          onClick={() => { if (isMobile) setOpenMobile(false); }}
          aria-current={isActive(item.url) ? 'page' : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive(item.url)
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <item.icon className="h-5 w-5 shrink-0" aria-hidden />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const visibleMain = filterVisible(mainNavItems);
  const visibleMgmt = filterVisible(managementNavItems);

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="text-base font-bold text-sidebar-primary-foreground">M</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground text-base">Macedo Odontologia</span>
            <span className="text-xs text-sidebar-muted">Painel comercial</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {visibleMain.length > 0 && (
          <CollapsibleGroup
            label="Comercial / Vendas"
            count={visibleMain.length}
            current={currentTitle(visibleMain)}
            open={openGroup === 'principal'}
            onToggle={() => setOpenGroup(openGroup === 'principal' ? null : 'principal')}
          >
            {visibleMain.map((item) => (
              <NavItem key={item.title} item={item} />
            ))}
          </CollapsibleGroup>
        )}

        {visibleMgmt.length > 0 && (
          <CollapsibleGroup
            label="Gestão"
            className="mt-2"
            count={visibleMgmt.length}
            current={currentTitle(visibleMgmt)}
            open={openGroup === 'gestao'}
            onToggle={() => setOpenGroup(openGroup === 'gestao' ? null : 'gestao')}
          >
            {visibleMgmt.map((item) => (
              <NavItem key={item.title} item={item} />
            ))}
          </CollapsibleGroup>
        )}

        {(isAdmin || canView('configuracoes')) && (
          <CollapsibleGroup
            label="Administração"
            className="mt-2"
            count={adminNavItems.length}
            current={currentTitle(adminNavItems)}
            open={openGroup === 'admin'}
            onToggle={() => setOpenGroup(openGroup === 'admin' ? null : 'admin')}
          >
            {adminNavItems.map((item) => (
              <NavItem key={item.title} item={item} />
            ))}
          </CollapsibleGroup>
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
              <NavLink to="/perfil" onClick={() => { if (isMobile) setOpenMobile(false); }} className="flex items-center gap-2 cursor-pointer">
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
