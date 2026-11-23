import {
  Filter, Target, Settings, LogOut, UserCircle, CalendarCheck, BarChart3, HeartHandshake, Headphones, type LucideIcon,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useMenuCounts } from '@/hooks/useMenuCounts';
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
import { BookOpenCheck, MessagesSquare, ChevronDown, FileSpreadsheet, FolderKanban, ListTodo, Lock, MessageSquareQuote, Sheet } from 'lucide-react';
import { canOpenPath } from '@/lib/access';
import { useTeamMessages } from '@/hooks/useTeamMessages';
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


/** `modules`: o item aparece se a pessoa pode ver ao menos uma das telas da área. */
type NavItemDef = { title: string; url: string; icon: LucideIcon; module: string; modules?: string[] };

// Comercial / Vendas: o dia a dia do atendimento
const mainNavItems: NavItemDef[] = [
  { title: 'Comercial 1', url: '/funil', icon: Filter, module: 'funil' },
  { title: 'CRC', url: '/crc', icon: Headphones, module: 'funil' },
  { title: 'Comercial 2 – LTV', url: '/comercial-2', icon: HeartHandshake, module: 'comercial_2' },
];

// Gestão: tudo o que o Comercial alimenta (metas, dados e reuniões)
const managementNavItems: NavItemDef[] = [
  { title: 'Metas / Objetivos', url: '/objetivos', icon: Target, module: 'metas_clinica', modules: ['metas_clinica', 'plano_incentivo'] },
  { title: 'Dados / Métricas', url: '/dados', icon: BarChart3, module: 'cac', modules: ['central_funis', 'funil_trafego', 'cac', 'metricas_vendas', 'relatorios', 'bi'] },
  { title: 'Reuniões Semanais', url: '/reunioes', icon: CalendarCheck, module: 'reunioes' },
];

// ASCENSION: material da CRC e as planilhas da clínica (alimentadas pelo painel)
const ascensionSections: { label: string; icon: LucideIcon; items: NavItemDef[] }[] = [
  {
    label: 'Material CRC',
    icon: BookOpenCheck,
    items: [
      { title: 'Scripts CRC', url: '/ascension?aba=suporte', icon: MessageSquareQuote, module: 'ascension' },
      { title: 'Tarefas CRC', url: '/ascension?aba=tarefas', icon: ListTodo, module: 'ascension' },
    ],
  },
  {
    label: 'Planilhas',
    icon: FolderKanban,
    items: [
      { title: 'Acompanhamento', url: '/ascension?aba=acompanhamento', icon: FileSpreadsheet, module: 'ascension' },
      { title: 'Controle Geral', url: '/ascension?aba=controle', icon: Sheet, module: 'ascension' },
    ],
  },
];
const ascensionNavItems: NavItemDef[] = ascensionSections.flatMap(sec => sec.items);

