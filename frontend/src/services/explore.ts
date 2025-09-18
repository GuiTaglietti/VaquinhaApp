import api from "@/lib/api";
import { PublicFundraiserListItem, PublicFundraiserData } from "@/types";

type ExploreListResponse = {
  fundraisers: PublicFundraiserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const exploreService = {
  async getPublicFundraisers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    state?: string;
  }): Promise<ExploreListResponse> {
    const { data } = await api.get<ExploreListResponse>(
      "/explore/fundraisers",
      { params }
    );
    return data;
  },

  async getFundraiserBySlug(slug: string): Promise<PublicFundraiserData> {
    const { data } = await api.get<PublicFundraiserData>(
      `/explore/fundraisers/${slug}`
    );
    return data;
  },
};
