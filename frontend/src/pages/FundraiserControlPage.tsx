import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Users,
  DollarSign,
  Download,
  ArrowLeft,
  Calendar,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { MoneyProgressBar } from "@/components/ui/money-progress-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { WithdrawalModal } from "@/components/ui/withdrawal-modal";
import { FundraiserStatusModal } from "@/components/ui/fundraiser-status-modal";
import { fundraisersService } from "@/services/fundraisers";
import { withdrawalsService } from "@/services/withdrawals";
import { profileService } from "@/services/profile";
import { Fundraiser } from "@/types";
import { FundraiserStats } from "@/types/withdrawals";
import { BankAccount } from "@/types/profile";
import { toast } from "react-hot-toast";

export const FundraiserControlPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [fundraiser, setFundraiser] = useState<Fundraiser | null>(null);
  const [stats, setStats] = useState<FundraiserStats | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [fundraiserStatus, setFundraiserStatus] = useState("ACTIVE");

  const fetchData = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const [fundraiserData, statsData, bankAccountsData] = await Promise.all([
        fundraisersService.getById(id),
        withdrawalsService.getFundraiserStats(id),
        profileService.getBankAccounts(),
      ]);

      setFundraiser(fundraiserData);
      setStats(statsData);
      setBankAccounts(bankAccountsData);
      setFundraiserStatus(fundraiserData.status || "ACTIVE");
    } catch (error) {
      toast.error("Erro ao carregar dados da vaquinha");
      navigate("/app/fundraisers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 border-green-200";
      case "PAUSED":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "FINISHED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Ativo";
      case "PAUSED":
        return "Pausado";
      case "FINISHED":
        return "Finalizado";
      default:
        return status;
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setFundraiserStatus(newStatus);
    // Recarrega para refletir valores atualizados, se necessário
    fetchData();
  };

  const getWithdrawalStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-success";
      case "PROCESSING":
        return "bg-warning";
      case "PENDING":
        return "bg-muted";
      case "FAILED":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!fundraiser || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Vaquinha não encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/app/fundraisers")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{fundraiser.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Criada em {formatDate(fundraiser.created_at)}
              </span>
              {(fundraiser.city || fundraiser.state) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {fundraiser.city}, {fundraiser.state}
                </span>
              )}
              <Badge
                variant="outline"
                className={getStatusColor(fundraiserStatus)}
              >
                {getStatusLabel(fundraiserStatus)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <FundraiserStatusModal
            fundraiserId={fundraiser.id}
            currentStatus={fundraiserStatus}
            onStatusChange={handleStatusChange}
          />
          <Button
            onClick={() => setWithdrawalModalOpen(true)}
            disabled={stats.available_balance <= 0 || bankAccounts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Solicitar Saque
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-6">
          <MoneyProgressBar
            current={fundraiser.current_amount}
            goal={fundraiser.goal_amount}
          />
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Arrecadado"
          value={formatCurrency(fundraiser.current_amount)}
          icon={DollarSign}
        />
        <KPICard
          title="Contribuições"
          value={stats.total_contributions}
          icon={TrendingUp}
        />
        <KPICard
          title="Contribuidores"
          value={stats.total_contributors}
          icon={Users}
        />
        <KPICard
          title="Saldo Disponível"
          value={formatCurrency(stats.available_balance)}
          icon={Download}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contributions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="contributions">Contribuições</TabsTrigger>
          <TabsTrigger value="withdrawals">Saques</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent value="contributions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contribuições Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recent_contributions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma contribuição ainda
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contribuidor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recent_contributions.map((contribution) => (
                      <TableRow key={contribution.id}>
                        <TableCell>
                          {contribution.is_anonymous
                            ? "Anônimo"
                            : contribution.contributor_name || "Usuário"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(contribution.amount)}
                        </TableCell>
                        <TableCell>{contribution.message || "-"}</TableCell>
                        <TableCell>
                          {formatDate(contribution.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Saques</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.withdrawals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum saque solicitado ainda
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Solicitado em</TableHead>
                      <TableHead>Processado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>
                          {withdrawal.bank_account.bank_name}
                          <br />
                          <span className="text-sm text-muted-foreground">
                            {withdrawal.bank_account.agency}/
                            {withdrawal.bank_account.account_number}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(withdrawal.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getWithdrawalStatusColor(
                              withdrawal.status
                            )}
                          >
                            {withdrawal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(withdrawal.requested_at)}
                        </TableCell>
                        <TableCell>
                          {withdrawal.processed_at
                            ? formatDate(withdrawal.processed_at)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Vaquinha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Descrição</h4>
                <p className="text-muted-foreground">
                  {fundraiser.description || "Sem descrição"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Meta</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(fundraiser.goal_amount)}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Total Sacado</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.total_withdrawn)}
                  </p>
                </div>
              </div>

              {fundraiser.cover_image_url && (
                <div>
                  <h4 className="font-medium mb-2">Imagem de Capa</h4>
                  <img
                    src={fundraiser.cover_image_url}
                    alt="Capa da vaquinha"
                    className="rounded-lg max-w-full h-48 object-cover"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        open={withdrawalModalOpen}
        onOpenChange={setWithdrawalModalOpen}
        fundraiserId={fundraiser.id}
        availableBalance={stats.available_balance}
        bankAccounts={bankAccounts}
        onSuccess={fetchData}
      />
    </div>
  );
};
