import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  Search,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { exploreService } from "@/services/explore";
import { PublicFundraiserListItem } from "@/types";
import { LegalDialog } from "@/components/ui/legal-dialog";
import type { LegalDocKey } from "@/services/legal";

// =================== CONFIG DO CARROSSEL ===================
const HERO_IMAGES = ["/banner 1.png", "/banner 2.png", "/banner 3.png", "/banner 4.png"];
const AUTOPLAY_MS = 9000;

export const PublicHomePage = () => {
  const [fundraisers, setFundraisers] = useState<PublicFundraiserListItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAllFaq, setShowAllFaq] = useState(false);

  // Dialog legal (Termos/Privacidade)
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocKey | null>(null);
  const openLegal = (doc: LegalDocKey) => {
    setLegalDoc(doc);
    setLegalOpen(true);
  };

  const navigate = useNavigate();

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    loadFeaturedFundraisers();
  }, []);

  useEffect(() => {
    if (HERO_IMAGES.length <= 1) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % HERO_IMAGES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, []);

  const goPrev = () =>
    setActiveIdx((i) => (i - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);
  const goNext = () => setActiveIdx((i) => (i + 1) % HERO_IMAGES.length);

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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);

  const getProgressPercentage = (current: number, goal: number) =>
    Math.min((current / goal) * 100, 100);

  // =================== FAQ ===================
  const FAQ = useMemo(
    () => [
      {
        q: "O que é o Velório Solidário?",
        a: "Plataforma para arrecadar doações de forma simples, segura e transparente para custear despesas de velórios e homenagens.",
      },
      {
        q: "Criar uma campanha tem algum custo?",
        a: "Não. Criar campanhas é totalmente gratuito.",
      },
      {
        q: "Quais são as taxas?",
        a: (
          <div className="space-y-1">
            <p>Para manter a plataforma segura, cobramos:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>4,99% sobre cada valor arrecadado (manutenção);</li>
              <li>R$ 0,49 por doação (taxa fixa);</li>
              <li>R$ 4,50 por saque solicitado;</li>
              <li>Doação mínima: R$ 20,00.</li>
            </ul>
          </div>
        ),
      },
      {
        q: "Em quanto tempo recebo?",
        a: "Após validação da doação, o valor fica disponível para saque em até 3 dias úteis.",
      },
      {
        q: "Quem pode criar campanha?",
        a: "Maiores de 18 anos, com dados corretos e conta bancária em seu nome.",
      },
      // Itens extras (aparecem ao expandir)
      {
        q: "Preciso comprovar dados?",
        a: "Sim. Podemos solicitar documentos antes da liberação dos valores arrecadados.",
      },
      {
        q: "Como funciona o saque?",
        a: "Você solicita pelo painel; transferência em até 3 dias úteis.",
      },
      {
        q: "O que não é permitido?",
        a: (
          <ul className="list-disc pl-5 space-y-1">
            <li>Campanhas falsas/ilícitas;</li>
            <li>Usar dados de terceiros sem autorização;</li>
            <li>Desrespeitar a dignidade humana.</li>
          </ul>
        ),
      },
      {
        q: "Quem garante uso correto do dinheiro?",
        a: "A responsabilidade é do criador da campanha; a plataforma apenas intermedia arrecadação e repasse.",
      },
      {
        q: "É seguro doar?",
        a: "Sim. Estrutura com segurança bancária e análise antifraude.",
      },
      {
        q: "Posso doar de forma anônima?",
        a: "Sim. O valor aparece, mas o nome do doador não é exibido.",
      },
      {
        q: "E se a campanha não bater a meta?",
        a: "As doações continuam disponíveis ao beneficiário, respeitando análise e prazos.",
      },
      {
        q: "Posso encerrar a campanha quando quiser?",
        a: "Sim. As doações recebidas seguem disponíveis para saque conforme os Termos de Uso.",
      },
      {
        q: "Como denunciar uma campanha?",
        a: "Qualquer pessoa pode denunciar; nossa equipe antifraude analisa e pode suspender/excluir.",
      },
      {
        q: "E se o criador falecer?",
        a: "Saldo pode ir a familiar direto mediante comprovação; na ausência, aguarda decisão judicial; como última hipótese, destina-se ao Fundo Solidário.",
      },
      {
        q: "Funerária pode criar campanha?",
        a: "Sim, com autorização expressa da família; valores usados para quitar serviços com transparência.",
      },
      {
        q: "Posso criar campanha em nome de falecido?",
        a: "Sim, com autorização expressa da família. A responsabilidade é do criador.",
      },
    ],
    []
  );

  const FAQ_TOP = FAQ.slice(0, 5);
  const faqToRender = showAllFaq ? FAQ : FAQ_TOP;

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

          {/* Nav que faz scroll */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition"
              onClick={() => scrollToId("inicio")}
            >
              Início
            </button>
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition"
              onClick={() => scrollToId("destaques")}
            >
              Campanhas
            </button>
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition"
              onClick={() => scrollToId("faq")}
            >
              FAQ
            </button>
            <Link
              to="/explore"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Explorar
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/auth/login">Entrar</Link>
            </Button>
            <Button className="gradient-primary text-white" asChild>
              <Link to="/auth/register">Criar Conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO: Carrossel (apenas imagens) */}
      <section
        id="inicio"
        className="relative h-[70vh] min-h-[480px] w-full overflow-hidden"
      >
        {HERO_IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`Destaque ${i + 1}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              i === activeIdx ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* Controles do carrossel */}
        {HERO_IMAGES.length > 1 && (
          <>
            <button
              aria-label="Anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/70 hover:bg-white p-2 shadow"
              onClick={goPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Próximo"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/70 hover:bg-white p-2 shadow"
              onClick={goNext}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Indicadores */}
        {HERO_IMAGES.length > 1 && (
          <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2">
            {HERO_IMAGES.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full border border-white/70 ${
                  i === activeIdx ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Seção abaixo do carrossel: Título, busca e CTAs */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4">
            <img
              src="/favicon.ico"
              alt="Logo Velório Solidário"
              className="mx-auto h-8 w-8 opacity-90"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-3">
            Velório Solidário:{" "}
            <span className="gradient-text">apoio que conforta</span>,
            solidariedade que acolhe
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Ajude famílias em momentos delicados, oferecendo apoio e dignidade
            na despedida.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center max-w-xl mx-auto">
            <div className="flex-1">
              <Input
                placeholder="Buscar arrecadações..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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

          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gradient-primary text-white" asChild>
              <Link to="/auth/register">
                <Sparkles className="h-5 w-5 mr-2" />
                Criar Minha Arrecadação
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/explore">
                Explorar Arrecadações
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Campanhas em destaque */}
      <section id="destaques" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Campanhas em destaque
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Conheça campanhas que estão levando apoio e conforto a famílias em
              momentos delicados.
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

      {/* FAQ */}
      <section id="faq" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Dúvidas Frequentes
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              As principais respostas sobre como funciona a plataforma.
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {faqToRender.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAllFaq((v) => !v)}
              >
                {showAllFaq ? "Ver menos" : "Ver mais"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="py-16 gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Crie sua arrecadação em minutos e comece a receber contribuições
            hoje mesmo. É rápido, seguro e gratuito para começar.
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
      <footer id="contato" className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
          {/* Marca / Tagline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/favicon.ico" alt="Logo" className="h-5 w-5" />
              <span className="font-semibold">Velório Solidário</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Velório Solidário: apoio que conforta, solidariedade que acolhe!
            </p>
            <a
              href="https://instagram.com/veloriosolidario"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm hover:underline mt-2"
              aria-label="Instagram Velório Solidário"
            >
              <Instagram className="h-4 w-4" />
              @veloriosolidario
            </a>
          </div>

          {/* Navegação */}
          <div>
            <h4 className="font-semibold mb-3">Navegação</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  className="hover:underline"
                  onClick={() => scrollToId("inicio")}
                >
                  Início
                </button>
              </li>
              <li>
                <button
                  className="hover:underline"
                  onClick={() => scrollToId("destaques")}
                >
                  Campanhas
                </button>
              </li>
              <li>
                <button
                  className="hover:underline"
                  onClick={() => scrollToId("faq")}
                >
                  FAQ
                </button>
              </li>
              <li>
                <Link to="/auth/login" className="hover:underline">
                  Entrar
                </Link>
              </li>
              <li>
                <Link to="/auth/register" className="hover:underline">
                  Criar conta
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-semibold mb-3">Contato</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:suporte@veloriosolidario.com.br"
                  className="hover:underline"
                >
                  suporte@veloriosolidario.com.br
                </a>
              </li>
              <li>De segunda a sexta, das 9h às 18h.</li>
            </ul>
          </div>

          {/* Institucional / Políticas (abre em Dialog) */}
          <div>
            <h4 className="font-semibold mb-3">Institucional</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <strong>Duke Soluções Financeiras Ltda.</strong>
              </li>
              <li>CNPJ: 42.735.849/0001-53</li>
              <li>Sarandi – RS</li>
              <li>
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => openLegal("terms")}
                >
                  Termos de Uso
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => openLegal("privacy")}
                >
                  Política de Privacidade
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Velório Solidário. Todos os direitos
            reservados.
          </div>
        </div>
      </footer>

      {/* Dialog legal compartilhado */}
      <LegalDialog
        open={legalOpen}
        onOpenChange={setLegalOpen}
        doc={legalDoc}
      />
    </div>
  );
};
