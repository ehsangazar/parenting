export interface ArticleCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  parentId?: string;
  children?: ArticleCategory[];
}

export interface ArticleMedia {
  id?: string;
  type: 'image' | 'video' | 'audio';
  s3Key: string;
  mimeType?: string;
  duration?: number;
  position: number;
}

export interface ArticleAction {
  id?: string;
  label: string;
  actionType: 'calendar' | 'milestone' | 'link';
  targetId?: string;
  url?: string;
  position: number;
}

export interface ArticleCitation {
  id?: string;
  label: string;
  url: string;
  verified: boolean;
  position: number;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  published: boolean;
  aiSummary?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
  category?: ArticleCategory;
  media?: ArticleMedia[];
  actions?: ArticleAction[];
  citations?: ArticleCitation[];
}
