import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Clock, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "react-hot-toast";
import api from "@/lib/api";

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  fundraiserTitle: string;

  /** BR Code (copia e cola) recebido do backend */
  pixCode: string | null;

  /** txid (== payment_intent_id) para polling de status */
  txid: string | null;

  /** chamado quando expira */
  onExpire?: () => void;

  /** chamado quando o pagamento for concluído */
  onSuccess?: () => void;
}

export const PixPaymentModal = ({
  isOpen,
  onClose,
  amount,
  fundraiserTitle,
  pixCode,
  txid,
  onExpire,
  onSuccess,
}: PixPaymentModalProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos
  const [isLoading, setIsLoading] = useState(true);

  const validPixCode = useMemo(() => pixCode?.trim() || "", [pixCode]);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5055";

  const STATUS_URL = (txid: string) =>
    `${API_URL}/api/payments/${txid}/refresh`;

  // Gera o QR a partir do pixCode recebido
  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(300);
    setIsLoading(true);
    setQrCodeUrl("");

    if (!validPixCode) {
      setIsLoading(false);
      toast.error("Erro ao gerar o QR Code: código PIX ausente.");
      return;
    }

    QRCode.toDataURL(validPixCode, {
      width: 256,
      margin: 1,
      color: { dark: "#000000", light: "#FFFFFF" },
    })
      .then((url) => {
        setQrCodeUrl(url);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        toast.error("Erro ao gerar QR Code");
      });
  }, [isOpen, validPixCode]);

  // Countdown de expiração
  useEffect(() => {
    if (!isOpen || timeLeft === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          toast.error("Pagamento expirou. Tente novamente.");
          onExpire?.();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft, onExpire, onClose]);

  useEffect(() => {
    if (!isOpen || !txid) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const resp = await axios.post(STATUS_URL(txid), {}, { timeout: 8000 });
        const status: string = String(resp.data?.status || "").toUpperCase();

        if (status === "PAID") {
          if (!cancelled) {
            toast.success("Doação confirmada com sucesso! Obrigado ❤️");
            onSuccess?.();
            onClose();
          }
        } else if (status === "FAILED") {
          if (!cancelled) {
            toast.error("Pagamento não concluído.");
            onClose();
          }
        }
      } catch {
        /* ignora erros intermitentes e continua */
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, txid, onSuccess, onClose]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const copyPixCode = () => {
    if (!validPixCode) return;
    navigator.clipboard.writeText(validPixCode);
    toast.success("Código PIX copiado!");
  };

  const handleClose = () => {
    onClose();
    setQrCodeUrl("");
    setTimeLeft(300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Pagamento PIX
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Contribuição para "{fundraiserTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Infos */}
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {formatCurrency(amount)}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Expira em {formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center space-y-4">
            {isLoading ? (
              <div className="w-64 h-64 flex items-center justify-center border border-muted rounded-lg">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="p-4 bg-white rounded-lg border">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code PIX"
                    className="w-56 h-56"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">
                      QR Code indisponível
                    </span>
                  </div>
                )}
              </div>
            )}
            <p className="text-sm text-center text-muted-foreground">
              Escaneie o QR Code com o app do seu banco
            </p>
          </div>

          {/* Código PIX (copia e cola) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Ou copie o código PIX:
            </Label>
            <div className="flex gap-2">
              <Input
                value={validPixCode}
                readOnly
                className="font-mono text-xs"
                placeholder="Gerando código..."
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyPixCode}
                disabled={!validPixCode}
                title="Copiar código PIX"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Como pagar:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Abra o app do seu banco</li>
              <li>Escaneie o QR Code ou cole o código PIX</li>
              <li>Confirme o pagamento</li>
              <li>Aguarde a confirmação automática</li>
            </ol>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            {/* Sem botão "Paguei" — webhook + polling encerram o fluxo */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
