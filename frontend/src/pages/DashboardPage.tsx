import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import { Heart, TrendingUp, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { fundraisersService } from "@/services/fundraisers";
import { contributionsService } from "@/services/contributions";
import { Fundraiser } from "@/types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

export const DashboardPage = () => {
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [contributionsCount, setContributionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [fundraisersData, contributionsData] = await Promise.all([
          fundraisersService.getAll(),
          contributionsService.getMine()
        ]);
        
        setFundraisers(fundraisersData);
        setContributionsCount(contributionsData.length);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalRaised = fundraisers.reduce((sum, f) => sum + f.current_amount, 0);
  const totalGoal = fundraisers.reduce((sum, f) => sum + f.goal_amount, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Chart data for fundraising progress
  const lineChartData = {
    labels: fundraisers.map(f => f.title.substring(0, 20) + '...'),
    datasets: [
      {
        label: 'Meta',
        data: fundraisers.map(f => f.goal_amount),
        borderColor: 'hsl(180, 25%, 35%)',
        backgroundColor: 'hsl(180, 25%, 35%, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Arrecadado',
        data: fundraisers.map(f => f.current_amount),
        borderColor: 'hsl(14, 100%, 57%)',
        backgroundColor: 'hsl(14, 100%, 57%, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Chart data for status distribution
  const statusCounts = fundraisers.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = {
    labels: Object.keys(statusCounts).map(status => {
      const statusLabels = {
        ACTIVE: 'Ativas',
        PAUSED: 'Pausadas',
        FINISHED: 'Finalizadas'
      };
      return statusLabels[status as keyof typeof statusLabels] || status;
    }),
    datasets: [
      {
        data: Object.values(statusCounts),
        backgroundColor: [
          'hsl(142, 76%, 36%)',
          'hsl(38, 92%, 50%)',
          'hsl(0, 84%, 60%)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (fundraisers.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button 
            onClick={() => navigate('/app/fundraisers/new')}
            className="gradient-primary text-white shadow-medium hover:shadow-strong transition-smooth"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Vaquinha
          </Button>
        </div>

        <EmptyState
          icon={Heart}
          title="Bem-vindo às Vaquinhas Solidárias!"
          description="Você ainda não criou nenhuma vaquinha. Que tal começar criando sua primeira campanha de arrecadação?"
          action={{
            label: "Criar primeira vaquinha",
            onClick: () => navigate('/app/fundraisers/new')
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button 
          onClick={() => navigate('/app/fundraisers/new')}
          className="gradient-primary text-white shadow-medium hover:shadow-strong transition-smooth"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Vaquinha
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Total de Vaquinhas"
          value={fundraisers.length}
          icon={Heart}
          description="Campanhas criadas"
        />
        <KPICard
          title="Total Arrecadado"
          value={formatCurrency(totalRaised)}
          icon={TrendingUp}
          description={`Meta: ${formatCurrency(totalGoal)}`}
        />
        <KPICard
          title="Contribuições Recebidas"
          value={contributionsCount}
          icon={Users}
          description="Doações para suas vaquinhas"
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress">Progresso das Vaquinhas</TabsTrigger>
          <TabsTrigger value="status">Status das Campanhas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="progress" className="space-y-4">
          <Card className="gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Evolução da Arrecadação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line data={lineChartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card className="gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Pie data={pieChartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};