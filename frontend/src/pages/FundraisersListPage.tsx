import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Share2,
  Globe,
  FileSearch,
  MoreVertical,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { MoneyProgressBar } from "@/components/ui/money-progress-bar";
import { fundraisersService } from "@/services/fundraisers";
import { Fundraiser } from "@/types";
import { toast } from "react-hot-toast";

export const FundraisersListPage = () => {
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [filteredFundraisers, setFilteredFundraisers] = useState<Fundraiser[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchFundraisers();
  }, []);

  useEffect(() => {
    let filtered = fundraisers;

    if (searchQuery) {
      filtered = filtered.filter(
        (f) =>
          f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((f) => f.status === statusFilter);
    }

    setFilteredFundraisers(filtered);
  }, [fundraisers, searchQuery, statusFilter]);

  const fetchFundraisers = async () => {
    try {
      setIsLoading(true);
      const data = await fundraisersService.getAll();
      setFundraisers(data);
      setFilteredFundraisers(data);
    } catch (error) {
      console.error("Error fetching fundraisers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fundraisersService.delete(id);
      setFundraisers((prev) => prev.filter((f) => f.id !== id));
      toast.success("Vaquinha excluída com sucesso!");
    } catch (error) {
      console.error("Error deleting fundraiser:", error);
    }
  };

  const handleTogglePublic = async (fundraiser: Fundraiser) => {
    try {
      if (!fundraiser.is_public) {
        await fundraisersService.makePublic(fundraiser.id);
        toast.success("Vaquinha tornada pública com sucesso!");
      } else {
        await fundraisersService.update(fundraiser.id, { is_public: false });
        toast.success("Vaquinha tornada privada com sucesso!");
      }
      fetchFundraisers();
    } catch (error) {
      console.error("Error toggling public status:", error);
    }
  };

  const handleGenerateAuditLink = async (id: string) => {
    try {
      const { audit_token } = await fundraisersService.generateAuditToken(id);
      const auditUrl = `${window.location.origin}/a/${audit_token}`;

      await navigator.clipboard.writeText(auditUrl);
      toast.success("Link de auditoria copiado para a área de transferência!");
    } catch (error) {
      console.error("Error generating audit link:", error);
    }
  };

  const copyPublicLink = async (publicSlug: string) => {
    const publicUrl = `${window.location.origin}/p/${publicSlug}`;
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link público copiado para a área de transferência!");
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ACTIVE: {
        variant: "default" as const,
        label: "Ativa",
        className: "bg-success text-success-foreground",
      },
      PAUSED: {
        variant: "secondary" as const,
        label: "Pausada",
        className: "bg-warning text-warning-foreground",
      },
      FINISHED: {
        variant: "destructive" as const,
        label: "Finalizada",
        className: "",
      },
    };

    const config = variants[status as keyof typeof variants] || variants.ACTIVE;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Minhas Vaquinhas</h1>
        <Button
          onClick={() => navigate("/app/fundraisers/new")}
          className="gradient-primary text-white shadow-medium hover:shadow-strong transition-smooth"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Vaquinha
        </Button>
      </div>

      {fundraisers.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Nenhuma vaquinha encontrada"
          description="Você ainda não criou nenhuma vaquinha. Crie sua primeira campanha agora!"
          action={{
            label: "Criar vaquinha",
            onClick: () => navigate("/app/fundraisers/new"),
          }}
        />
      ) : (
        <>
          {/* Filters */}
          <Card className="gradient-card border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título ou descrição..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ACTIVE">Ativas</SelectItem>
                    <SelectItem value="PAUSED">Pausadas</SelectItem>
                    <SelectItem value="FINISHED">Finalizadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table/Cards */}
          <div className="grid gap-4 md:hidden">
            {filteredFundraisers.map((fundraiser) => (
              <Card
                key={fundraiser.id}
                className="gradient-card border-0 shadow-soft"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {fundraiser.title}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(fundraiser.status)}
                        {fundraiser.is_public && (
                          <Badge variant="outline" className="text-xs">
                            <Globe className="w-3 h-3 mr-1" />
                            Público
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(
                              `/app/fundraisers/${fundraiser.id}/control`
                            )
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Controlar vaquinha
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(`/app/fundraisers/${fundraiser.id}/edit`)
                          }
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleTogglePublic(fundraiser)}
                        >
                          <Globe className="mr-2 h-4 w-4" />
                          {fundraiser.is_public
                            ? "Tornar Privada"
                            : "Tornar Pública"}
                        </DropdownMenuItem>
                        {fundraiser.public_slug && (
                          <DropdownMenuItem
                            onClick={() =>
                              copyPublicLink(fundraiser.public_slug!)
                            }
                          >
                            <Share2 className="mr-2 h-4 w-4" />
                            Copiar link público
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleGenerateAuditLink(fundraiser.id)}
                        >
                          <FileSearch className="mr-2 h-4 w-4" />
                          Link de auditoria
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Confirmar exclusão
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A vaquinha será
                                permanentemente excluída.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(fundraiser.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        Meta: {formatCurrency(fundraiser.goal_amount)}
                      </span>
                      <span>
                        Criada em: {formatDate(fundraiser.created_at)}
                      </span>
                    </div>
                    <MoneyProgressBar
                      current={fundraiser.current_amount}
                      goal={fundraiser.goal_amount}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="gradient-card border-0 shadow-soft hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Arrecadado</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFundraisers.map((fundraiser) => (
                  <TableRow key={fundraiser.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span>{fundraiser.title}</span>
                          {fundraiser.is_public && (
                            <Globe className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        {fundraiser.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {fundraiser.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(fundraiser.status)}</TableCell>
                    <TableCell>
                      {formatCurrency(fundraiser.goal_amount)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(fundraiser.current_amount)}
                    </TableCell>
                    <TableCell>
                      <div className="w-32">
                        <MoneyProgressBar
                          current={fundraiser.current_amount}
                          goal={fundraiser.goal_amount}
                          showValues={false}
                        />
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(fundraiser.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(
                                `/app/fundraisers/${fundraiser.id}/control`
                              )
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Controlar vaquinha
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/app/fundraisers/${fundraiser.id}/edit`)
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleTogglePublic(fundraiser)}
                          >
                            <Globe className="mr-2 h-4 w-4" />
                            {fundraiser.is_public
                              ? "Tornar Privada"
                              : "Tornar Pública"}
                          </DropdownMenuItem>
                          {fundraiser.public_slug && (
                            <DropdownMenuItem
                              onClick={() =>
                                copyPublicLink(fundraiser.public_slug!)
                              }
                            >
                              <Share2 className="mr-2 h-4 w-4" />
                              Copiar link público
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              handleGenerateAuditLink(fundraiser.id)
                            }
                          >
                            <FileSearch className="mr-2 h-4 w-4" />
                            Link de auditoria
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Confirmar exclusão
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. A vaquinha
                                  será permanentemente excluída.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(fundraiser.id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {filteredFundraisers.length === 0 && (
            <EmptyState
              icon={Search}
              title="Nenhuma vaquinha encontrada"
              description="Não encontramos vaquinhas com os filtros aplicados. Tente ajustar sua busca."
            />
          )}
        </>
      )}
    </div>
  );
};
