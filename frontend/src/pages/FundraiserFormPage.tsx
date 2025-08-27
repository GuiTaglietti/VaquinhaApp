import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { fundraisersService } from "@/services/fundraisers";
import { CreateFundraiserRequest, UpdateFundraiserRequest, BRAZILIAN_STATES } from "@/types";
import { toast } from "react-hot-toast";

export const FundraiserFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(isEditing);
  
  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<CreateFundraiserRequest>();
  
  const watchIsPublic = watch("is_public");

  useEffect(() => {
    if (isEditing && id) {
      fetchFundraiser();
    }
  }, [id, isEditing]);

  const fetchFundraiser = async () => {
    try {
      setIsLoadingData(true);
      const fundraiser = await fundraisersService.getById(id!);
      
      // Reset form with fundraiser data
      reset({
        title: fundraiser.title,
        description: fundraiser.description || '',
        goal_amount: fundraiser.goal_amount,
        city: fundraiser.city || '',
        state: fundraiser.state || '',
        cover_image_url: fundraiser.cover_image_url || '',
        is_public: fundraiser.is_public
      });
    } catch (error) {
      console.error('Error fetching fundraiser:', error);
      toast.error('Erro ao carregar dados da vaquinha');
      navigate('/app/fundraisers');
    } finally {
      setIsLoadingData(false);
    }
  };

  const onSubmit = async (data: CreateFundraiserRequest) => {
    try {
      setIsLoading(true);
      
      if (isEditing) {
        await fundraisersService.update(id!, data as UpdateFundraiserRequest);
        toast.success('Vaquinha atualizada com sucesso!');
      } else {
        const result = await fundraisersService.create(data);
        toast.success('Vaquinha criada com sucesso!');
        
        if (result.public_slug && data.is_public) {
          toast.success('Link público gerado automaticamente!');
        }
      }
      
      navigate('/app/fundraisers');
    } catch (error) {
      console.error('Error saving fundraiser:', error);
      toast.error(isEditing ? 'Erro ao atualizar vaquinha' : 'Erro ao criar vaquinha');
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
          onClick={() => navigate('/app/fundraisers')}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? 'Editar Vaquinha' : 'Nova Vaquinha'}
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
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Título da Vaquinha <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Ex: Ajude Maria a realizar seu sonho"
                    {...register("title", {
                      required: "Título é obrigatório",
                      minLength: {
                        value: 5,
                        message: "Título deve ter no mínimo 5 caracteres"
                      }
                    })}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal_amount">
                    Meta de Arrecadação (R$) <span className="text-destructive">*</span>
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
                        message: "Meta deve ser maior que R$ 0,00"
                      },
                      valueAsNumber: true
                    })}
                  />
                  {errors.goal_amount && (
                    <p className="text-sm text-destructive">{errors.goal_amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Conte a história da sua vaquinha, explique o motivo e como o dinheiro será usado..."
                    className="min-h-32"
                    {...register("description")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Uma boa descrição ajuda a conquistar mais doadores
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cover_image_url">URL da Imagem de Capa</Label>
                  <Input
                    id="cover_image_url"
                    type="url"
                    placeholder="https://exemplo.com/imagem.jpg"
                    {...register("cover_image_url")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use uma imagem que represente bem sua causa
                  </p>
                </div>
              </CardContent>
            </Card>

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
                    <Select onValueChange={(value) => setValue("state", value)}>
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
                    <Label htmlFor="is_public">Vaquinha Pública</Label>
                    <p className="text-xs text-muted-foreground">
                      Permite que qualquer pessoa encontre e contribua
                    </p>
                  </div>
                  <Switch
                    id="is_public"
                    {...register("is_public")}
                    onCheckedChange={(checked) => setValue("is_public", checked)}
                  />
                </div>

                {watchIsPublic && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm text-primary">
                      <Eye className="inline w-4 h-4 mr-1" />
                      Sua vaquinha será visível para todos e terá um link público
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview/Actions */}
            <Card className="gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full gradient-primary text-white shadow-medium hover:shadow-strong transition-smooth"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {isEditing ? 'Atualizando...' : 'Criando...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing ? 'Atualizar Vaquinha' : 'Criar Vaquinha'}
                    </>
                  )}
                </Button>
                
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/app/fundraisers')}
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