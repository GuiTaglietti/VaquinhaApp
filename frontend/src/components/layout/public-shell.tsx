import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";
import { LegalDialog } from "@/components/ui/legal-dialog";
import type { LegalDocKey } from "@/services/legal";

interface PublicShellProps {
  children: React.ReactNode;
}

export const PublicShell = ({ children }: PublicShellProps) => {
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocKey | null>(null);

  const openLegal = (doc: LegalDocKey) => {
    setLegalDoc(doc);
    setLegalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 flex items-center justify-center">
              <img src="/favicon.ico" alt="Logo" className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold">Velório Solidário</span>
          </Link>

          {/* Nav principal */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/#inicio"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Início
            </Link>
            <Link
              to="/#faq"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              FAQ
            </Link>
            <Link
              to="/explore"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Explorar
            </Link>
          </nav>

          {/* Ações */}
          <div className="flex items-center gap-2">
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
      <main className="container mx-auto px-4 py-8 flex-1">{children}</main>

      {/* Footer institucional (igual ao da página principal) */}
      <footer className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
          {/* Marca / Tagline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/favicon.ico" alt="Logo" className="h-5 w-5" />
              <span className="font-semibold">Velório Solidário</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Velório Solidário: apoio que conforta, solidariedade que acolhe!
            </p>

            {/* Social */}
            <div className="mt-4">
              <a
                href="https://instagram.com/veloriosolidario"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm hover:underline"
                aria-label="Instagram Velório Solidário"
              >
                <Instagram className="h-4 w-4" />
                @veloriosolidario
              </a>
            </div>
          </div>

          {/* Navegação */}
          <div>
            <h4 className="font-semibold mb-3">Navegação</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/#inicio" className="hover:underline">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/#faq" className="hover:underline">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/explore" className="hover:underline">
                  Explorar
                </Link>
              </li>
              <li>
                <Link to="/auth/login" className="hover:underline">
                  Entrar
                </Link>
              </li>
              <li>
                <Link to="/auth/register" className="hover:underline">
                  Criar conta
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-semibold mb-3">Contato</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:suporte@veloriosolidario.com.br"
                  className="hover:underline"
                >
                  suporte@veloriosolidario.com.br
                </a>
              </li>
              <li>De segunda a sexta, das 9h às 18h.</li>
            </ul>
          </div>

          {/* Institucional / Políticas com Dialog */}
          <div>
            <h4 className="font-semibold mb-3">Institucional</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <strong>Duke Soluções Financeiras Ltda.</strong>
              </li>
              <li>CNPJ: 42.735.849/0001-53</li>
              <li>Sede: Sarandi – RS</li>
              <li>
                <button
                  type="button"
                  onClick={() => openLegal("terms")}
                  className="hover:underline"
                >
                  Termos de Uso
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openLegal("privacy")}
                  className="hover:underline"
                >
                  Política de Privacidade
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Velório Solidário. Todos os direitos
            reservados.
          </div>
        </div>
      </footer>

      {/* Dialog legal compartilhado */}
      <LegalDialog
        open={legalOpen}
        onOpenChange={setLegalOpen}
        doc={legalDoc}
      />
    </div>
  );
};
