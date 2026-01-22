import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  MessageSquare,
  MoreHorizontal,
  Calendar,
  User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data for leads
const mockLeads = [
  {
    id: '1',
    name: 'Maria Silva',
    phone: '(11) 99999-1234',
    email: 'maria@email.com',
    source: 'whatsapp',
    status: 'novo_lead',
    agent: 'João Santos',
    createdAt: '2024-01-15T10:30:00',
    estimatedValue: 2500,
  },
  {
    id: '2',
    name: 'Pedro Oliveira',
    phone: '(11) 98888-5678',
    email: 'pedro@email.com',
    source: 'telefone',
    status: 'em_atendimento',
    agent: 'Ana Costa',
    createdAt: '2024-01-15T09:15:00',
    estimatedValue: 3800,
  },
  {
    id: '3',
    name: 'Ana Costa',
    phone: '(11) 97777-9012',
    email: 'ana.costa@email.com',
    source: 'instagram',
    status: 'consulta_agendada',
    agent: 'João Santos',
    createdAt: '2024-01-14T16:45:00',
    estimatedValue: 1500,
  },
  {
    id: '4',
    name: 'Carlos Lima',
    phone: '(11) 96666-3456',
    email: 'carlos@email.com',
    source: 'google_ads',
    status: 'confirmado',
    agent: 'Maria Fernanda',
    createdAt: '2024-01-14T14:20:00',
    estimatedValue: 5200,
  },
  {
    id: '5',
    name: 'Juliana Alves',
    phone: '(11) 95555-7890',
    email: 'juliana@email.com',
    source: 'indicacao',
    status: 'compareceu',
    agent: 'Ana Costa',
    createdAt: '2024-01-13T11:00:00',
    estimatedValue: 4100,
  },
];

const statusLabels: Record<string, { label: string; color: string }> = {
  novo_lead: { label: 'Novo Lead', color: 'bg-blue-100 text-blue-700' },
  em_atendimento: { label: 'Em Atendimento', color: 'bg-yellow-100 text-yellow-700' },
  consulta_agendada: { label: 'Agendado', color: 'bg-purple-100 text-purple-700' },
  confirmado: { label: 'Confirmado', color: 'bg-green-100 text-green-700' },
  compareceu: { label: 'Compareceu', color: 'bg-emerald-100 text-emerald-700' },
  nao_compareceu: { label: 'Não Compareceu', color: 'bg-red-100 text-red-700' },
  nao_convertido: { label: 'Não Convertido', color: 'bg-gray-100 text-gray-700' },
};

const sourceLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telefone: 'Telefone',
  site: 'Site',
  indicacao: 'Indicação',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_ads: 'Google Ads',
  outro: 'Outro',
};

const Leads = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredLeads = mockLeads.filter((lead) => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <AppLayout title="Leads">
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(statusLabels).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                {Object.entries(sourceLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Lead</DialogTitle>
                <DialogDescription>
                  Preencha os dados do lead para cadastrá-lo no sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" placeholder="Nome do lead" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" placeholder="(11) 99999-9999" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" placeholder="email@exemplo.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="source">Origem</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(sourceLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="value">Valor Estimado</Label>
                    <Input id="value" type="number" placeholder="R$ 0,00" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" placeholder="Notas sobre o lead..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>
                  Cadastrar Lead
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockLeads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Novos Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Convertidos Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Valor Est.</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium">{lead.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{lead.phone}</span>
                        <span className="text-xs text-muted-foreground">{lead.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sourceLabels[lead.source]}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusLabels[lead.status].color}`}>
                        {statusLabels[lead.status].label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.agent}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(lead.estimatedValue)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Phone className="h-4 w-4 mr-2" />
                            Ligar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Calendar className="h-4 w-4 mr-2" />
                            Agendar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Leads;
