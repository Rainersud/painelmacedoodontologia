import { Navigate, useSearchParams } from 'react-router-dom';
import Funil from './Funil';

const FollowUp = () => {
  const [params] = useSearchParams();
  // Endereço antigo do CRC (era uma aba do Follow Up)
  if (params.get('aba') === 'crc') {
    const quadro = params.get('quadro');
    return <Navigate to={quadro ? `/crc?quadro=${quadro}` : '/crc'} replace />;
  }
  return <Funil mode="followup" />;
};

export default FollowUp;
