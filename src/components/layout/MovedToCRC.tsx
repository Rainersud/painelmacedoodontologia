import { Navigate, useLocation } from 'react-router-dom';

/** Telas que passaram a ser abas do CRC: o endereço antigo leva para a aba certa. */
export function MovedToCRC({ tab }: { tab: string }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  // endereço antigo do CRC dentro do Follow Up (/follow-up?aba=crc&quadro=...)
  if (params.get('aba') === 'crc') {
    params.delete('aba');
    return <Navigate to={`/crc${params.toString() ? `?${params}` : ''}`} replace />;
  }
  params.set('aba', tab);
  return <Navigate to={`/crc?${params}`} replace />;
}
