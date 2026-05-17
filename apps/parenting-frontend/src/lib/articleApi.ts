import { api } from './api.js';
import { Article, ArticleCategory } from '../types/Articles.js';

export const articleApi = {
  // Public routes
  getPublicArticles: async (params?: { categoryId?: string; search?: string; limit?: number; offset?: number; locale?: string }) => {
    const response = await api.get<{ articles: Article[]; total: number }>('/api/articles/public', { params });
    return response.data;
  },

  getPublicArticleBySlug: async (slug: string, locale?: string) => {
    const response = await api.get<{ article: Article }>(`/api/articles/public/${slug}`, { params: locale ? { locale } : undefined });
    return response.data;
  },

  getCategories: async (params?: { locale?: string }) => {
    const response = await api.get<{ categories: ArticleCategory[] }>('/api/articles/categories', { params });
    return response.data.categories;
  },

  // Protected routes
  getRecommendedArticles: async () => {
    const response = await api.get<{ articles: Article[]; children: any[] }>('/api/articles/recommendations');
    return response.data;
  },

  // Admin routes
  getAdminArticles: async (params?: { limit?: number; offset?: number }) => {
    const response = await api.get<{ articles: Article[]; total: number }>('/api/articles/admin', { params });
    return response.data;
  },

  createArticle: async (data: Partial<Article>) => {
    const response = await api.post<{ article: Article }>('/api/articles/admin', data);
    return response.data.article;
  },

  updateArticle: async (id: string, data: Partial<Article>) => {
    const response = await api.put<{ article: Article }>(`/api/articles/admin/${id}`, data);
    return response.data.article;
  },

  deleteArticle: async (id: string) => {
    await api.delete(`/api/articles/admin/${id}`);
  },

  createCategory: async (data: Partial<ArticleCategory>) => {
    const response = await api.post<{ category: ArticleCategory }>('/api/articles/admin/categories', data);
    return response.data.category;
  },

  translateAll: async (locale = 'fa') => {
    const response = await api.post<{ queued: number; locale: string; message: string }>('/api/articles/admin/translate-all', { locale });
    return response.data;
  },
};
