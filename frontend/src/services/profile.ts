import api from "@/lib/api";
import {
  UserProfile,
  UpdateProfileRequest,
  BankAccount,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
} from "@/types/profile";

function compactPix<
  T extends { pix_key?: string | null; pix_key_type?: string | null }
>(x: T): T {
  const hasKey = !!x.pix_key && String(x.pix_key).trim() !== "";
  const hasType = !!x.pix_key_type && String(x.pix_key_type).trim() !== "";
  if (hasKey !== hasType) {
    delete (x as any).pix_key;
    delete (x as any).pix_key_type;
  }
  return x;
}

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    const response = await api.get("/profile");
    return response.data;
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await api.patch("/profile", data);
    return response.data;
  },

  async getBankAccounts(): Promise<BankAccount[]> {
    const response = await api.get("/profile/bank-accounts");
    return response.data;
  },

  async createBankAccount(
    data: CreateBankAccountRequest
  ): Promise<BankAccount> {
    const response = await api.post(
      "/profile/bank-accounts",
      compactPix({ ...data })
    );
    return response.data;
  },

  async updateBankAccount(
    id: string,
    data: UpdateBankAccountRequest
  ): Promise<BankAccount> {
    const response = await api.patch(
      `/profile/bank-accounts/${id}`,
      compactPix({ ...data })
    );
    return response.data;
  },

  async deleteBankAccount(id: string): Promise<void> {
    await api.delete(`/profile/bank-accounts/${id}`);
  },

  async setDefaultBankAccount(id: string): Promise<void> {
    await api.post(`/profile/bank-accounts/${id}/set-default`);
  },
};
