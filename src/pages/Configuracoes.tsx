import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import UserManagementPanel from '@/components/admin/UserManagementPanel';
import { BusinessCalendarPanel } from '@/components/admin/BusinessCalendarPanel';
import { Settings, Users, Bell, Palette, Shield, CalendarDays } from 'lucide-react';

export default function Configuracoes() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <AppLayout title="Configurações">
        <Card className="monday-card">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Você não tem permissão para acessar as configurações</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Configurações">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold">Configurações do Sistema</h2>
            <p className="text-sm text-muted-foreground">Gerencie usuários, permissões e preferências</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" /> Calendário
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" /> Notificações
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" /> Aparência
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagementPanel />
          </TabsContent>

          <TabsContent value="calendar">
            <BusinessCalendarPanel />
          </TabsContent>


          <TabsContent value="notifications" className="space-y-4">
            <Card className="monday-card">
              <CardHeader>
                <CardTitle className="text-base">Configurações de Notificações</CardTitle>
                <CardDescription>Defina quando e como os alertas são enviados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { title: 'Lead não respondido', desc: 'Alertar quando um lead não for atendido em 5 minutos' },
                  { title: 'Meta não atingida', desc: 'Alertar quando a meta diária não for atingida' },
                  { title: 'Lembrete de follow-up', desc: 'Lembrar de fazer follow-up com leads parados' },
                  { title: 'KPI abaixo do esperado', desc: 'Alertar quando um KPI estiver abaixo de 70%' },
                ].map(item => (
                  <div key={item.title} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <Card className="monday-card">
              <CardHeader>
                <CardTitle className="text-base">Aparência</CardTitle>
                <CardDescription>Personalize a aparência do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Nome da Clínica</Label>
                  <Input defaultValue="Dental CRM" />
                </div>
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select defaultValue="light">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
