import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangle, Flag, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { publicReportsService } from "@/services/public-reports";
import { ReportRequest } from "@/types";
import { toast } from "react-hot-toast";

interface ReportModalProps {
  fundraiserId: string;
  fundraiserTitle: string;
  trigger?: React.ReactNode;
}

interface ReportForm {
  reason: ReportRequest["reason"];
  description: string;
}

const REPORT_REASONS = [
  {
    value: "FRAUD" as const,
    label: "Fraude",
    description: "Esta arrecadação parece ser fraudulenta ou enganosa",
  },
  {
    value: "INAPPROPRIATE_CONTENT" as const,
    label: "Conteúdo Inapropriado",
    description: "Contém conteúdo ofensivo, discriminatório ou inadequado",
  },
  {
    value: "FALSE_INFORMATION" as const,
    label: "Informações Falsas",
    description: "As informações fornecidas são falsas ou enganosas",
  },
  {
    value: "SPAM" as const,
    label: "Spam",
    description: "Esta arrecadação parece ser spam ou não tem propósito legítimo",
  },
  {
    value: "OTHER" as const,
    label: "Outro",
    description: "Outro motivo não listado acima",
  },
];

export const ReportModal = ({
  fundraiserId,
  fundraiserTitle,
  trigger,
}: ReportModalProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ReportForm>();

  const watchReason = watch("reason");

  const onSubmit = async (data: ReportForm) => {
    try {
      setIsSubmitting(true);
      await publicReportsService.reportFundraiser({
        fundraiser_id: fundraiserId,
        reason: data.reason,
        description: data.description,
      });

      toast.success("Denúncia enviada com sucesso!");
      setOpen(false);
      reset();
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Erro ao enviar denúncia. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive border-destructive/20 hover:bg-destructive/10"
    >
      <Flag className="h-4 w-4 mr-2" />
      Denunciar
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Denunciar Arrecadação
          </DialogTitle>
          <DialogDescription>
            Você está denunciando a Arrecadação "{fundraiserTitle}". Sua denúncia
            será analisada pela nossa equipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <Label className="text-sm font-medium">Motivo da denúncia</Label>
            <RadioGroup
              value={watchReason}
              onValueChange={(value) =>
                setValue("reason", value as ReportRequest["reason"])
              }
            >
              {REPORT_REASONS.map((reason) => (
                <div key={reason.value} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={reason.value}
                      id={reason.value}
                      {...register("reason", {
                        required: "Selecione um motivo",
                      })}
                    />
                    <Label htmlFor={reason.value} className="font-medium">
                      {reason.label}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    {reason.description}
                  </p>
                </div>
              ))}
            </RadioGroup>
            {errors.reason && (
              <p className="text-sm text-destructive">
                {errors.reason.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Descrição detalhada <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Forneça mais detalhes sobre o motivo da denúncia..."
              className="min-h-24"
              {...register("description", {
                required: "Forneça uma descrição detalhada",
                minLength: {
                  value: 20,
                  message: "A descrição deve ter pelo menos 20 caracteres",
                },
              })}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Seja específico e forneça evidências se possível. Denúncias falsas
              podem resultar em penalidades.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Denúncia
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
