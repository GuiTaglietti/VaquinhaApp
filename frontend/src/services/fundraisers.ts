import api from '@/lib/api';
import { 
  Fundraiser, 
  CreateFundraiserRequest, 
  UpdateFundraiserRequest,
  DashboardStats 
} from '@/types';

export const fundraisersService = {
  async create(data: CreateFundraiserRequest): Promise<{ id: string; public_slug?: string }> {
    const response = await api.post('/fundraisers', data);
    return response.data;
  },

  async getAll(): Promise<Fundraiser[]> {
    const response = await api.get('/fundraisers');
    return response.data;
  },

  async getById(id: string): Promise<Fundraiser> {
    const response = await api.get(`/fundraisers/${id}`);
    return response.data;
  },

  async update(id: string, data: UpdateFundraiserRequest): Promise<Fundraiser> {
    const response = await api.patch(`/fundraisers/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/fundraisers/${id}`);
  },

  async makePublic(id: string): Promise<{ public_slug: string }> {
    const response = await api.post(`/fundraisers/${id}/share/public`);
    return response.data;
  },

  async generateAuditToken(id: string): Promise<{ audit_token: string; expires_at: string }> {
    const response = await api.post(`/fundraisers/${id}/share/audit`);
    return response.data;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    // This endpoint doesn't exist in the spec, so we'll calculate from existing data
    const fundraisers = await this.getAll();
    return {
      total_fundraisers: fundraisers.length,
      total_raised: fundraisers.reduce((sum, f) => sum + f.current_amount, 0),
      total_contributions: 0 // We'll get this from contributions service
    };
  },

  updateStatus: async (
    fundraiserId: string,
    payload: { status: "ACTIVE" | "PAUSED" | "FINISHED"; reason?: string }
  ): Promise<void> => {
    await api.patch(`/fundraisers/${fundraiserId}/status`, payload);
  },
};