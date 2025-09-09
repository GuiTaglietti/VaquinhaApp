import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FileSearch,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MoneyProgressBar } from "@/components/ui/money-progress-bar";
import { publicService } from "@/services/public";
import { toast } from "react-hot-toast";

/** Types “flexíveis” para lidar com ambos os formatos vindos da API */
type FundraiserLike = {
  id?: string;
  title?: string;
  description?: string;
  goal_amount?: number | string;
  current_amount?: number | string;
  status?: "ACTIVE" | "PAUSED" | "FINISHED" | string;
  city?: string;
  state?: string;
  cover_image_url?: string;
  created_at?: string;
  updated_at?: string;
  public_slug?: string;
  is_public?: boolean;
};

type ContributionLike = {
  id: string;
  amount: number | string;
  message?: string | null;
  is_anonymous: boolean;
  payment_status: "pending" | "paid" | "failed" | string;
  created_at: string;
};

type ApiShape =
  | { fundraiser: FundraiserLike; contributions: ContributionLike[] } // shape esperado
  | (FundraiserLike & { contributions?: ContributionLike[] }); // shape “achatado” vindo do backend

export const AuditPage = () => {
  const { token } = useParams<{ token: string }>();
  const [apiData, setApiData] = useState<ApiShape | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) fetchAuditData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchAuditData = async () => {
    try {
      setIsLoading(true);
      const data = (await publicService.getAuditData(token!)) as ApiShape;
      setApiData(data);
    } catch (error) {
      console.error("Error fetching audit data:", error);
      toast.error("Token de auditoria inválido ou expirado");
      setApiData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | string | undefined) => {
    const num = typeof value === "string" ? Number(value) : value ?? 0;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number.isFinite(num) ? num : 0);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: {
        icon: Clock,
        label: "Pendente",
        className: "bg-warning text-warning-foreground",
      },
      PAID: {
        icon: CheckCircle,
        label: "Pago",
        className: "bg-success text-success-foreground",
      },
      FAILED: {
        icon: XCircle,
        label: "Falhou",
        className: "bg-destructive text-destructive-foreground",
      },
    } as const;

    const {
      icon: Icon,
      label,
      className,
    } = (config as any)[status] || config.PENDING;

    return (
      <Badge className={className}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!apiData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="gradient-card border-0 shadow-medium max-w-md">
          <CardContent className="p-8 text-center">
            <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Auditoria não encontrada
            </h2>
            <p className="text-muted-foreground">
              O token de auditoria é inválido ou expirou. Solicite um novo token
              ao responsável pela arrecadação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /** 🔧 Normalização: suporta os dois formatos da API */
  const fundraiser: FundraiserLike =
    "fundraiser" in apiData ? apiData.fundraiser : apiData;

  const contributions: ContributionLike[] =
    ("fundraiser" in apiData ? apiData.contributions : apiData.contributions) ??
    [];

  /** Guardas: evita “cannot read property 'title' of undefined” */
  const title = fundraiser.title ?? "(Sem título)";
  const status = (fundraiser.status ?? "ACTIVE").toString().toUpperCase();

  /** Totais */
  const toNumber = (v: number | string) =>
    typeof v === "string" ? Number(v) : v;
  const totalPaid = contributions
    .filter((c) => (c.payment_status ?? "").toString().toUpperCase() === "PAID")
    .reduce((sum, c) => sum + (toNumber(c.amount) || 0), 0);
  const totalPending = contributions
    .filter((c) => (c.payment_status ?? "").toString().toUpperCase() === "PENDING")
    .reduce((sum, c) => sum + (toNumber(c.amount) || 0), 0);
  const totalFailed = contributions
    .filter((c) => (c.payment_status ?? "").toString().toUpperCase() === "FAILED")
    .reduce((sum, c) => sum + (toNumber(c.amount) || 0), 0);

  const goal = toNumber(fundraiser.goal_amount || 0) || 0;
  const current = toNumber(fundraiser.current_amount || 0) || 0;

  console.log('Fundraiser:', fundraiser);
  console.log('Contributions:', contributions);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Relatório de Auditoria</h1>
              <p className="text-sm text-muted-foreground">
                Visualização detalhada para fins de auditoria - Somente leitura
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Fundraiser Details */}
          <Card className="gradient-card border-0 shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalhes da arrecadação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{title}</h3>
                    {fundraiser.description && (
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {fundraiser.description}
                      </p>
                    )}
                  </div>

                  {(fundraiser.city || fundraiser.state) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">Localização:</span>
                      <span>
                        {[fundraiser.city, fundraiser.state]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Status:
                      </span>
                      <Badge
                        className={
                          status === "ACTIVE"
                            ? "bg-success text-success-foreground"
                            : status === "PAUSED"
                            ? "bg-warning text-warning-foreground"
                            : "bg-destructive text-destructive-foreground"
                        }
                      >
                        {status === "ACTIVE"
                          ? "Ativa"
                          : status === "PAUSED"
                          ? "Pausada"
                          : "Finalizada"}
                      </Badge>
                    </div>

                    {fundraiser.created_at && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Criada em:
                        </span>
                        <span className="text-sm font-medium">
                          {formatDate(fundraiser.created_at)}
                        </span>
                      </div>
                    )}

                    {fundraiser.updated_at && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Última atualização:
                        </span>
                        <span className="text-sm font-medium">
                          {formatDate(fundraiser.updated_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Progresso da Arrecadação</h4>
                <MoneyProgressBar
                  current={Number(current)}
                  goal={Number(goal)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="gradient-card border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Total Arrecadado
                  </p>
                  <p className="text-xl font-bold text-success">
                    {formatCurrency(totalPaid)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pagamentos confirmados
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Aguardando</p>
                  <p className="text-xl font-bold text-warning">
                    {formatCurrency(totalPending)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pagamentos pendentes
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Falhas</p>
                  <p className="text-xl font-bold text-destructive">
                    {formatCurrency(totalFailed)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pagamentos falharam
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Total Contribuições
                  </p>
                  <p className="text-xl font-bold">{contributions.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Tentativas de doação
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contributions List */}
          <Card className="gradient-card border-0 shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Histórico de Contribuições
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contributions.length === 0 ? (
                <div className="text-center py-8">
                  <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma contribuição registrada ainda
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contributions.map((c) => {
                    const status = (c.payment_status ?? "").toString().toUpperCase();
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card/30"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-primary">
                              {formatCurrency(c.amount)}
                            </span>
                            {getStatusBadge(status)}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {formatDate(c.created_at)}
                            {!c.is_anonymous && " • Doação identificada"}
                            {c.is_anonymous && " • Doação anônima"}
                          </p>

                          {c.message && (
                            <p className="text-sm italic text-muted-foreground mt-2">
                              "{c.message}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer Notice */}
          <Card className="gradient-card border-0 shadow-soft">
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Relatório de Auditoria</h3>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Este relatório foi gerado para fins de auditoria e
                transparência. Todas as informações apresentadas são somente
                leitura e refletem o estado atual da arrecadação e suas
                contribuições registradas no sistema.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Token de acesso válido até o prazo definido pelo organizador
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
