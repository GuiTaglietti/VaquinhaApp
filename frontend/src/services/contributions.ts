import api from "@/lib/api";
import { Contribution, CreateContributionRequest } from "@/types";

export type CreateContributionResponse = {
  payment_intent_id: string;     // txid
  pix_copia_e_cola?: string;     // BR Code (copia e cola)
  brcode?: string;               // alias do pix_copia_e_cola se vier assim
};

export const contributionsService = {
  async create(
    fundraiserId: string,
    data: CreateContributionRequest
  ): Promise<CreateContributionResponse> {
    const response = await api.post(
      `/fundraisers/${fundraiserId}/contributions`,
      data
    );
    return response.data as CreateContributionResponse;
  },

  // mantém compat com chamadas antigas, mas aponta pro mesmo método
  async createContribution(
    fundraiserId: string,
    data: CreateContributionRequest
  ): Promise<CreateContributionResponse> {
    return this.create(fundraiserId, data);
  },

  async getMine(): Promise<Contribution[]> {
    const response = await api.get("/contributions/mine");
    return response.data;
  },
};
