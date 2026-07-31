import { Navigate } from 'react-router-dom';

// Login removido: a área de membros é de acesso livre.
export default function Login() {
  return <Navigate to="/" replace />;
}
