import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublicShellProps {
  children: React.ReactNode;
}

export const PublicShell = ({ children }: PublicShellProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 flex items-center justify-center">
              <img src="/favicon.ico" alt="Logo" className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold">Velório Solidário</span>
          </Link>

          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/auth/login">Entrar</Link>
            </Button>
            <Button className="gradient-primary text-white" asChild>
              <Link to="/auth/register">Criar Conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-7 w-7 flex items-center justify-center">
              <img src="/favicon.ico" alt="Logo" className="h-4 w-4" />
            </div>
            <span className="font-semibold">Velório Solidário</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Velório Solidário. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};
