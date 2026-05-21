import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError, shareReplay } from 'rxjs';
import { NewsResponse } from '../models/article.model';

export interface ExtractedArticle {
  title: string;
  description: string;
  image: string;
  content: string;
  paragraphs: string[];
  wordCount: number;
  extracted: boolean;
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  private cache = new Map<string, { data: any; time: number }>();
  private readonly CACHE_TTL = 120000;

  constructor(private http: HttpClient) {}

  getTopHeadlines(category = 'general', lang = 'en', country?: string): Observable<NewsResponse> {
    const key = `headlines-${category}-${lang}-${country || ''}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);

    let params = new HttpParams()
      .set('category', category)
      .set('lang', lang);

    if (country) params = params.set('country', country);

    return this.http.get<NewsResponse>('/api/news', { params }).pipe(
      map(res => { this.setCache(key, res); return res; }),
      catchError(() => of({ totalArticles: 0, articles: [] })),
      shareReplay(1)
    );
  }

  searchNews(query: string, lang = 'en'): Observable<NewsResponse> {
    const params = new HttpParams()
      .set('q', query)
      .set('lang', lang);

    return this.http.get<NewsResponse>('/api/news', { params });
  }

  getLocalNews(countryCode: string, lang = 'en'): Observable<NewsResponse> {
    const key = `local-${countryCode}-${lang}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);

    const params = new HttpParams()
      .set('country', countryCode)
      .set('lang', lang);

    return this.http.get<NewsResponse>('/api/news', { params }).pipe(
      map(res => { this.setCache(key, res); return res; }),
      catchError(() => of({ totalArticles: 0, articles: [] })),
      shareReplay(1)
    );
  }

  getHackerNews(limit = 6): Observable<NewsResponse> {
    const key = `hn-${limit}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);

    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<NewsResponse>('/api/hn', { params }).pipe(
      map(res => { this.setCache(key, res); return res; }),
      catchError(() => of({ totalArticles: 0, articles: [] })),
      shareReplay(1)
    );
  }

  getDevToNews(limit = 6, tag?: string): Observable<NewsResponse> {
    const key = `devto-${tag || 'top'}-${limit}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);

    let params = new HttpParams().set('limit', limit.toString());
    if (tag) params = params.set('tag', tag);

    return this.http.get<NewsResponse>('/api/devto', { params }).pipe(
      map(res => { this.setCache(key, res); return res; }),
      catchError(() => of({ totalArticles: 0, articles: [] })),
      shareReplay(1)
    );
  }

  getRedditNews(limit = 6, sub = 'news'): Observable<NewsResponse> {
    const key = `reddit-${sub}-${limit}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);

    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('sub', sub);

    return this.http.get<NewsResponse>('/api/reddit', { params }).pipe(
      map(res => { this.setCache(key, res); return res; }),
      catchError(() => of({ totalArticles: 0, articles: [] })),
      shareReplay(1)
    );
  }

  getSpaceNews(limit = 6): Observable<NewsResponse> {
    const key = `space-${limit}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);

    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<NewsResponse>('/api/space', { params }).pipe(
      map(res => { this.setCache(key, res); return res; }),
      catchError(() => of({ totalArticles: 0, articles: [] })),
      shareReplay(1)
    );
  }

  extractArticle(url: string): Observable<ExtractedArticle> {
    const key = `extract-${url}`;
    const cached = this.getFromCache(key);
    if (cached) return of(cached);

    const params = new HttpParams().set('url', url);

    return this.http.get<ExtractedArticle>('/api/extract', { params }).pipe(
      map(res => { this.setCache(key, res); return res; }),
      catchError(() => of({
        title: '', description: '', image: '', content: '',
        paragraphs: [], wordCount: 0, extracted: false
      }))
    );
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time < this.CACHE_TTL) {
      return entry.data;
    }
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
