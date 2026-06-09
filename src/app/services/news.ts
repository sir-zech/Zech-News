import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError, shareReplay, timeout } from 'rxjs';
import { NewsResponse, FeedResponse } from '../models/article.model';
import { environment } from '../../environments/environment';

export interface ExtractedArticle {
  title: string;
  description: string;
  image: string;
  content: string;
  html?: string;
  paragraphs: string[];
  images?: string[];
  byline?: string;
  wordCount: number;
  extracted: boolean;
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  private base = environment.apiBase || '';
  private cache = new Map<string, { data: any; time: number }>();
  private readonly CACHE_TTL = 120000;

  constructor(private http: HttpClient) {}

  // ---- Image helpers (free wsrv.nl CDN + Google favicon) ----
  static proxyImage(url: string, w = 400): string {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('https://wsrv.nl/')) return url;
    const clean = url.replace(/^http:\/\//i, 'https://');
    return `https://wsrv.nl/?url=${encodeURIComponent(clean)}&w=${w}&output=webp&q=72&we&il`;
  }

  static favicon(url: string, size = 64): string {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      return `https://www.google.com/s2/favicons?domain=${host}&sz=${size}`;
    } catch {
      return '';
    }
  }

  /** GET with Render(primary) -> Vercel(/api fallback) resilience. */
  private req<T>(path: string, params: HttpParams, fallback: T): Observable<T> {
    if (!this.base) {
      return this.http.get<T>(path, { params }).pipe(catchError(() => of(fallback)));
    }
    return this.http.get<T>(`${this.base}${path}`, { params }).pipe(
      timeout(9000),
      catchError(() =>
        this.http.get<T>(path, { params }).pipe(catchError(() => of(fallback)))
      )
    );
  }

  /** Fire-and-forget ping to wake a sleeping Render dyno for this user. */
  warmUp(): void {
    if (!this.base) return;
    this.http
      .get(`${this.base}/health`, { responseType: 'text' })
      .pipe(timeout(60000), catchError(() => of(null)))
      .subscribe();
  }

  getFeed(category = 'general', lang = 'en', page = 1, q?: string, country?: string): Observable<FeedResponse> {
    let params = new HttpParams().set('lang', lang).set('page', String(page));
    if (q && q.trim()) params = params.set('q', q.trim());
    else params = params.set('category', category);
    if (country) params = params.set('country', country);
    const empty: FeedResponse = { totalArticles: 0, articles: [], page, pageSize: 0, hasMore: false };
    return this.req<FeedResponse>('/api/feed', params, empty);
  }

  getTopHeadlines(category = 'general', lang = 'en', country?: string): Observable<NewsResponse> {
    const key = `headlines-${category}-${lang}-${country || ''}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);

    let params = new HttpParams().set('category', category).set('lang', lang);
    if (country) params = params.set('country', country);

    return this.req<NewsResponse>('/api/news', params, { totalArticles: 0, articles: [] }).pipe(
      map((res) => {
        this.setCache(key, res);
        return res;
      }),
      shareReplay(1)
    );
  }

  searchNews(query: string, lang = 'en'): Observable<NewsResponse> {
    const params = new HttpParams().set('q', query).set('lang', lang);
    return this.req<NewsResponse>('/api/news', params, { totalArticles: 0, articles: [] });
  }

  getLocalNews(countryCode: string, lang = 'en'): Observable<NewsResponse> {
    const key = `local-${countryCode}-${lang}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);

    const params = new HttpParams().set('country', countryCode).set('lang', lang);
    return this.req<NewsResponse>('/api/news', params, { totalArticles: 0, articles: [] }).pipe(
      map((res) => {
        this.setCache(key, res);
        return res;
      }),
      shareReplay(1)
    );
  }

  getHackerNews(limit = 6): Observable<NewsResponse> {
    const key = `hn-${limit}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);
    const params = new HttpParams().set('limit', limit.toString());
    return this.req<NewsResponse>('/api/hn', params, { totalArticles: 0, articles: [] }).pipe(
      map((res) => {
        this.setCache(key, res);
        return res;
      }),
      shareReplay(1)
    );
  }

  getDevToNews(limit = 6, tag?: string): Observable<NewsResponse> {
    const key = `devto-${tag || 'top'}-${limit}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);
    let params = new HttpParams().set('limit', limit.toString());
    if (tag) params = params.set('tag', tag);
    return this.req<NewsResponse>('/api/devto', params, { totalArticles: 0, articles: [] }).pipe(
      map((res) => {
        this.setCache(key, res);
        return res;
      }),
      shareReplay(1)
    );
  }

  getRedditNews(limit = 6, sub = 'news'): Observable<NewsResponse> {
    const key = `reddit-${sub}-${limit}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);
    const params = new HttpParams().set('limit', limit.toString()).set('sub', sub);
    return this.req<NewsResponse>('/api/reddit', params, { totalArticles: 0, articles: [] }).pipe(
      map((res) => {
        this.setCache(key, res);
        return res;
      }),
      shareReplay(1)
    );
  }

  getSpaceNews(limit = 6): Observable<NewsResponse> {
    const key = `space-${limit}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);
    const params = new HttpParams().set('limit', limit.toString());
    return this.req<NewsResponse>('/api/space', params, { totalArticles: 0, articles: [] }).pipe(
      map((res) => {
        this.setCache(key, res);
        return res;
      }),
      shareReplay(1)
    );
  }

  extractArticle(url: string): Observable<ExtractedArticle> {
    const key = `extract-${url}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);

    const params = new HttpParams().set('url', url);
    const empty: ExtractedArticle = {
      title: '', description: '', image: '', content: '',
      paragraphs: [], images: [], byline: '', wordCount: 0, extracted: false,
    };
    return this.req<ExtractedArticle>('/api/extract', params, empty).pipe(
      map((res) => {
        if (res.extracted) this.setCache(key, res);
        return res;
      })
    );
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time < this.CACHE_TTL) return entry.data;
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, time: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }
}
