import api from "@/lib/api";
import { Contribution, CreateContributionRequest } from "@/types";

export const contributionsService = {
  async create(
    fundraiserId: string,
    data: CreateContributionRequest
  ): Promise<{ payment_intent_id: string }> {
    const response = await api.post(
      `/fundraisers/${fundraiserId}/contributions`,
      data
    );
    return response.data;
  },

  async createContribution(
    fundraiserId: string,
    data: CreateContributionRequest
  ): Promise<{ payment_intent_id: string }> {
    const response = await api.post(
      `/fundraisers/${fundraiserId}/contributions`,
      data
    );
    return response.data;
  },

  async getMine(): Promise<Contribution[]> {
    const response = await api.get("/contributions/mine");
    return response.data;
  },
};
