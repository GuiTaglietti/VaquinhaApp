import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Save,
  Eye,
  Upload,
  Link2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Progress } from "@/components/ui/progress";
import { fundraisersService } from "@/services/fundraisers";
import { uploadsService } from "@/services/uploads";
import {
  CreateFundraiserRequest,
  UpdateFundraiserRequest,
  BRAZILIAN_STATES,
} from "@/types";
import { toast } from "react-hot-toast";

interface FormData extends CreateFundraiserRequest {
  image_type: "upload" | "url";
  age_confirmation: boolean;
  terms_accepted: boolean;
}

export const FundraiserFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(isEditing);
  const [imageType, setImageType] = useState<"upload" | "url">("url");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<FormData>();

  const watchIsPublic = watch("is_public");
  const watchAgeConfirmation = watch("age_confirmation");
  const watchTermsAccepted = watch("terms_accepted");
  const coverImageUrl = watch("cover_image_url");

  const setCoverUrl = (url: string) =>
    setValue("cover_image_url", url, { shouldValidate: true });

  useEffect(() => {
    if (isEditing && id) {
      fetchFundraiser();
    }
  }, [id, isEditing]);

  const fetchFundraiser = async () => {
    try {
      setIsLoadingData(true);
      const fundraiser = await fundraisersService.getById(id!);

      reset({
        title: fundraiser.title,
        description: fundraiser.description || "",
        goal_amount: fundraiser.goal_amount,
        city: fundraiser.city || "",
        state: fundraiser.state || "",
        cover_image_url: fundraiser.cover_image_url || "",
        is_public: fundraiser.is_public,
      });
    } catch (error) {
      console.error("Error fetching fundraiser:", error);
      toast.error("Erro ao carregar dados da arrecadação");
      navigate("/app/fundraisers");
    } finally {
      setIsLoadingData(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);

      const {
        image_type,
        age_confirmation,
        terms_accepted,
        ...fundraiserData
      } = data;

      if (isEditing) {
        await fundraisersService.update(
          id!,
          fundraiserData as UpdateFundraiserRequest
        );
        toast.success("Arrecadação atualizada com sucesso!");
      } else {
        const result = await fundraisersService.create(fundraiserData);
        toast.success("Arrecadação criada com sucesso!");

        if (result.public_slug && fundraiserData.is_public) {
          toast.success("Link público gerado automaticamente!");
        }
      }

      navigate("/app/fundraisers");
    } catch (error) {
      console.error("Error saving fundraiser:", error);
      toast.error(
        isEditing
          ? "Erro ao atualizar arrecadação"
          : "Erro ao criar arrecadação"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/app/fundraisers")}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? "Editar Arrecadação" : "Nova Arrecadação"}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Título da Arrecadação{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Ex: Ajude Maria a realizar seu sonho"
                    {...register("title", {
                      required: "Título é obrigatório",
                      minLength: {
                        value: 5,
                        message: "Título deve ter no mínimo 5 caracteres",
                      },
                    })}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* Meta */}
                <div className="space-y-2">
                  <Label htmlFor="goal_amount">
                    Meta de Arrecadação (R$){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="goal_amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="1000.00"
                    {...register("goal_amount", {
                      required: "Meta é obrigatória",
                      min: {
                        value: 1,
                        message: "Meta deve ser maior que R$ 0,00",
                      },
                      valueAsNumber: true,
                    })}
                  />
                  {errors.goal_amount && (
                    <p className="text-sm text-destructive">
                      {errors.goal_amount.message}
                    </p>
                  )}
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Conte a história da sua arrecadação, explique o motivo e como o dinheiro será usado..."
                    className="min-h-32"
                    {...register("description")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Uma boa descrição ajuda a conquistar mais doadores
                  </p>
                </div>

                {/* Imagem */}
                <div className="space-y-4">
                  <Label>Imagem de Capa</Label>

                  {/* Botões de seleção */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={imageType === "url" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setImageType("url")}
                      className="flex items-center gap-2"
                    >
                      <Link2 className="h-4 w-4" />
                      URL da Imagem
                    </Button>
                    <Button
                      type="button"
                      variant={imageType === "upload" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setImageType("upload")}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Fazer Upload
                    </Button>
                  </div>

                  {/* URL ou Upload */}
                  {imageType === "url" ? (
                    <div className="space-y-2">
                      <Input
                        id="cover_image_url"
                        type="url"
                        placeholder="https://exemplo.com/imagem.jpg"
                        {...register("cover_image_url")}
                      />
                      {coverImageUrl ? (
                        <div className="mt-2">
                          <img
                            src={coverImageUrl}
                            alt="Pré-visualização"
                            className="w-full max-h-60 object-cover rounded-lg border"
                          />
                        </div>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Cole a URL de uma imagem que represente bem sua causa
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Clique para selecionar ou arraste uma imagem
                        </p>
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="image-upload"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            const maxMB = 5;
                            if (file.size > maxMB * 1024 * 1024) {
                              toast.error(`Arquivo acima de ${maxMB}MB`);
                              return;
                            }
                            const okTypes = [
                              "image/jpeg",
                              "image/png",
                              "image/gif",
                              "image/webp",
                            ];
                            if (!okTypes.includes(file.type)) {
                              toast.error("Tipo de arquivo não suportado");
                              return;
                            }

                            try {
                              setUploading(true);
                              setUploadPct(0);
                              const res = await uploadsService.uploadImage(
                                file,
                                (pct) => setUploadPct(pct)
                              );
                              setCoverUrl(res.url);
                              toast.success("Imagem enviada com sucesso!");
                            } catch (err: any) {
                              console.error(err);
                              toast.error(
                                err?.response?.data?.error || "Falha no upload"
                              );
                            } finally {
                              setUploading(false);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("image-upload")?.click()
                          }
                          disabled={uploading}
                        >
                          Selecionar Arquivo
                        </Button>

                        {uploading ? (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Enviando... {uploadPct}%
                            </p>
                            <Progress value={uploadPct} />
                          </div>
                        ) : null}
                      </div>

                      {coverImageUrl ? (
                        <div className="mt-2">
                          <img
                            src={coverImageUrl}
                            alt="Pré-visualização"
                            className="w-full max-h-60 object-cover rounded-lg border"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Formatos aceitos: JPG, PNG, GIF, WEBP (máx. 5MB)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Localização */}
            <Card className="gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Localização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="Ex: São Paulo"
                      {...register("city")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select
                      value={watch("state")}
                      onValueChange={(value) => setValue("state", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_public">Arrecadação Pública</Label>
                    <p className="text-xs text-muted-foreground">
                      Permite que qualquer pessoa encontre e contribua
                    </p>
                  </div>
                  <Switch
                    id="is_public"
                    {...register("is_public")}
                    onCheckedChange={(checked) =>
                      setValue("is_public", checked)
                    }
                  />
                </div>

                {watchIsPublic && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm text-primary">
                      <Eye className="inline w-4 h-4 mr-1" />
                      Sua arrecadação será visível para todos e terá um link
                      público
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Termos e confirmações */}
            {!isEditing && (
              <Card className="gradient-card border-0 shadow-soft">
                <CardHeader>
                  <CardTitle>Confirmações Obrigatórias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="age_confirmation"
                      checked={watchAgeConfirmation}
                      onCheckedChange={(checked) =>
                        setValue("age_confirmation", !!checked)
                      }
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="age_confirmation"
                        className="text-sm font-medium"
                      >
                        Confirmação de Idade
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Confirmo que sou maior de 18 anos e tenho capacidade
                        legal para criar esta arrecadação
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms_accepted"
                      checked={watchTermsAccepted}
                      onCheckedChange={(checked) =>
                        setValue("terms_accepted", !!checked)
                      }
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="terms_accepted"
                        className="text-sm font-medium"
                      >
                        Termos e Condições
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Li e aceito os{" "}
                        <span className="text-primary cursor-pointer hover:underline">
                          termos de uso
                        </span>
                        , a{" "}
                        <span className="text-primary cursor-pointer hover:underline">
                          política de privacidade
                        </span>{" "}
                        e estou ciente das{" "}
                        <span className="text-primary cursor-pointer hover:underline">
                          taxas aplicáveis
                        </span>
                      </p>
                    </div>
                  </div>

                  {(!watchAgeConfirmation || !watchTermsAccepted) && (
                    <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                      <p className="text-sm text-warning-foreground">
                        <AlertTriangle className="inline w-4 h-4 mr-1" />É
                        necessário confirmar todos os itens acima para criar a
                        arrecadação
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ações */}
            <Card className="gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="submit"
                  className="w-full gradient-primary text-white shadow-medium hover:shadow-strong transition-smooth"
                  disabled={
                    isLoading ||
                    (!isEditing &&
                      (!watchAgeConfirmation || !watchTermsAccepted))
                  }
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {isEditing ? "Atualizando..." : "Criando..."}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing
                        ? "Atualizar Arrecadação"
                        : "Criar Arrecadação"}
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/app/fundraisers")}
                >
                  Cancelar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};
