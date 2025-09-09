import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Search, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { exploreService } from "@/services/explore";
import { PublicFundraiserListItem } from "@/types";
import heroImage from "@/assets/hero-image.jpeg";

export const PublicHomePage = () => {
  const [fundraisers, setFundraisers] = useState<PublicFundraiserListItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadFeaturedFundraisers();
  }, []);

  const loadFeaturedFundraisers = async () => {
    try {
      setIsLoading(true);
      const response = await exploreService.getPublicFundraisers({ limit: 6 });
      setFundraisers(response.fundraisers);
    } catch (error) {
      console.error("Error loading fundraisers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    navigate(`/explore?search=${encodeURIComponent(searchQuery)}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 flex items-center justify-center">
              <img src="/favicon.ico" alt="Logo" className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold">Velório Solidário</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/auth/login">Entrar</Link>
            </Button>
            <Button className="gradient-primary text-white" asChild>
              <Link to="/auth/register">Criar Conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 gradient-hero opacity-90" />

        <div className="relative container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
            Transforme sonhos em{" "}
            <span className="gradient-text">realidade</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
            Conecte corações, realize projetos e faça a diferença. Milhares de
            pessoas já realizaram seus objetivos através da solidariedade.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-8">
            <div className="flex-1">
              <Input
                placeholder="Buscar arrecadações..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="h-12"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="gradient-primary text-white h-12 px-6"
            >
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gradient-primary text-white" asChild>
              <Link to="/auth/register">
                <Sparkles className="h-5 w-5 mr-2" />
                Criar Minha Arrecadação
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              asChild
            >
              <Link to="/explore">
                Explorar Arrecadações
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Fundraisers */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Arrecadações em Destaque
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Conheça algumas das campanhas que estão fazendo a diferença na
              vida das pessoas
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {fundraisers.map((fundraiser) => (
                <Card
                  key={fundraiser.id}
                  className="gradient-card border-0 shadow-medium hover:shadow-strong transition-smooth cursor-pointer"
                  onClick={() => navigate(`/p/${fundraiser.public_slug}`)}
                >
                  <CardContent className="p-0">
                    {fundraiser.cover_image_url && (
                      <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                        <img
                          src={fundraiser.cover_image_url}
                          alt={fundraiser.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="p-6">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                        {fundraiser.title}
                      </h3>

                      {fundraiser.description && (
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                          {fundraiser.description}
                        </p>
                      )}

                      {(fundraiser.city || fundraiser.state) && (
                        <p className="text-xs text-muted-foreground mb-4">
                          {fundraiser.city}
                          {fundraiser.city && fundraiser.state && ", "}
                          {fundraiser.state}
                        </p>
                      )}

                      <div className="space-y-3">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 bg-primary rounded-full transition-all duration-300"
                            style={{
                              width: `${getProgressPercentage(
                                fundraiser.current_amount,
                                fundraiser.goal_amount
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-primary">
                            {formatCurrency(fundraiser.current_amount)}
                          </span>
                          <span className="text-muted-foreground">
                            Meta: {formatCurrency(fundraiser.goal_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Button size="lg" variant="outline" asChild>
              <Link to="/explore">
                Ver Todas as Arrecadações
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Crie sua arrecadação em minutos e comece a receber contribuições hoje
            mesmo. É rápido, seguro e gratuito para começar.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth/register">
              <Heart className="h-5 w-5 mr-2" />
              Criar Minha Arrecadação Agora
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-7 w-7 flex items-center justify-center">
              <img src="/favicon.ico" alt="Logo" className="h-4 w-4" />
            </div>
            <span className="font-semibold">Velório Solidário</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Velório Solidário. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};
