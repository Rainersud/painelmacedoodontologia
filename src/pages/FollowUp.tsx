import { useSearchParams } from 'react-router-dom';
import Funil from './Funil';
import { AppLayout } from '@/components/layout/AppLayout';
import { CRCView } from '@/components/crc/CRCView';
import { FollowUpTabs } from '@/components/crc/FollowUpTabs';

const FollowUp = () => {
  const [params] = useSearchParams();
  if (params.get('aba') !== 'crc') return <Funil mode="followup" />;
  return (
    <AppLayout title="Follow Up — CRC">
      <div className="mb-4"><FollowUpTabs active="crc" /></div>
      <CRCView />
    </AppLayout>
  );
};

export default FollowUp;
