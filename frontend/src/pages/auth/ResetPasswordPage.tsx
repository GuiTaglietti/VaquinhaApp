import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Heart, Lock } from "lucide-react";
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
import { ResetPasswordRequest } from "@/types";
import { toast } from "react-hot-toast";
import heroImage from "@/assets/hero-image.jpeg";

interface ResetForm {
  password: string;
  confirmPassword: string;
}

export const ResetPasswordPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetForm>();
  const watchPassword = watch("password");

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
      toast.error("Token inválido");
      return;
    }

    try {
      setIsLoading(true);
      await authService.resetPassword({
        token,
        password: data.password,
      });
      toast.success("Senha redefinida com sucesso!");
      navigate("/auth/login");
    } catch (error) {
      console.error("Reset password failed:", error);
      toast.error("Erro ao redefinir senha. Token pode ter expirado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:flex-1 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="relative flex flex-col justify-center items-center text-white p-12">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="h-7 w-7 flex items-center justify-center">
                <img src="/favicon.ico" alt="Logo" className="h-4 w-4" />
              </div>
              <h1 className="text-3xl font-bold">Velório Solidário</h1>
            </div>
            <p className="text-lg opacity-90 max-w-md">
              Defina uma nova senha segura para sua conta e continue fazendo a
              diferença.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Reset Password Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 bg-background">
        <div className="mx-auto w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="h-7 w-7 flex items-center justify-center">
                <img src="/favicon.ico" alt="Logo" className="h-4 w-4" />
              </div>
              <h1 className="text-2xl font-bold">Velório Solidário</h1>
            </div>
          </div>

          <Card className="gradient-card border-0 shadow-medium">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Nova Senha
              </CardTitle>
              <CardDescription className="text-center">
                Digite sua nova senha para redefinir o acesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua nova senha"
                      {...register("password", {
                        required: "Senha é obrigatória",
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
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirme sua nova senha"
                    {...register("confirmPassword", {
                      required: "Confirmação de senha é obrigatória",
                      validate: (value) =>
                        value === watchPassword || "As senhas não coincidem",
                    })}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-primary text-white shadow-medium hover:shadow-strong transition-smooth"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Redefinindo...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Redefinir Senha
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <Link
                  to="/auth/login"
                  className="text-sm text-primary font-medium hover:text-primary-light transition-fast"
                >
                  Voltar ao Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
