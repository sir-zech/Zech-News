export interface Article {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
  readingTime?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  keywords?: string[];
  apiSource?: string;
  byline?: string;
  fullBody?: string;
}

export interface NewsResponse {
  totalArticles: number;
  articles: Article[];
}

export interface FeedResponse extends NewsResponse {
  page: number;
  pageSize: number;
  hasMore: boolean;
}
