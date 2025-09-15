// FundraiserStatusModal.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangle, Play, Pause, Square } from "lucide-react";
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
import { toast } from "react-hot-toast";
import { fundraisersService } from "@/services/fundraisers";

interface FundraiserStatusModalProps {
  fundraiserId: string;
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  trigger?: React.ReactNode;
}

interface StatusForm {
  status: "ACTIVE" | "PAUSED" | "FINISHED";
  reason?: string;
}

const STATUS_OPTIONS = [
  {
    value: "ACTIVE" as const,
    label: "Ativo",
    description: "A vaquinha está aberta para receber contribuições",
    icon: Play,
    color: "text-green-600",
  },
  {
    value: "PAUSED" as const,
    label: "Pausado",
    description: "Temporariamente pausada, pode ser reativada",
    icon: Pause,
    color: "text-yellow-600",
  },
  {
    value: "FINISHED" as const,
    label: "Finalizada",
    description: "Vaquinha concluída, pode ser reaberta se necessário",
    icon: Square,
    color: "text-gray-600",
  },
];

export const FundraiserStatusModal = ({
  fundraiserId,
  currentStatus,
  onStatusChange,
  trigger,
}: FundraiserStatusModalProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<StatusForm>({
    defaultValues: {
      status: currentStatus as StatusForm["status"],
    },
  });

  const watchStatus = watch("status");

  const onSubmit = async (data: StatusForm) => {
    try {
      setIsSubmitting(true);

      await fundraisersService.updateStatus(fundraiserId, {
        status: data.status,
        reason: data.reason,
      });

      onStatusChange(data.status);
      toast.success("Status da vaquinha atualizado com sucesso!");
      setOpen(false);
      reset({ status: data.status, reason: "" });
    } catch (error: any) {
      console.error("Error updating fundraiser status:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao atualizar status. Tente novamente.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <AlertTriangle className="h-4 w-4 mr-2" />
      Alterar Status
    </Button>
  );

  const getStatusLabel = (status: string) => {
    const option = STATUS_OPTIONS.find((opt) => opt.value === status);
    return option?.label || status;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Alterar Status da Vaquinha
          </DialogTitle>
          <DialogDescription>
            Status atual: <strong>{getStatusLabel(currentStatus)}</strong>
            <br />
            Selecione o novo status e informe o motivo da mudança.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <Label className="text-sm font-medium">Novo Status</Label>
            <RadioGroup
              value={watchStatus}
              onValueChange={(value) =>
                setValue("status", value as StatusForm["status"])
              }
            >
              {STATUS_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value} className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        {...register("status", {
                          required: "Selecione um status",
                        })}
                      />
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${option.color}`} />
                        <Label htmlFor={option.value} className="font-medium">
                          {option.label}
                        </Label>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">
                      {option.description}
                    </p>
                  </div>
                );
              })}
            </RadioGroup>
            {errors.status && (
              <p className="text-sm text-destructive">
                {errors.status.message}
              </p>
            )}
          </div>

          {watchStatus !== currentStatus && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                Motivo da alteração <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Explique o motivo da mudança de status..."
                className="min-h-20"
                {...register("reason", {
                  required: "Forneça o motivo da alteração",
                  minLength: {
                    value: 10,
                    message: "O motivo deve ter pelo menos 10 caracteres",
                  },
                })}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">
                  {errors.reason.message}
                </p>
              )}
            </div>
          )}

          <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-1">Importante:</p>
            <ul className="space-y-1 text-xs">
              <li>• O controle de saques permanece independente do status</li>
              <li>
                • Arrecadações pausadas ou finalizadas podem ser reativadas
              </li>
              <li>• Contribuições só são aceitas em vaquinhas ativas</li>
            </ul>
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
            <Button
              type="submit"
              disabled={isSubmitting || watchStatus === currentStatus}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Atualizando...
                </>
              ) : (
                "Atualizar Status"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
