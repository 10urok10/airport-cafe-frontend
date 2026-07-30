import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Bu bileseni bir route'un "sarmalayicisi" olarak kullanacagiz. Giris
// yapilmamissa /login'e yonlendirir; yapilmissa <Outlet /> ile o rotanin
// gercek icerigini (orn. OrderPage) render eder.
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
