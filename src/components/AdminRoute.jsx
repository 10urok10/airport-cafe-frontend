import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ProtectedRoute'a benzer ama ek olarak rol kontrolu yapar. Backend zaten
// /reports gibi ADMIN'e ozel endpoint'lerde 403 doner, ama bu kontrolu
// frontend'de de yapmazsak BARISTA once bos/hatali bir sayfa gorur, sonra
// hata alir - kotu bir deneyim. Burada onceden yonlendirip onune geciyoruz.
export default function AdminRoute() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/orders" replace />;
  }

  return <Outlet />;
}
