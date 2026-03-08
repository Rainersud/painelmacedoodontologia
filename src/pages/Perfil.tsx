import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Phone, Mail, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { profileUpdateSchema, validateForm } from '@/lib/validations';

export default function Perfil() {
  const { user, fullName, role } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: { full_name: string; phone: string }) => {
      // Validate input before database operation
      const validation = validateForm(profileUpdateSchema, data);
      if (!validation.success) {
        const firstError = Object.values(validation.errors || {})[0];
        throw new Error(firstError || 'Dados inválidos');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: validation.data!.full_name.trim(),
          phone: validation.data!.phone?.trim() || null,
        })
        .eq('user_id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar perfil');
    },
  });

  const initials = fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  if (isLoading) {
    return (
      <AppLayout title="Meu Perfil">
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Meu Perfil">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{profile?.full_name || 'Usuário'}</h2>
                <p className="text-muted-foreground">admin@dental.com</p>
                <div className="flex items-center gap-2 mt-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium capitalize">
                    {role === 'admin' ? 'Administrador' : 'Agente'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize suas informações de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome Completo
              </Label>
              {isEditing ? (
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  autoComplete="name"
                />
              ) : (
                <Input
                  value={profile?.full_name || ''}
                  disabled
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail
              </Label>
              <Input id="email" value={user?.email || ''} disabled />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              {isEditing ? (
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                />
              ) : (
                <Input
                  value={profile?.phone || ''}
                  disabled
                  placeholder="(11) 99999-9999"
                />
              )}
            </div>

            <div className="flex gap-3 pt-4">
              {isEditing ? (
                <>
                  <Button 
                    onClick={() => updateProfile.mutate(formData)}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Alterações
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      full_name: profile?.full_name || '',
                      phone: profile?.phone || '',
                    });
                    setIsEditing(true);
                  }}
                >
                  Editar Perfil
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
