import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MoneyProgressBar } from "@/components/ui/money-progress-bar";
import { ArrowLeft, Heart, MapPin, Share2 } from "lucide-react";
import { exploreService } from "@/services/explore";
import { contributionsService } from "@/services/contributions";
import { PublicFundraiserData, CreateContributionRequest } from "@/types";
import { toast } from "react-hot-toast";

export const ExploreFundraiserPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [fundraiser, setFundraiser] = useState<PublicFundraiserData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isContributing, setIsContributing] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    if (slug) {
      loadFundraiser();
    }
  }, [slug]);

  const loadFundraiser = async () => {
    if (!slug) return;

    try {
      setIsLoading(true);
      const data = await exploreService.getFundraiserBySlug(slug);
      setFundraiser(data);
    } catch (error) {
      toast.error("Erro ao carregar vaquinha");
      navigate("/app/explore");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fundraiser || !amount) return;

    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      toast.error("O valor deve ser maior que zero");
      return;
    }

    try {
      setIsContributing(true);

      const contributionData: CreateContributionRequest = {
        amount: numAmount,
        message: message.trim() || undefined,
        is_anonymous: isAnonymous,
      };

      const result = await contributionsService.createContribution(
        fundraiser.id,
        contributionData
      );

      toast.success("Contribuição realizada com sucesso!");

      // Reset form
      setAmount("");
      setMessage("");
      setIsAnonymous(false);

      // Reload fundraiser to get updated amount
      await loadFundraiser();
    } catch (error) {
      toast.error("Erro ao processar contribuição");
    } finally {
      setIsContributing(false);
    }
  };

  const handleShare = async () => {
    if (!fundraiser) return;

    try {
      const url = `${window.location.origin}/p/${fundraiser.public_slug}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!fundraiser) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Vaquinha não encontrada</h2>
        <p className="text-muted-foreground mb-4">
          Esta vaquinha não existe ou foi removida.
        </p>
        <Button onClick={() => navigate("/app/explore")}>
          Voltar para Explorar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/app/explore")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Informações da Vaquinha */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            {fundraiser.cover_image_url && (
              <div className="aspect-video bg-muted overflow-hidden rounded-t-lg">
                <img
                  src={fundraiser.cover_image_url}
                  alt={fundraiser.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <CardHeader>
              <CardTitle className="text-2xl">{fundraiser.title}</CardTitle>

              {(fundraiser.city || fundraiser.state) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {fundraiser.city && fundraiser.state
                      ? `${fundraiser.city}, ${fundraiser.state}`
                      : fundraiser.city || fundraiser.state}
                  </span>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <MoneyProgressBar
                current={fundraiser.current_amount}
                goal={fundraiser.goal_amount}
              />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(fundraiser.current_amount)}
                  </p>
                  <p className="text-sm text-muted-foreground">Arrecadado</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(fundraiser.goal_amount)}
                  </p>
                  <p className="text-sm text-muted-foreground">Meta</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {getProgressPercentage(
                      fundraiser.current_amount,
                      fundraiser.goal_amount
                    ).toFixed(1)}
                    %
                  </p>
                  <p className="text-sm text-muted-foreground">Alcançado</p>
                </div>
              </div>

              {fundraiser.description && (
                <div>
                  <h3 className="font-semibold mb-3">Sobre esta vaquinha</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {fundraiser.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Formulário de Contribuição */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Fazer uma Contribuição
              </CardTitle>
              <CardDescription>
                Ajude esta causa com sua contribuição
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleContribute} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor da Contribuição *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-sm text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10"
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem (opcional)</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Deixe uma mensagem de apoio..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={(checked) =>
                      setIsAnonymous(checked === true)
                    }
                  />
                  <Label htmlFor="anonymous" className="text-sm">
                    Contribuir anonimamente
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={isContributing}
                  className="w-full"
                >
                  {isContributing ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Heart className="h-4 w-4 mr-2" />
                      Contribuir{" "}
                      {amount && `- ${formatCurrency(parseFloat(amount))}`}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Valores Sugeridos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Valores Sugeridos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[10, 25, 50, 100].map((value) => (
                  <Button
                    key={value}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(value.toString())}
                  >
                    R$ {value}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
