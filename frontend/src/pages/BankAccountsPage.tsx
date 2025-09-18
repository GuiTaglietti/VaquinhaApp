import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { CreditCard, Plus, Trash2, Star, Building2 } from "lucide-react";
import { profileService } from "@/services/profile";
import {
  BankAccount,
  CreateBankAccountRequest,
  BRAZILIAN_BANKS,
} from "@/types/profile";
import { toast } from "react-hot-toast";

export const BankAccountsPage = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<CreateBankAccountRequest>({
    bank_code: "",
    bank_name: "",
    agency: "",
    account_number: "",
    account_type: "CHECKING",
    account_holder_name: "",
    document_number: "",
    pix_key: "",
    pix_key_type: undefined,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const getBankMeta = (code?: string) => {
    if (!code) return { code: "", name: "" };
    const b = BRAZILIAN_BANKS.find((b) => b.code === code);
    return { code, name: b?.name ?? "" };
  };

  const getBankLabel = (code: string, fallbackName?: string) => {
    const m = getBankMeta(code);
    const name = m.name || fallbackName || code;
    return `${m.code} - ${name}`;
  };

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await profileService.getBankAccounts();
      setAccounts(data);
    } catch (error) {
      toast.error("Erro ao carregar contas bancárias");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      bank_code: "",
      agency: "",
      account_number: "",
      account_type: "CHECKING",
      account_holder_name: "",
      document_number: "",
      pix_key: "",
      pix_key_type: undefined,
    });
    setEditingAccount(null);
  };

  const handleOpenDialog = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        bank_code: account.bank_code,
        bank_name: account.bank_name || getBankMeta(account.bank_code).name,
        agency: account.agency,
        account_number: account.account_number,
        account_type: account.account_type,
        account_holder_name: account.account_holder_name,
        document_number: account.document_number,
        pix_key: account.pix_key ?? "",
        pix_key_type: account.pix_key_type ?? undefined,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);

      const hasPixKey = !!formData.pix_key?.trim();
      const hasPixType = !!formData.pix_key_type;
      if (hasPixKey !== hasPixType) {
        toast.error(
          "Preencha tipo e valor da chave PIX (ou deixe ambos em branco)."
        );
        setIsSaving(false);
        return;
      }

      if (editingAccount) {
        await profileService.updateBankAccount(editingAccount.id, formData);
        toast.success("Conta bancária atualizada com sucesso!");
      } else {
        await profileService.createBankAccount(formData);
        toast.success("Conta bancária criada com sucesso!");
      }

      await loadAccounts();
      handleCloseDialog();
    } catch (error) {
      const msg = (error?.message || "").toLowerCase();
      if (
        msg.includes("pix") &&
        (msg.includes("unique") || msg.includes("duplic"))
      ) {
        toast.error("Essa chave PIX já está em uso em outra conta.");
      } else {
        toast.error("Erro ao salvar conta bancária");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await profileService.deleteBankAccount(id);
      toast.success("Conta bancária removida com sucesso!");
      await loadAccounts();
    } catch (error) {
      toast.error("Erro ao remover conta bancária");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await profileService.setDefaultBankAccount(id);
      toast.success("Conta definida como padrão!");
      await loadAccounts();
    } catch (error) {
      toast.error("Erro ao definir conta como padrão");
    }
  };

  const getBankName = (code: string) => {
    return BRAZILIAN_BANKS.find((bank) => bank.code === code)?.name || code;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Contas Bancárias</h1>
            <p className="text-muted-foreground">
              Gerencie suas contas para recebimento
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingAccount
                  ? "Editar Conta Bancária"
                  : "Nova Conta Bancária"}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? "Atualize os dados da sua conta bancária."
                  : "Adicione uma nova conta para receber doações."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank_code">Banco</Label>
                <Select
                  value={formData.bank_code}
                  onValueChange={(value) => {
                    const meta = getBankMeta(value);
                    setFormData((prev) => ({
                      ...prev,
                      bank_code: value,
                      bank_name: meta.name,
                    }));
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_BANKS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.code} - {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agency">Agência</Label>
                  <Input
                    id="agency"
                    value={formData.agency}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        agency: e.target.value,
                      }))
                    }
                    placeholder="0000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_number">Conta</Label>
                  <Input
                    id="account_number"
                    value={formData.account_number}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        account_number: e.target.value,
                      }))
                    }
                    placeholder="00000-0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_type">Tipo de Conta</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value: "CHECKING" | "SAVINGS") =>
                    setFormData((prev) => ({ ...prev, account_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                    <SelectItem value="SAVINGS">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pix_key_type">
                    Tipo de chave PIX (opcional)
                  </Label>
                  <Select
                    value={formData.pix_key_type ?? ""}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        pix_key_type: value as any,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CPF">CPF</SelectItem>
                      <SelectItem value="CNPJ">CNPJ</SelectItem>
                      <SelectItem value="EMAIL">E-mail</SelectItem>
                      <SelectItem value="PHONE">Telefone</SelectItem>
                      <SelectItem value="EVP">Chave aleatória (EVP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pix_key">Chave PIX</Label>
                  <Input
                    id="pix_key"
                    value={formData.pix_key ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pix_key: e.target.value,
                      }))
                    }
                    placeholder="Digite a chave correspondente ao tipo"
                  />
                  <p className="text-xs text-muted-foreground">
                    Preencha os dois campos para cadastrar a chave PIX, ou deixe
                    ambos em branco.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_holder_name">Nome do Titular</Label>
                <Input
                  id="account_holder_name"
                  value={formData.account_holder_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      account_holder_name: e.target.value,
                    }))
                  }
                  placeholder="Nome completo do titular"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_number">CPF/CNPJ do Titular</Label>
                <Input
                  id="document_number"
                  value={formData.document_number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      document_number: e.target.value,
                    }))
                  }
                  placeholder="000.000.000-00"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <LoadingSpinner size="sm" />
                  ) : editingAccount ? (
                    "Atualizar"
                  ) : (
                    "Criar"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhuma conta bancária"
          description="Adicione uma conta bancária para receber doações das suas arrecadações."
          action={{
            label: "Adicionar Conta",
            onClick: () => handleOpenDialog(),
          }}
        />
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {getBankName(account.bank_code)}
                        </h3>
                        {account.is_default && (
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <Star className="h-3 w-3" />
                            Padrão
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ag: {account.agency} • Conta: {account.account_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {account.account_type === "CHECKING"
                          ? "Conta Corrente"
                          : "Conta Poupança"}
                      </p>
                      {account.pix_key && account.pix_key_type && (
                        <p className="text-sm text-muted-foreground">
                          PIX: {account.pix_key_type} • {account.pix_key}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {account.account_holder_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!account.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(account.id)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Definir como Padrão
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(account)}
                    >
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Remover conta bancária?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A conta será
                            removida permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(account.id)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
