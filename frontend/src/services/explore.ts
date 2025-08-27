import api from "@/lib/api";
import { PublicFundraiserListItem, PublicFundraiserData } from "@/types";

export const exploreService = {
  async getPublicFundraisers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    state?: string;
  }): Promise<{
    fundraisers: PublicFundraiserListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await api.get("/explore/fundraisers", { params });
    return response.data;
  },

  async getFundraiserBySlug(slug: string): Promise<PublicFundraiserData> {
    const response = await api.get(`/explore/fundraisers/${slug}`);
    return response.data;
  },
};
