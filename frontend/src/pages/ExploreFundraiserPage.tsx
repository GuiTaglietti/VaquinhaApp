import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
import { ReportModal } from "@/components/ui/report-modal";
import { PixPaymentModal } from "@/components/ui/pix-payment-modal";
import { exploreService } from "@/services/explore";
import { contributionsService } from "@/services/contributions";
import { PublicFundraiserData, CreateContributionRequest } from "@/types";
import { toast } from "react-hot-toast";

export const ExploreFundraiserPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const baseExplorePath = location.pathname.startsWith("/app")
    ? "/app/explore"
    : "/explore";

  const [fundraiser, setFundraiser] = useState<PublicFundraiserData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isContributing, setIsContributing] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // PIX modal state
  const [showPixModal, setShowPixModal] = useState(false);
  const [contributionAmount, setContributionAmount] = useState(0);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

  const canContribute = fundraiser?.can_contribute === true;

  useEffect(() => {
    if (slug) {
      loadFundraiser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadFundraiser = async () => {
    if (!slug) return;
    try {
      setIsLoading(true);
      const data = await exploreService.getFundraiserBySlug(slug);
      setFundraiser(data);
    } catch (error) {
      toast.error("Erro ao carregar arrecadação");
      navigate(baseExplorePath);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundraiser) return;

    if (!canContribute) {
      toast.error(
        "Esta arrecadação não está aceitando contribuições no momento."
      );
      return;
    }

    const numAmount = parseFloat(amount);
    // if (Number.isNaN(numAmount) || numAmount < 20) {
    //   toast.error("O valor mínimo para contribuição é R$ 20,00");
    //   return;
    // }

    // 1) Cria contribuição no backend para obter txid + brcode
    try {
      setIsContributing(true);

      const payload: CreateContributionRequest = {
        amount: numAmount,
        message: message.trim() || undefined,
        is_anonymous: isAnonymous,
      };

      const res = await contributionsService.createContribution(
        fundraiser.id,
        payload
      );

      const code = res.brcode || res.pix_copia_e_cola || "";
      if (!res.payment_intent_id || !code) {
        toast.error("Falha ao iniciar pagamento PIX.");
        setIsContributing(false);
        return;
      }

      setContributionAmount(numAmount);
      setTxid(res.payment_intent_id);
      setPixCode(code);

      // 2) Abre o modal PIX
      setShowPixModal(true);
    } catch (error) {
      toast.error("Erro ao iniciar contribuição.");
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
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const getProgressPercentage = (current: number, goal: number) =>
    Math.min((current / goal) * 100, 100);

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
        <h2 className="text-2xl font-bold mb-2">Arrecadação não encontrada</h2>
        <p className="text-muted-foreground mb-4">
          Esta arrecadação não existe ou foi removida.
        </p>
        <Button onClick={() => navigate(baseExplorePath)}>
          Voltar para Explorar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de ações */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(baseExplorePath)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex gap-2">
          <ReportModal
            fundraiserId={fundraiser.id}
            fundraiserTitle={fundraiser.title}
          />
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Informações */}
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
                  <h3 className="font-semibold mb-3">Sobre esta arrecadação</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {fundraiser.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Formulário */}
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
                      disabled={!canContribute}
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
                    disabled={!canContribute}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={(checked) =>
                      setIsAnonymous(checked === true)
                    }
                    disabled={!canContribute}
                  />
                  <Label htmlFor="anonymous" className="text-sm">
                    Contribuir anonimamente
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={isContributing || !canContribute}
                  className="w-full"
                >
                  {isContributing ? (
                    <LoadingSpinner size="sm" />
                  ) : canContribute ? (
                    <>
                      <Heart className="h-4 w-4 mr-2" />
                      Contribuir{" "}
                      {amount && `- ${formatCurrency(parseFloat(amount))}`}
                    </>
                  ) : (
                    "Contribuições encerradas"
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
                {[20, 50, 100, 200].map((value) => (
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

      {/* Modal PIX */}
      <PixPaymentModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        amount={contributionAmount}
        fundraiserTitle={fundraiser?.title || ""}
        pixCode={pixCode}
        txid={txid}
        onSuccess={async () => {
          // recarrega valores ao confirmar
          await loadFundraiser();
        }}
        onExpire={() => {
          toast.error("Pagamento PIX expirou");
          setShowPixModal(false);
        }}
      />
    </div>
  );
};
