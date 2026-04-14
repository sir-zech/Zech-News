import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap, catchError, throwError } from 'rxjs';
import { NewsResponse } from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class NewsService {

  private API_URL =
    window.location.hostname === 'localhost'
      ? 'https://zech-news.vercel.app/api/news'
      : '/api/news';

  // ✅ Cache store
  private cache = new Map<string, NewsResponse>();

  constructor(private http: HttpClient) {
    console.log('🌐 API URL:', this.API_URL);
  }

  // 📰 HEADLINES WITH CACHE
  getTopHeadlines(category: string = 'general'): Observable<NewsResponse> {
    const key = `cat-${category}`;

    if (this.cache.has(key)) {
      console.log('⚡ Using cache:', key);
      return of(this.cache.get(key)!);
    }

    const params = new HttpParams().set('category', category);

    return this.http.get<NewsResponse>(this.API_URL, { params }).pipe(
      tap(res => {
        console.log('✅ API Response:', res);
        this.cache.set(key, res);
      }),
      catchError(err => {
        console.error('❌ API Error:', err);
        return throwError(() => err);
      })
    );
  }

  // 🔍 SEARCH WITH CACHE + VALIDATION
  searchNews(query: string): Observable<NewsResponse> {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      console.warn('⚠️ Empty search prevented');
      return of({ articles: [] } as NewsResponse);
    }

    const key = `search-${cleanQuery}`;

    if (this.cache.has(key)) {
      console.log('⚡ Using cache:', key);
      return of(this.cache.get(key)!);
    }

    const params = new HttpParams().set('q', cleanQuery);

    return this.http.get<NewsResponse>(this.API_URL, { params }).pipe(
      tap(res => {
        console.log('✅ Search Response:', res);
        this.cache.set(key, res);
      }),
      catchError(err => {
        console.error('❌ Search Error:', err);
        return throwError(() => err);
      })
    );
  }
}