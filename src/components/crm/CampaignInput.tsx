import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { allPages } from '@/lib/paging';
import { campaignSuggestions } from '@/lib/metrics';

/** Campanhas já usadas nos leads + as cadastradas no Funil de Tráfego. */
function useCampaignOptions() {
  return useQuery({
    queryKey: ['campaign-options'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [leads, ads] = await Promise.all([
        allPages<{ campaign: string | null }>(
          supabase.from('leads').select('campaign').not('campaign', 'is', null).order('id'),
        ),
        supabase.from('ad_creatives').select('name'),
      ]);
      return campaignSuggestions([
        ...(ads.data ?? []).map(a => a.name),
        ...leads.data.map(l => l.campaign),
      ]);
    },
  });
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function CampaignInput({ value, onChange }: Props) {
  const listId = useId();
  const { data: options = [] } = useCampaignOptions();
  return (
    <div className="space-y-2">
      <Label htmlFor={`${listId}-input`}>Campanha</Label>
      <Input
        id={`${listId}-input`}
        list={listId}
        value={value}
        maxLength={120}
        onChange={e => onChange(e.target.value)}
        placeholder="Ex.: Black Friday Implantes"
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map(o => <option key={o} value={o} />)}
      </datalist>
      <p className="text-[11px] text-muted-foreground">
        Use o mesmo nome da campanha no Funil de Tráfego para o ROI por campanha sair certo.
      </p>
    </div>
  );
}
