import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError, shareReplay } from 'rxjs';
import { NewsResponse } from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class NewsService {
  private cache = new Map<string, { data: NewsResponse; time: number }>();
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

  private getFromCache(key: string): NewsResponse | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.time < this.CACHE_TTL) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: NewsResponse) {
    this.cache.set(key, { data, time: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }
}
