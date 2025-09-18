import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { MoneyProgressBar } from "@/components/ui/money-progress-bar";
import { Search, MapPin, Heart, Filter, Globe } from "lucide-react";
import { exploreService } from "@/services/explore";
import { PublicFundraiserListItem, BRAZILIAN_STATES } from "@/types";
import { toast } from "react-hot-toast";

const RAW_PUBLIC =
  (import.meta.env.VITE_PUBLIC_SITE_URL as string) ||
  (import.meta.env.VITE_PUBLIC_FRONTEND_URL as string) ||
  window.location.origin;

const PUBLIC_BASE = (() => {
  try {
    const u = new URL(RAW_PUBLIC, window.location.origin);
    // remove /app do final, se existir
    u.pathname = u.pathname.replace(/\/app\/?$/, "");
    return (u.origin + u.pathname).replace(/\/$/, "");
  } catch {
    return window.location.origin;
  }
})();

const TOKEN_KEYS = (
  (import.meta.env.VITE_AUTH_TOKEN_KEYS as string) ||
  "access,accessToken,access_token,token,jwt,auth,authState"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const ExplorePage = () => {
  const navigate = useNavigate();
  const [fundraisers, setFundraisers] = useState<PublicFundraiserListItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadFundraisers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery, selectedCity, selectedState]);

  const loadFundraisers = async () => {
    try {
      setIsLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCity && { city: selectedCity }),
        ...(selectedState && { state: selectedState }),
      };

      const data = await exploreService.getPublicFundraisers(params);
      setFundraisers(data.fundraisers);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error) {
      console.error("Erro ao carregar arrecadações:", error);
      toast.error("Erro ao carregar arrecadações");
      setFundraisers([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // No Radix Select, não pode usar value=""
  // Usamos "all" como sentinela e convertemos para "" no estado
  const handleStateChange = (value: string) => {
    const next = value === "all" ? "" : value;
    setSelectedState(next);
    setSelectedCity(""); // Reset city when state changes
    setCurrentPage(1);
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCity("");
    setSelectedState("");
    setCurrentPage(1);
  };

  const goToFundraiser = (slug: string) => {
    if (isAuthenticated()) {
      navigate(`/app/explore/${slug}`);
    } else {
      window.location.href = `${PUBLIC_BASE}/p/${slug}`;
    }
  };

  const handleViewFundraiser = (slug: string) => {
    goToFundraiser(slug);
  };

  function findStoredToken(): string | null {
    for (const store of [localStorage, sessionStorage]) {
      for (const key of TOKEN_KEYS) {
        const raw = store.getItem(key);
        if (!raw) continue;
        try {
          const obj = JSON.parse(raw);
          const nested =
            obj?.access_token || obj?.accessToken || obj?.token || obj?.jwt;
          if (typeof nested === "string" && nested) return nested;
        } catch {
          /* não é JSON */
        }
        return raw;
      }
    }

    const cookieStr = typeof document !== "undefined" ? document.cookie : "";
    for (const key of TOKEN_KEYS) {
      const m = cookieStr.match(new RegExp(`(?:^|; )${key}=([^;]+)`));
      if (m?.[1]) return decodeURIComponent(m[1]);
    }
    return null;
  }

  function extractBearer(raw: string): string {
    const t = raw.trim();
    if (/^Bearer\s+/i.test(t)) return t.replace(/^Bearer\s+/i, "").trim();
    return t;
  }

  function parseJwtPayload(token: string): any | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = atob(base64);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function isValidJwt(token: string): boolean {
    const p = parseJwtPayload(token);
    if (!p) return false;
    if (p.sub === "admin") return false;

    const now = Math.floor(Date.now() / 1000);
    if (typeof p.exp !== "number" || p.exp <= now + 30) return false;

    const uuidLike = /^[0-9a-fA-F-]{36}$/;
    if (uuidLike.test(String(p.sub || ""))) return true;
    if (typeof p.email === "string" && p.email.includes("@")) return true;

    return true;
  }

  function isAuthenticated(): boolean {
    const stored = findStoredToken();
    if (!stored) return false;
    const bearer = extractBearer(stored);
    return isValidJwt(bearer);
  }

  const handleContribute = (slug: string) => {
    goToFundraiser(slug);
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

  const selectStateValue = selectedState === "" ? "all" : selectedState;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
          <Globe className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Explorar arrecadações</h1>
          <p className="text-muted-foreground">
            Descubra e contribua com causas importantes
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
          <CardDescription>
            Encontre arrecadações por categoria, localização e muito mais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar por título</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o título da arrecadação..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={selectStateValue}
                onValueChange={handleStateChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os estados" />
                </SelectTrigger>
                <SelectContent>
                  {/* valor sentinela 'all' em vez de string vazia */}
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <Input
                placeholder="Digite a cidade..."
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={!selectedState}
              />
            </div>

            <div className="flex items-end space-y-2">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      ) : fundraisers.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nenhuma arrecadação encontrada"
          description="Não encontramos arrecadações com os filtros aplicados. Tente ajustar os filtros ou criar uma nova arrecadação."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Encontradas {total} arrecadações
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fundraisers.map((fundraiser) => (
              <Card
                key={fundraiser.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                <div
                  onClick={() => handleViewFundraiser(fundraiser.public_slug)}
                >
                  {fundraiser.cover_image_url && (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img
                        src={fundraiser.cover_image_url}
                        alt={fundraiser.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold line-clamp-2 flex items-center gap-2">
                          {fundraiser.title}
                          {fundraiser.status === "finished" && (
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              Encerrada
                            </span>
                          )}
                        </h3>

                        {fundraiser.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {fundraiser.description}
                          </p>
                        )}
                      </div>

                      {(fundraiser.city || fundraiser.state) && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {fundraiser.city && fundraiser.state
                              ? `${fundraiser.city}, ${fundraiser.state}`
                              : fundraiser.city || fundraiser.state}
                          </span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <MoneyProgressBar
                          current={fundraiser.current_amount}
                          goal={fundraiser.goal_amount}
                        />

                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-primary">
                            {formatCurrency(fundraiser.current_amount)}
                          </span>
                          <span className="text-muted-foreground">
                            Meta: {formatCurrency(fundraiser.goal_amount)}
                          </span>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {getProgressPercentage(
                            fundraiser.current_amount,
                            fundraiser.goal_amount
                          ).toFixed(1)}
                          % arrecadado
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-6 pt-0">
                  <Button
                    className="w-full"
                    disabled={!fundraiser.can_contribute}
                    onClick={() => handleContribute(fundraiser.public_slug)}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    {fundraiser.can_contribute
                      ? "Contribuir"
                      : "Contribuições encerradas"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Anterior
              </Button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <Button
                      key={pageNumber}
                      variant={
                        currentPage === pageNumber ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
