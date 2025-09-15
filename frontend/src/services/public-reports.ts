import api from "@/lib/api";
import { ReportRequest, InvoiceData } from "@/types";

export const publicReportsService = {
  async reportFundraiser(data: ReportRequest): Promise<void> {
    // Remove authorization header for public reporting
    await api.post("/reports/fundraisers", data, {
      headers: { Authorization: undefined },
    });
  },
};

export const invoicesService = {
  async getInvoices(): Promise<InvoiceData[]> {
    const response = await api.get("/invoices");
    return response.data;
  },

  async downloadInvoice(id: string) {
    return api.get(`/invoices/${id}/download`, { responseType: "blob" });
  },
};
