import { useState } from 'react';
import { format } from 'date-fns';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { allPages } from '@/lib/paging';
import { downloadPhonesXlsx, uniquePhones, type PhoneSource } from '@/lib/exportPhones';
import { FUNNEL_STAGES } from '@/types/crm';
import { ARRIVAL_SOURCE_LABELS } from '@/lib/metrics/stages';

const STATUS_LABEL = new Map(FUNNEL_STAGES.map(s => [s.key as string, s.label]));

/** Um clique: todos os telefones de todos os contatos cadastrados, sem repetidos, em Excel. */
export function ExportPhonesButton() {
  const [busy, setBusy] = useState(false);
  const exportar = async () => {
    setBusy(true);
    try {
      const { data, error } = await allPages<PhoneSource>(
        supabase.from('leads').select('name, phone, whatsapp, status, lead_arrival_source, created_at').order('id'),
      );
      if (error) throw error;
      const { rows, duplicados } = uniquePhones(data, {
        status: s => STATUS_LABEL.get(s) ?? s,
        origem: o => ARRIVAL_SOURCE_LABELS[o] ?? o,
      });
      await downloadPhonesXlsx(rows, `telefones-contatos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success(`${rows.length} telefones exportados${duplicados ? ` · ${duplicados} repetidos ficaram de fora` : ''}`);
    } catch {
      toast.error('Não foi possível gerar a planilha agora. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={exportar} disabled={busy} className="gap-1.5"
      title="Baixa uma planilha Excel com todos os telefones, sem números repetidos">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      Exportar telefones
    </Button>
  );
}
