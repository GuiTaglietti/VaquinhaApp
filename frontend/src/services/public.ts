import api from '@/lib/api';
import { PublicFundraiserData, AuditData } from '@/types';

export const publicService = {
  async getFundraiserBySlug(slug: string): Promise<PublicFundraiserData> {
    // Remove authorization header for public endpoints
    const response = await api.get(`/p/${slug}`, {
      headers: { Authorization: undefined }
    });
    return response.data;
  },

  async getAuditData(token: string): Promise<AuditData> {
    // Remove authorization header for public endpoints  
    const response = await api.get(`/a/${token}`, {
      headers: { Authorization: undefined }
    });
    return response.data;
  }
};