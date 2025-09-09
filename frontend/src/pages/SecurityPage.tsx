import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Shield, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { authService } from "@/services/auth";
import { profileService } from "@/services/profile";
import { ChangePasswordRequest, DeleteAccountRequest } from "@/types";
import { BankAccount } from "@/types/profile";
import { toast } from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { useEffect } from "react";

interface ChangePasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface DeleteAccountForm {
  password: string;
  bank_account_id: string;
  confirmation: string;
}

export const SecurityPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    delete: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    watch: watchPassword,
    reset: resetPasswordForm,
  } = useForm<ChangePasswordForm>();

  const {
    register: registerDelete,
    handleSubmit: handleDeleteSubmit,
    formState: { errors: deleteErrors },
    setValue: setDeleteValue,
    watch: watchDelete,
  } = useForm<DeleteAccountForm>();

  const watchNewPassword = watchPassword("new_password");
  const watchConfirmation = watchDelete("confirmation");

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      const accounts = await profileService.getBankAccounts();
      setBankAccounts(accounts);
    } catch (error) {
      console.error("Error loading bank accounts:", error);
    }
  };

  const onChangePassword = async (data: ChangePasswordForm) => {
    try {
      setIsChangingPassword(true);
      await authService.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success("Senha alterada com sucesso!");
      resetPasswordForm();
    } catch (error) {
      console.error("Change password failed:", error);
      toast.error("Erro ao alterar senha. Verifique sua senha atual.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const onDeleteAccount = async (data: DeleteAccountForm) => {
    try {
      setIsDeletingAccount(true);
      await authService.deleteAccount(data);
      toast.success("Conta excluída com sucesso!");
      logout();
      navigate("/");
    } catch (error) {
      console.error("Delete account failed:", error);
      toast.error("Erro ao excluir conta. Verifique sua senha.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Segurança da Conta</h1>
        <p className="text-muted-foreground">
          Gerencie a segurança da sua conta e dados pessoais
        </p>
      </div>

      {/* Change Password */}
      <Card className="gradient-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Mantenha sua conta segura com uma senha forte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handlePasswordSubmit(onChangePassword)}
            className="space-y-4 max-w-md"
          >
            <div className="space-y-2">
              <Label htmlFor="current_password">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showPasswords.current ? "text" : "password"}
                  placeholder="Sua senha atual"
                  {...registerPassword("current_password", {
                    required: "Senha atual é obrigatória",
                  })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility("current")}
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordErrors.current_password && (
                <p className="text-sm text-destructive">
                  {passwordErrors.current_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showPasswords.new ? "text" : "password"}
                  placeholder="Sua nova senha"
                  {...registerPassword("new_password", {
                    required: "Nova senha é obrigatória",
                    minLength: {
                      value: 6,
                      message: "Senha deve ter no mínimo 6 caracteres",
                    },
                  })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility("new")}
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordErrors.new_password && (
                <p className="text-sm text-destructive">
                  {passwordErrors.new_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showPasswords.confirm ? "text" : "password"}
                  placeholder="Confirme sua nova senha"
                  {...registerPassword("confirm_password", {
                    required: "Confirmação de senha é obrigatória",
                    validate: (value) =>
                      value === watchNewPassword || "As senhas não coincidem",
                  })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility("confirm")}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordErrors.confirm_password && (
                <p className="text-sm text-destructive">
                  {passwordErrors.confirm_password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="gradient-primary text-white"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Alterando...
                </>
              ) : (
                "Alterar Senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="gradient-card border-0 shadow-soft border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Ações irreversíveis relacionadas à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Excluir Conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">
                  Excluir Conta Permanentemente
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    <p>
                      Esta ação é <strong>irreversível</strong>. Todos os seus
                      dados serão permanentemente excluídos, incluindo:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Todas as suas arrecadações</li>
                      <li>Histórico de contribuições</li>
                      <li>Dados pessoais e bancários</li>
                      <li>Configurações da conta</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Qualquer saldo disponível será transferido para a conta
                      bancária selecionada.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <form
                onSubmit={handleDeleteSubmit(onDeleteAccount)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="bank_account_id">
                    Conta para Receber Saldo Restante
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      setDeleteValue("bank_account_id", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma conta bancária" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {deleteErrors.bank_account_id && (
                    <p className="text-sm text-destructive">
                      {deleteErrors.bank_account_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete_password">Confirme sua Senha</Label>
                  <div className="relative">
                    <Input
                      id="delete_password"
                      type={showPasswords.delete ? "text" : "password"}
                      placeholder="Digite sua senha para confirmar"
                      {...registerDelete("password", {
                        required: "Senha é obrigatória para excluir a conta",
                      })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility("delete")}
                    >
                      {showPasswords.delete ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {deleteErrors.password && (
                    <p className="text-sm text-destructive">
                      {deleteErrors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmation">
                    Digite "EXCLUIR CONTA" para confirmar
                  </Label>
                  <Input
                    id="confirmation"
                    placeholder="EXCLUIR CONTA"
                    {...registerDelete("confirmation", {
                      required:
                        "Você deve confirmar digitando exatamente 'EXCLUIR CONTA'",
                      validate: (value) =>
                        value === "EXCLUIR CONTA" ||
                        "Digite exatamente 'EXCLUIR CONTA' para confirmar",
                    })}
                  />
                  {deleteErrors.confirmation && (
                    <p className="text-sm text-destructive">
                      {deleteErrors.confirmation.message}
                    </p>
                  )}
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    type="submit"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={
                      isDeletingAccount || watchConfirmation !== "EXCLUIR CONTA"
                    }
                  >
                    {isDeletingAccount ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Excluindo...
                      </>
                    ) : (
                      "Excluir Conta Permanentemente"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};
