import { useState, useEffect } from "react";
import { FileText, Download, Calendar, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { invoicesService } from "@/services/public-reports";
import { InvoiceData } from "@/types";
import { toast } from "react-hot-toast";

const ADMIN_BACKEND_PUBLIC =
  (import.meta.env.VITE_ADMIN_BACKEND_PUBLIC as string) ||
  "http://localhost:6090";

function absolutize(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${ADMIN_BACKEND_PUBLIC.replace(/\/+$/, "")}/${url.replace(
    /^\/+/,
    ""
  )}`;
}

export const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const data = await invoicesService.getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error("Error loading invoices:", error);
      toast.error("Erro ao carregar notas fiscais");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(amount || 0));

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));

  const handleDownloadPDF = async (invoice: InvoiceData) => {
    try {
      const res = await invoicesService.downloadInvoice(invoice.id);
      const blob: Blob =
        res.data instanceof Blob ? res.data : await res.blob?.();

      if (!blob) throw new Error("Falha ao gerar PDF");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nota-fiscal-${invoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível baixar o PDF desta nota fiscal.");
    }
  };
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0);
  const totalTaxes = invoices.reduce((sum, i) => sum + i.tax_amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notas Fiscais</h1>
        <p className="text-muted-foreground">
          Acompanhe todas as notas fiscais geradas dos seus saques
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="gradient-card border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Notas
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">
              notas fiscais emitidas
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalInvoiced)}
            </div>
            <p className="text-xs text-muted-foreground">valor bruto total</p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total em Taxas
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalTaxes)}
            </div>
            <p className="text-xs text-muted-foreground">
              taxas e impostos pagos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card className="gradient-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle>Histórico de Notas Fiscais</CardTitle>
          <CardDescription>
            Todas as notas fiscais geradas automaticamente para seus saques
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhuma nota fiscal encontrada
              </h3>
              <p className="text-muted-foreground">
                As notas fiscais aparecerão aqui após você realizar saques das
                suas arrecadações.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-medium">
                          Nota Fiscal #{invoice.id.slice(-8).toUpperCase()}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {invoice.fundraiser.title}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Valor Bruto:
                        </span>
                        <div className="font-medium">
                          {formatCurrency(invoice.amount)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Taxas:</span>
                        <div className="font-medium">
                          {formatCurrency(invoice.tax_amount)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Valor Líquido:
                        </span>
                        <div className="font-medium text-primary">
                          {formatCurrency(invoice.amount - invoice.tax_amount)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Data de Emissão:
                        </span>
                        <div className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(invoice.issued_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(invoice)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
