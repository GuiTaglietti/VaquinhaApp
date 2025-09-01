import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

export default function ConfirmEmailResultPage() {
  const [params] = useSearchParams();
  const status = params.get("status") || "invalid";
  const email = params.get("email") || "";
  const navigate = useNavigate();

  const content = (() => {
    switch (status) {
      case "success":
        return {
          icon: <CheckCircle2 className="h-6 w-6" />,
          title: "E-mail confirmado!",
          desc: "Seu cadastro foi concluído com sucesso. Agora você já pode entrar.",
          primary: (
            <Button
              className="w-full gradient-primary text-white shadow-medium"
              onClick={() => navigate("/auth/login")}
            >
              Ir para o login
            </Button>
          ),
        };
      case "already":
        return {
          icon: <Info className="h-6 w-6" />,
          title: "E-mail já confirmado",
          desc: "Este link já foi utilizado anteriormente. Você pode fazer login normalmente.",
          primary: (
            <Button
              className="w-full gradient-primary text-white shadow-medium"
              onClick={() => navigate("/auth/login")}
            >
              Ir para o login
            </Button>
          ),
        };
      case "expired":
        return {
          icon: <AlertTriangle className="h-6 w-6" />,
          title: "Link expirado",
          desc: (
            <>
              O link de confirmação expirou.{" "}
              {email
                ? `Reinicie o cadastro usando ${email}.`
                : "Reinicie o cadastro."}
            </>
          ),
          primary: (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/auth/register")}
            >
              Voltar ao cadastro
            </Button>
          ),
        };
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6" />,
          title: "Link inválido",
          desc: "O link de confirmação é inválido ou foi modificado.",
          primary: (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/auth/register")}
            >
              Voltar ao cadastro
            </Button>
          ),
        };
    }
  })();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md gradient-card border-0 shadow-medium">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center gradient-primary text-white shadow-glow">
            {content.icon}
          </div>
          <CardTitle className="mt-3 text-2xl">{content.title}</CardTitle>
          <CardDescription className="mt-1">{content.desc}</CardDescription>
        </CardHeader>
        <CardContent>
          {content.primary}
          <div className="mt-4 text-center text-sm">
            <Link
              to="/"
              className="text-primary hover:text-primary-light transition-fast"
            >
              Voltar à página inicial
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
