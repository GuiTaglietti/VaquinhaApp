import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowLeft, Heart, Mail } from "lucide-react";
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
import { ForgotPasswordRequest } from "@/types";
import { toast } from "react-hot-toast";
import heroImage from "@/assets/hero-image.jpeg";

export const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordRequest>();

  const onSubmit = async (data: ForgotPasswordRequest) => {
    try {
      setIsLoading(true);
      await authService.forgotPassword(data);
      setEmailSent(true);
      toast.success("E-mail de recuperação enviado!");
    } catch (error) {
      console.error("Forgot password failed:", error);
      toast.error("Erro ao enviar e-mail. Verifique o endereço informado.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex">
        {/* Left side - Hero */}
        <div className="hidden lg:flex lg:flex-1 relative">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 gradient-hero opacity-90" />
        </div>

        {/* Right side - Success Message */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 bg-background">
          <div className="mx-auto w-full max-w-sm">
            <Card className="gradient-card border-0 shadow-medium">
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">
                  E-mail Enviado!
                </CardTitle>
                <CardDescription className="text-center">
                  Enviamos um link de recuperação para seu e-mail. Verifique sua
                  caixa de entrada e spam.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full" variant="outline">
                  <Link to="/auth/login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar ao Login
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:flex-1 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 gradient-hero opacity-90" />
      </div>

      {/* Right side - Forgot Password Form */}
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
                Recuperar Senha
              </CardTitle>
              <CardDescription className="text-center">
                Digite seu e-mail para receber o link de recuperação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    {...register("email", {
                      required: "E-mail é obrigatório",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "E-mail inválido",
                      },
                    })}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
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
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar Link de Recuperação
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <Link
                  to="/auth/login"
                  className="text-sm text-primary font-medium hover:text-primary-light transition-fast inline-flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
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
