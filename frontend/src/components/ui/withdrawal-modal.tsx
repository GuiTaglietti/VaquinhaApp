import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BankAccount } from "@/types/profile";
import { withdrawalsService } from "@/services/withdrawals";
import { toast } from "react-hot-toast";
import { BRAZILIAN_BANKS } from "@/types/profile";

// schema base (sem availableBalance aqui; checamos no submit)
const withdrawalSchema = z.object({
  bank_account_id: z.string().min(1, "Selecione uma conta bancária"),
  amount: z.number().min(50, "Valor mínimo de saque é R$ 50,00 (bruto)"),
  description: z.string().optional(),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fundraiserId: string;
  availableBalance: number; // saldo líquido disponível (antes da taxa do próximo saque)
  bankAccounts: BankAccount[];
  onSuccess: () => void;
  withdrawFeeFixed?: number; // taxa fixa por saque (default R$ 4,50)
}

export const WithdrawalModal = ({
  open,
  onOpenChange,
  fundraiserId,
  availableBalance,
  bankAccounts,
  onSuccess,
  withdrawFeeFixed = 4.5,
}: WithdrawalModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      bank_account_id: "",
      amount: 0,
      description: "",
    },
    mode: "onChange",
  });

  const { watch } = form;
  const gross = Number(watch("amount") || 0); // valor que será descontado do saldo
  const net = Math.max(0, Number((gross - withdrawFeeFixed).toFixed(2))); // valor líquido que o usuário recebe

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(isFinite(value) ? value : 0);

  const bankLabelByCode = (code?: string, fallbackName?: string) => {
    if (!code) return fallbackName ?? "";
    const meta = BRAZILIAN_BANKS.find((b) => b.code === code);
    return `${code} - ${meta?.name ?? fallbackName ?? code}`;
  };

  const onSubmit = async (data: WithdrawalFormData) => {
    // regras de negócio no FE (espelha o BE):
    if (data.amount < 50) {
      toast.error("Valor mínimo de saque é R$ 50,00 (bruto).");
      return;
    }
    if (data.amount > availableBalance) {
      toast.error("Valor solicitado maior que o saldo disponível.");
      return;
    }

    setIsSubmitting(true);
    try {
      await withdrawalsService.requestWithdrawal({
        fundraiser_id: fundraiserId,
        bank_account_id: data.bank_account_id,
        amount: data.amount, // BE trata como BRUTO e desconta a taxa fixa
        description: data.description,
      });

      toast.success("Solicitação de saque enviada com sucesso!");
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Erro ao solicitar saque. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDisabled =
    isSubmitting ||
    gross < 50 ||
    gross > availableBalance ||
    !form.formState.isValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Solicitar Saque</DialogTitle>
          <DialogDescription>
            Saldo disponível: <b>{formatCurrency(availableBalance)}</b>
            <br />
            Taxa fixa por saque: <b>{formatCurrency(withdrawFeeFixed)}</b>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="bank_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta Bancária</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conta bancária" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {bankLabelByCode(
                            account.bank_code,
                            account.bank_name
                          )}{" "}
                          — {account.agency}/{account.account_number}
                          {account.is_default && " (Padrão)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Valor do Saque (bruto, descontado do saldo)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min={50}
                      max={availableBalance}
                      placeholder="0,00"
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="mt-2 text-sm text-muted-foreground">
                    Você receberá: <b>{formatCurrency(net)}</b> (valor
                    solicitado − {formatCurrency(withdrawFeeFixed)} de taxa
                    fixa) <br />
                    Será descontado do saldo: <b>{formatCurrency(gross)}</b>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Motivo do saque..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitDisabled}
                className="flex-1"
              >
                {isSubmitting ? "Processando..." : "Solicitar Saque"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
