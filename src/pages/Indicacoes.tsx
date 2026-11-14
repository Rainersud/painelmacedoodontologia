import { useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { ReferralDashboard } from '@/components/crm/ReferralDashboard';
import { ReferralRankingWidget } from '@/components/crm/ReferralRankingWidget';
import { ReferrerDetailDialog } from '@/components/crm/ReferrerDetailDialog';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import type { Lead } from '@/types/crm';

const Indicacoes = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const { data: leads } = useCRMLeads();
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(null);
  const [selectedReferrerName, setSelectedReferrerName] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);

  const handleReferrerClick = (leadId: string, name?: string) => {
    setSelectedReferrerId(leadId);
    const lead = leads?.find(l => l.id === leadId);
    setSelectedReferrerName(name || lead?.name || 'Indicador');
    setDetailOpen(true);
  };

  const handleViewLead = (leadId: string) => {
    const lead = leads?.find(l => l.id === leadId);
    if (lead) {
      setSelectedLead(lead);
      setLeadDialogOpen(true);
    }
  };

  return (
    <PageShell embedded={embedded} title="Indicações">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Dashboard de Indicações</h2>
          <p className="text-sm text-muted-foreground">Métricas do programa de indicações e benefícios</p>
        </div>
        <ReferralDashboard />
        <ReferralRankingWidget
          onLeadClick={(leadId) => handleReferrerClick(leadId)}
        />
      </div>

      <ReferrerDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        referrerId={selectedReferrerId}
        referrerName={selectedReferrerName}
        onViewLead={handleViewLead}
      />

      <LeadDetailDialog
        lead={selectedLead}
        open={leadDialogOpen}
        onOpenChange={setLeadDialogOpen}
      />
    </PageShell>
  );
};

export default Indicacoes;
