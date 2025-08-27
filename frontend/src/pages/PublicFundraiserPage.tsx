import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Heart, MapPin, Share2, Calendar, User, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MoneyProgressBar } from "@/components/ui/money-progress-bar";
import { publicService } from "@/services/public";
import { contributionsService } from "@/services/contributions";
import { PublicFundraiserData, CreateContributionRequest } from "@/types";
import { toast } from "react-hot-toast";

export const PublicFundraiserPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [fundraiser, setFundraiser] = useState<PublicFundraiserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CreateContributionRequest & { is_anonymous: boolean }>();
  const watchIsAnonymous = watch("is_anonymous", false);

  useEffect(() => {
    if (slug) {
      fetchFundraiser();
    }
  }, [slug]);

  const fetchFundraiser = async () => {
    try {
      setIsLoading(true);
      const data = await publicService.getFundraiserBySlug(slug!);
      setFundraiser(data);
    } catch (error) {
      console.error('Error fetching public fundraiser:', error);
      toast.error('Vaquinha não encontrada ou indisponível');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CreateContributionRequest & { is_anonymous: boolean }) => {
    if (!fundraiser) return;

    try {
      setIsSubmitting(true);
      
      const contributionData = {
        amount: data.amount,
        message: data.message,
        is_anonymous: data.is_anonymous
      };

      const result = await contributionsService.create(fundraiser.id, contributionData);
      
      toast.success('Contribuição realizada com sucesso! Aguarde a confirmação do pagamento.');
      console.log('Payment intent ID:', result.payment_intent_id);
      
      // Reset form
      setValue("amount", 0);
      setValue("message", "");
      setValue("is_anonymous", false);
      
    } catch (error) {
      console.error('Error creating contribution:', error);
      toast.error('Erro ao processar contribuição. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareUrl = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: fundraiser?.title,
        text: fundraiser?.description,
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getProgressPercentage = () => {
    if (!fundraiser) return 0;
    return Math.min((fundraiser.current_amount / fundraiser.goal_amount) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!fundraiser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="gradient-card border-0 shadow-medium max-w-md">
          <CardContent className="p-8 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Vaquinha não encontrada</h2>
            <p className="text-muted-foreground">
              A vaquinha que você está procurando não existe ou não está mais disponível.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">Vaquinhas Solidárias</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={shareUrl}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Section */}
            <Card className="gradient-card border-0 shadow-medium overflow-hidden">
              {fundraiser.cover_image_url && (
                <div className="aspect-video">
                  <img 
                    src={fundraiser.cover_image_url} 
                    alt={fundraiser.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold">{fundraiser.title}</h1>
                  
                  {(fundraiser.city || fundraiser.state) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {[fundraiser.city, fundraiser.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Progresso da arrecadação</span>
                      <span className="text-sm font-medium">
                        {Math.round(getProgressPercentage())}% da meta
                      </span>
                    </div>
                    
                    <MoneyProgressBar
                      current={fundraiser.current_amount}
                      goal={fundraiser.goal_amount}
                    />
                  </div>

                  {fundraiser.description && (
                    <div className="pt-4">
                      <h3 className="font-semibold mb-3">Sobre esta vaquinha</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {fundraiser.description}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contribution Form */}
          <div className="space-y-6">
            <Card className="gradient-card border-0 shadow-medium sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Faça sua contribuição
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      Valor da contribuição (R$) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="0,00"
                        className="pl-10"
                        {...register("amount", {
                          required: "Valor é obrigatório",
                          min: {
                            value: 1,
                            message: "Valor mínimo é R$ 1,00"
                          },
                          valueAsNumber: true
                        })}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-sm text-destructive">{errors.amount.message}</p>
                    )}
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 25, 50, 100, 200, 500].map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValue("amount", amount)}
                        className="text-xs"
                      >
                        R$ {amount}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem de apoio (opcional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Deixe uma mensagem de incentivo..."
                      className="min-h-20"
                      {...register("message")}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <Label htmlFor="is_anonymous" className="text-sm font-medium">
                        Contribuição anônima
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Seu nome não aparecerá publicamente
                      </p>
                    </div>
                    <Switch
                      id="is_anonymous"
                      {...register("is_anonymous")}
                      onCheckedChange={(checked) => setValue("is_anonymous", checked)}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-white shadow-medium hover:shadow-strong transition-smooth"
                    disabled={isSubmitting}
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-2" />
                        Contribuir Agora
                      </>
                    )}
                  </Button>
                </form>

                {/* Security Notice */}
                <div className="text-xs text-center text-muted-foreground pt-4 border-t">
                  <p>🔒 Transação segura e protegida</p>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="gradient-card border-0 shadow-soft">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Meta</span>
                    <span className="font-medium">{formatCurrency(fundraiser.goal_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Arrecadado</span>
                    <span className="font-medium text-primary">{formatCurrency(fundraiser.current_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Faltam</span>
                    <span className="font-medium">
                      {formatCurrency(Math.max(0, fundraiser.goal_amount - fundraiser.current_amount))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};