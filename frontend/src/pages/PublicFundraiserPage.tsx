import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Heart, MapPin, Share2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MoneyProgressBar } from "@/components/ui/money-progress-bar";
import { ReportModal } from "@/components/ui/report-modal";
import { PixPaymentModal } from "@/components/ui/pix-payment-modal";
import { publicService } from "@/services/public";
import { contributionsService } from "@/services/contributions";
import { PublicFundraiserData, CreateContributionRequest } from "@/types";
import { toast } from "react-hot-toast";

export const PublicFundraiserPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [fundraiser, setFundraiser] = useState<PublicFundraiserData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PIX modal state
  const [showPixModal, setShowPixModal] = useState(false);
  const [contributionAmount, setContributionAmount] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateContributionRequest & { is_anonymous: boolean }>();
  const watchIsAnonymous = watch("is_anonymous", false);

  useEffect(() => {
    if (slug) {
      fetchFundraiser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchFundraiser = async () => {
    try {
      setIsLoading(true);
      const data = await publicService.getFundraiserBySlug(slug!);
      setFundraiser(data);
    } catch (error) {
      console.error("Error fetching public fundraiser:", error);
      toast.error("Vaquinha não encontrada ou indisponível");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (
    data: CreateContributionRequest & { is_anonymous: boolean }
  ) => {
    if (!fundraiser) return;

    // validação de mínimo
    if (data.amount < 20) {
      toast.error("O valor mínimo para contribuição é R$ 20,00");
      return;
    }

    // abre modal PIX e guarda o valor
    setContributionAmount(data.amount);
    setShowPixModal(true);
  };

  const handlePixPaymentSuccess = async () => {
    try {
      setIsSubmitting(true);

      const formData = watch();
      const contributionData: CreateContributionRequest = {
        amount: contributionAmount,
        message: formData.message,
        is_anonymous: formData.is_anonymous,
      };

      const result = await contributionsService.create(
        fundraiser!.id,
        contributionData
      );

      toast.success(
        "Contribuição realizada com sucesso! Aguarde a confirmação do pagamento."
      );
      console.log("Payment intent ID:", result.payment_intent_id);

      // reset
      setValue("amount", 20);
      setValue("message", "");
      setValue("is_anonymous", false);

      // atualiza valores
      await fetchFundraiser();
    } catch (error) {
      console.error("Error creating contribution:", error);
      toast.error("Erro ao processar contribuição. Tente novamente.");
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
      toast.success("Link copiado para a área de transferência!");
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const getProgressPercentage = () => {
    if (!fundraiser) return 0;
    return Math.min(
      (fundraiser.current_amount / fundraiser.goal_amount) * 100,
      100
    );
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
            <h2 className="text-xl font-semibold mb-2">
              Vaquinha não encontrada
            </h2>
            <p className="text-muted-foreground">
              A vaquinha que você está procurando não existe ou não está mais
              disponível.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex gap-2">
        <ReportModal
          fundraiserId={fundraiser.id}
          fundraiserTitle={fundraiser.title}
        />
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

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
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
                        {[fundraiser.city, fundraiser.state]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Progresso da arrecadação
                      </span>
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
                      <h3 className="font-semibold mb-3">
                        Sobre esta vaquinha
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {fundraiser.description}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulário */}
          <div className="space-y-6">
            <Card className="gradient-card border-0 shadow-medium">
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
                      Valor da contribuição (R$){" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="20"
                        placeholder="20,00"
                        className="pl-10"
                        {...register("amount", {
                          required: "Valor é obrigatório",
                          min: {
                            value: 20,
                            message: "Valor mínimo é R$ 20,00",
                          },
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-sm text-destructive">
                        {errors.amount.message}
                      </p>
                    )}
                  </div>

                  {/* Botões rápidos */}
                  <div className="grid grid-cols-3 gap-2">
                    {[20, 50, 100, 200, 500, 1000].map((amount) => (
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
                    <Label htmlFor="message">
                      Mensagem de apoio (opcional)
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Deixe uma mensagem de incentivo..."
                      className="min-h-20"
                      {...register("message")}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <Label
                        htmlFor="is_anonymous"
                        className="text-sm font-medium"
                      >
                        Contribuição anônima
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Seu nome não aparecerá publicamente
                      </p>
                    </div>
                    <Switch
                      id="is_anonymous"
                      {...register("is_anonymous")}
                      onCheckedChange={(checked) =>
                        setValue("is_anonymous", checked)
                      }
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

                {/* Aviso de segurança */}
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
                    <span className="font-medium">
                      {formatCurrency(fundraiser.goal_amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Arrecadado
                    </span>
                    <span className="font-medium text-primary">
                      {formatCurrency(fundraiser.current_amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Faltam
                    </span>
                    <span className="font-medium">
                      {formatCurrency(
                        Math.max(
                          0,
                          fundraiser.goal_amount - fundraiser.current_amount
                        )
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* PIX Payment Modal */}
      <PixPaymentModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        amount={contributionAmount}
        fundraiserTitle={fundraiser?.title || ""}
        onSuccess={handlePixPaymentSuccess}
        onExpire={() => {
          toast.error("Pagamento PIX expirou");
          setShowPixModal(false);
        }}
      />
    </div>
  );
};
