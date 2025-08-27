import api from '@/lib/api';
import { UserProfile, UpdateProfileRequest, BankAccount, CreateBankAccountRequest, UpdateBankAccountRequest } from '@/types/profile';

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    const response = await api.get('/profile');
    return response.data;
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await api.patch('/profile', data);
    return response.data;
  },

  async getBankAccounts(): Promise<BankAccount[]> {
    const response = await api.get('/profile/bank-accounts');
    return response.data;
  },

  async createBankAccount(data: CreateBankAccountRequest): Promise<BankAccount> {
    const response = await api.post('/profile/bank-accounts', data);
    return response.data;
  },

  async updateBankAccount(id: string, data: UpdateBankAccountRequest): Promise<BankAccount> {
    const response = await api.patch(`/profile/bank-accounts/${id}`, data);
    return response.data;
  },

  async deleteBankAccount(id: string): Promise<void> {
    await api.delete(`/profile/bank-accounts/${id}`);
  },

  async setDefaultBankAccount(id: string): Promise<void> {
    await api.post(`/profile/bank-accounts/${id}/set-default`);
  }
};