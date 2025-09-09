import { useState, useEffect } from "react";
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

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  fundraiserTitle: string;
  onExpire?: () => void;
  onSuccess?: () => void;
}

export const PixPaymentModal = ({
  isOpen,
  onClose,
  amount,
  fundraiserTitle,
  onExpire,
  onSuccess,
}: PixPaymentModalProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [pixCode, setPixCode] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isLoading, setIsLoading] = useState(true);

  // Mock PIX code for development
  const generateMockPixCode = (amount: number) => {
    return `00020101021243650016BR.GOV.BCB.PIX013613752565000174252040000530398654${String(
      amount * 100
    ).padStart(
      10,
      "0"
    )}5802BR5925VAQUINHAS SOLIDARIAS LTDA6009SAO PAULO61087056002062070503***630445E6`;
  };

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(300);
      setIsLoading(true);

      // Generate mock PIX code and QR code
      const mockCode = generateMockPixCode(amount);
      setPixCode(mockCode);

      // Generate QR Code
      QRCode.toDataURL(mockCode, {
        width: 256,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => {
          setQrCodeUrl(url);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error generating QR code:", err);
          setIsLoading(false);
          toast.error("Erro ao gerar QR Code");
        });
    }
  }, [isOpen, amount]);

  // Timer countdown
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    toast.success("Código PIX copiado!");
  };

  const handleClose = () => {
    onClose();
    setQrCodeUrl("");
    setPixCode("");
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
          {/* Payment Info */}
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {formatCurrency(amount)}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Expira em {formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center space-y-4">
            {isLoading ? (
              <div className="w-64 h-64 flex items-center justify-center border border-muted rounded-lg">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="p-4 bg-white rounded-lg border">
                <img src={qrCodeUrl} alt="QR Code PIX" className="w-56 h-56" />
              </div>
            )}
            <p className="text-sm text-center text-muted-foreground">
              Escaneie o QR Code com o app do seu banco
            </p>
          </div>

          {/* PIX Code */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Ou copie o código PIX:
            </Label>
            <div className="flex gap-2">
              <Input
                value={pixCode}
                readOnly
                className="font-mono text-xs"
                placeholder="Gerando código..."
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyPixCode}
                disabled={!pixCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Como pagar:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Abra o app do seu banco</li>
              <li>Escaneie o QR Code ou cole o código PIX</li>
              <li>Confirme o pagamento</li>
              <li>Aguarde a confirmação automática</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                toast.success("Aguardando confirmação do pagamento...");
                onSuccess?.();
                handleClose();
              }}
              className="flex-1"
            >
              Paguei
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
