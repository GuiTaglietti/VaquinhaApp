import { useEffect, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const location = useLocation();

  const next = useMemo(() => {
    const path = location.pathname + location.search + location.hash;
    return encodeURIComponent(path || "/app");
  }, [location]);

  // Se existe token local e ainda não carregou o usuário, tenta carregar
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token && !isAuthenticated && !isLoading) {
      fetchUser();
    }
  }, [isAuthenticated, isLoading, fetchUser]);

  // Loading enquanto valida a sessão
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Não autenticado: envia para login, preservando o destino
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/auth/login?next=${next}`}
        state={{ from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
};