const adminNavItems: NavItemDef[] = [
  { title: 'Configurações', url: '/configuracoes', icon: Settings, module: 'configuracoes' },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fullName, role, signOut, access, user } = useAuth();
  const { data: recados = [] } = useTeamMessages();
  const recadosPend = recados.filter(m => m.to_user === user?.id && !m.done_at).length;
  const { isMobile, setOpenMobile } = useSidebar();
  const groupForPath = (path: string): string => {
    if (adminNavItems.some((i) => i.url === path)) return 'admin';
    if (managementNavItems.some((i) => i.url === path)) return 'gestao';
    if (path === '/ascension') return 'ascension';
    if (mainNavItems.some((i) => i.url === path)) return 'principal';
    return 'principal';
  };

  const [openGroup, setOpenGroup] = useState<string | null>(() => groupForPath(location.pathname));

  // Mantém aberta a sanfona da rota atual ao navegar/recarregar
  useEffect(() => {
    setOpenGroup(groupForPath(location.pathname));
  }, [location.pathname]);



  const isActive = (path: string) => {
    const [p, q] = path.split('?');
    if (location.pathname !== p) return false;
    return !q || new URLSearchParams(location.search).get('aba') === new URLSearchParams(q).get('aba');
  };
  const menuCounts = useMenuCounts();
  const initials = fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  // Todos os itens aparecem; os que o acesso não inclui ficam em preto e branco, com cadeado
  const filterVisible = (items: NavItemDef[]) => items;
  const allowed = (item: NavItemDef) => canOpenPath(access, item.url.split('?')[0]);
  const currentTitle = (items: NavItemDef[]) => items.find(i => isActive(i.url))?.title;
  // subgrupos da ASCENSION (Material CRC, Planilhas): abertos quando contêm a tela atual
  const [subOpen, setSubOpen] = useState<Record<string, boolean>>({});

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavItem = ({ item }: { item: NavItemDef }) => !allowed(item) ? (
    <SidebarMenuItem>
      <div
        className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium grayscale opacity-45 cursor-not-allowed select-none text-sidebar-foreground/70"
        aria-disabled="true"
        title="Seu acesso não inclui esta área"
      >
        <item.icon className="h-5 w-5 shrink-0" aria-hidden />
        <span>{item.title}</span>
        <Lock className="ml-auto h-3.5 w-3.5" aria-label="Sem acesso" />
      </div>
    </SidebarMenuItem>
  ) : (
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
          {menuCounts[item.url] > 0 && (
            <span
              className={cn(
                'ml-auto min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums flex items-center justify-center',
                isActive(item.url) ? 'bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground' : 'bg-primary text-primary-foreground',
              )}
              aria-label={`${menuCounts[item.url]} em aberto`}
            >
              {menuCounts[item.url] > 99 ? '99+' : menuCounts[item.url]}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const visibleMain = filterVisible(mainNavItems);
  const visibleMgmt = filterVisible(managementNavItems);
  const visibleAscension = filterVisible(ascensionNavItems);

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
        {/* Comunicação da equipe: primeiro item do menu, para todos, com os recados pendentes */}
        <NavLink
          to="/recados"
          className={({ isActive }) => cn(
            'mb-3 flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
            isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15',
          )}
        >
          <MessagesSquare className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex-1">Comunicação da equipe</span>
          {recadosPend > 0 && (
            <span className="min-w-[22px] rounded-full bg-destructive px-1.5 text-center text-xs font-bold leading-[22px] text-destructive-foreground" aria-label={`${recadosPend} recados para você`}>
              {recadosPend}
            </span>
          )}
        </NavLink>
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

        {visibleAscension.length > 0 && (
          <CollapsibleGroup
            label="ASCENSION"
            className="mt-2"
            count={visibleAscension.length}
            current={currentTitle(visibleAscension)}
            open={openGroup === 'ascension'}
            onToggle={() => setOpenGroup(openGroup === 'ascension' ? null : 'ascension')}
          >
            {ascensionSections.map(sec => {
              const aberta = subOpen[sec.label] ?? sec.items.some(i => isActive(i.url));
              const atual = currentTitle(sec.items);
              return (
                <SidebarMenuItem key={sec.label}>
                  <Collapsible open={aberta} onOpenChange={o => setSubOpen(m => ({ ...m, [sec.label]: o }))}>
                    <CollapsibleTrigger
                      className="flex w-full min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      aria-label={`${sec.label}, ${sec.items.length} telas`}
                    >
                      <sec.icon className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="flex flex-col min-w-0 flex-1">
                        <span>{sec.label}</span>
                        {!aberta && atual && <span className="text-xs text-sidebar-muted truncate">Aberta: {atual}</span>}
                      </span>
                      {!aberta && <span className="text-xs text-sidebar-muted">{sec.items.length}</span>}
                      <ChevronDown className={cn('h-4 w-4 text-sidebar-muted transition-transform duration-200', aberta && 'rotate-180')} aria-hidden />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      <ul className="ml-5 mt-1 space-y-1 border-l border-sidebar-border pl-2">
                        {filterVisible(sec.items).map(item => <NavItem key={item.title} item={item} />)}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              );
            })}
          </CollapsibleGroup>
        )}

        {access.canAdmin && (
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
