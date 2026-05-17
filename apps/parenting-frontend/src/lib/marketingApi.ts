import { api } from './api.js';

export interface MarketingLead {
  id: string;
  email: string;
  resourceId: string;
  metadata: any;
  status: 'pending' | 'delivered' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface GetLeadsResponse {
  leads: MarketingLead[];
  total: number;
}

export const marketingApi = {
  getLeads: async (params: { limit?: number; offset?: number; email?: string; resourceId?: string }) => {
    const res = await api.get('/api/marketing/admin', { params });
    return res.data as GetLeadsResponse;
  },

  deleteLead: async (id: string) => {
    const res = await api.delete(`/api/marketing/admin/${id}`);
    return res.data;
  },
};
