import { useState } from 'react';
import { describeError } from '@/lib/errors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MODULE_LABELS } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Users, UserPlus, Key, Power, Settings2, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserWithDetails {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string;
  role: string;
  is_active: boolean;
  banned: boolean;
  permissions: Array<{ module: string; can_view: boolean; can_edit: boolean }>;
}

const ALL_MODULES = Object.keys(MODULE_LABELS);

const DEFAULT_AGENT_PERMISSIONS = [
  { module: 'dashboard', can_view: true, can_edit: true },
  { module: 'call_center', can_view: true, can_edit: true },
  { module: 'funil', can_view: true, can_edit: true },
  { module: 'indicacoes', can_view: true, can_edit: true },
  { module: 'agendamentos', can_view: true, can_edit: true },
  { module: 'tarefas', can_view: true, can_edit: true },
  { module: 'credito_liberado', can_view: true, can_edit: true },
  { module: 'metas_clinica', can_view: true, can_edit: false },
  { module: 'bonus_metas', can_view: true, can_edit: false },
  { module: 'plano_incentivo', can_view: true, can_edit: false },
  { module: 'alertas', can_view: true, can_edit: false },
  { module: 'relatorios', can_view: true, can_edit: false },
  { module: 'perfil', can_view: true, can_edit: true },
];

async function invokeManageUsers(action: string, params: any = {}) {
  const { data, error } = await supabase.functions.invoke('manage-users', {
    body: { action, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function UserManagementPanel() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPermOpen, setIsPermOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [editPerms, setEditPerms] = useState<Array<{ module: string; can_view: boolean; can_edit: boolean }>>([]);

  // Form state for new user
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'agente'>('agente');
  const [resetPassword, setResetPassword] = useState('');

  const { data: users = [], isLoading } = useQuery<UserWithDetails[]>({
    queryKey: ['managed-users'],
    queryFn: async () => {
      const result = await invokeManageUsers('list_users');
      return result.users || [];
    },
    enabled: isAdmin,
  });

  const createUser = useMutation({
    mutationFn: async () => {
      await invokeManageUsers('create_user', {
        email: newEmail,
        password: newPassword,
        full_name: newName,
        phone: newPhone,
        role: newRole,
        permissions: newRole === 'agente' ? DEFAULT_AGENT_PERMISSIONS : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast.success('Usuário criado com sucesso!');
      setIsCreateOpen(false);
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewPhone(''); setNewRole('agente');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao criar usuário'),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      await invokeManageUsers('update_user', { user_id: userId, is_active: active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast.success('Status atualizado!');
    },
    onError: (e) => toast.error(`Não foi possível atualizar status. ${describeError(e)}`),
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await invokeManageUsers('update_user', { user_id: userId, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast.success('Papel atualizado!');
    },
    onError: (e) => toast.error(`Não foi possível atualizar papel. ${describeError(e)}`),
  });

  const savePermissions = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      await invokeManageUsers('update_permissions', {
        user_id: selectedUser.user_id,
        permissions: editPerms,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast.success('Permissões atualizadas!');
      setIsPermOpen(false);
    },
    onError: (e) => toast.error(`Não foi possível salvar permissões. ${describeError(e)}`),
  });

  const doResetPassword = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      await invokeManageUsers('reset_password', {
        user_id: selectedUser.user_id,
        new_password: resetPassword,
      });
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!');
      setIsResetOpen(false);
      setResetPassword('');
    },
    onError: (e) => toast.error(`Não foi possível resetar senha. ${describeError(e)}`),
  });

  const deleteUser = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      await invokeManageUsers('delete_user', {
        user_id: selectedUser.user_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast.success('Usuário deletado com sucesso!');
      setIsDeleteOpen(false);
      setSelectedUser(null);
    },
    onError: (e) => toast.error(`Não foi possível deletar usuário. ${describeError(e)}`),
  });

  const openPermissions = (user: UserWithDetails) => {
    setSelectedUser(user);
    const perms = ALL_MODULES.map(mod => {
      const existing = user.permissions.find(p => p.module === mod);
      return {
        module: mod,
        can_view: existing?.can_view ?? false,
        can_edit: existing?.can_edit ?? false,
      };
    });
    setEditPerms(perms);
    setIsPermOpen(true);
  };

  const togglePermView = (module: string) => {
    setEditPerms(prev => prev.map(p =>
      p.module === module ? { ...p, can_view: !p.can_view, can_edit: !p.can_view ? p.can_edit : false } : p
    ));
  };

  const togglePermEdit = (module: string) => {
    setEditPerms(prev => prev.map(p =>
      p.module === module ? { ...p, can_edit: !p.can_edit, can_view: !p.can_edit ? true : p.can_view } : p
    ));
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      <Card className="monday-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Gerenciar Usuários</CardTitle>
            <CardDescription>Crie, edite e controle permissões dos colaboradores</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do colaborador" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail (login)</Label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@clinica.com" />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select value={newRole} onValueChange={(v: 'admin' | 'agente') => setNewRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="agente">Colaborador(a)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createUser.mutate()} disabled={createUser.isPending || !newName || !newEmail || !newPassword}>
                  {createUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Criar Usuário
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) => updateRole.mutate({ userId: user.user_id, role: value })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3.5 w-3.5 text-primary" /> Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="agente">
                            <div className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5" /> Colaborador
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.banned || user.is_active === false ? 'destructive' : 'default'} className="text-xs">
                        {user.banned || user.is_active === false ? 'Inativo' : 'Ativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPermissions(user)}
                          title="Permissões"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedUser(user); setIsResetOpen(true); }}
                          title="Resetar senha"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive.mutate({ 
                            userId: user.user_id, 
                            active: user.banned || user.is_active === false 
                          })}
                          title={user.banned ? 'Ativar' : 'Desativar'}
                        >
                          <Power className={`h-4 w-4 ${user.banned || user.is_active === false ? 'text-destructive' : 'text-success'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedUser(user); setIsDeleteOpen(true); }}
                          title="Deletar usuário"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={isPermOpen} onOpenChange={setIsPermOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Permissões — {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="text-center w-24">Visualizar</TableHead>
                  <TableHead className="text-center w-24">Editar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editPerms.map(perm => (
                  <TableRow key={perm.module}>
                    <TableCell className="font-medium">{MODULE_LABELS[perm.module]}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={perm.can_view}
                        onCheckedChange={() => togglePermView(perm.module)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={perm.can_edit}
                        onCheckedChange={() => togglePermEdit(perm.module)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => savePermissions.mutate()} disabled={savePermissions.isPending}>
              {savePermissions.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Resetar Senha — {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => doResetPassword.mutate()}
              disabled={doResetPassword.isPending || resetPassword.length < 6}
            >
              {doResetPassword.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Alterar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Deletar Usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja deletar o usuário <strong>{selectedUser?.full_name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUser.mutate()}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
