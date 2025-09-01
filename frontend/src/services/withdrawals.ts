import api from "@/lib/api";
import {
  WithdrawalRequest,
  Withdrawal,
  FundraiserStats,
} from "@/types/withdrawals";

export const withdrawalsService = {
  async requestWithdrawal(data: WithdrawalRequest): Promise<Withdrawal> {
    const response = await api.post("/withdrawals", data);
    return response.data;
  },

  async getWithdrawals(): Promise<Withdrawal[]> {
    const response = await api.get("/withdrawals");
    return response.data;
  },

  async getFundraiserStats(id: string): Promise<FundraiserStats> {
    const response = await api.get(`/fundraisers/${id}/stats`);
    return response.data;
  },
};
