import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HandHeart, ExternalLink, Clock, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { contributionsService } from "@/services/contributions";
import { Contribution } from "@/types";

export const ContributionsPage = () => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContributions();
  }, []);

  const fetchContributions = async () => {
    try {
      setIsLoading(true);
      const data = await contributionsService.getMine();
      setContributions(data);
    } catch (error) {
      console.error('Error fetching contributions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { 
        icon: Clock, 
        label: "Pendente", 
        className: "bg-warning text-warning-foreground" 
      },
      PAID: { 
        icon: CheckCircle, 
        label: "Pago", 
        className: "bg-success text-success-foreground" 
      },
      FAILED: { 
        icon: XCircle, 
        label: "Falhou", 
        className: "bg-destructive text-destructive-foreground" 
      }
    };
    
    const { icon: Icon, label, className } = config[status as keyof typeof config] || config.PENDING;
    
    return (
      <Badge className={className}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (contributions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Minhas Contribuições</h1>
        <EmptyState
          icon={HandHeart}
          title="Nenhuma contribuição encontrada"
          description="Você ainda não fez nenhuma contribuição. Explore as vaquinhas públicas e faça sua primeira doação!"
        />
      </div>
    );
  }

  const totalContributed = contributions
    .filter(c => c.payment_status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalPending = contributions
    .filter(c => c.payment_status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Minhas Contribuições</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="gradient-card border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contribuído</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalContributed)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aguardando Pagamento</p>
                <p className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Doações</p>
                <p className="text-2xl font-bold">{contributions.length}</p>
              </div>
              <HandHeart className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contributions List */}
      <div className="space-y-4">
        {contributions.map((contribution) => (
          <Card key={contribution.id} className="gradient-card border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {contribution.fundraiser?.title || 'Vaquinha não encontrada'}
                    </h3>
                    {contribution.fundraiser?.public_slug && (
                      <Link
                        to={`/p/${contribution.fundraiser.public_slug}`}
                        className="text-primary hover:text-primary-light transition-fast"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Valor: <strong className="text-primary">{formatCurrency(contribution.amount)}</strong></span>
                    <span>•</span>
                    <span>{formatDate(contribution.created_at)}</span>
                    {!contribution.is_anonymous && (
                      <>
                        <span>•</span>
                        <span className="text-primary">Doação identificada</span>
                      </>
                    )}
                  </div>

                  {contribution.message && (
                    <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm italic">"{contribution.message}"</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(contribution.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call to Action */}
      <Card className="gradient-card border-0 shadow-soft">
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <HandHeart className="h-12 w-12 text-primary mx-auto" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Continue Fazendo a Diferença!</h3>
              <p className="text-muted-foreground mb-4">
                Obrigado por contribuir para causas importantes. Cada doação faz a diferença na vida de alguém.
              </p>
              <Button 
                className="gradient-primary text-white shadow-medium hover:shadow-strong transition-smooth"
              >
                <Link to="/app/explore">Explorar mais vaquinhas.</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};