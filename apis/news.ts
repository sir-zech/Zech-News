import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { NewsResponse } from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class NewsService {

  // ✅ FIX: Use Vercel API in localhost, internal API in production
  private API_URL =
    window.location.hostname === 'localhost'
      ? 'https://zech-news.vercel.app/api/news'
      : '/api/news';

  constructor(private http: HttpClient) {
    console.log('🌐 API URL:', this.API_URL);
  }

  // 📰 GET TOP HEADLINES
  getTopHeadlines(category: string = 'general'): Observable<NewsResponse> {
    console.log('📰 Fetching headlines for:', category);

    const params = new HttpParams().set('category', category);

    return this.http.get<NewsResponse>(this.API_URL, { params }).pipe(
      tap(res => {
        console.log('✅ Headlines Response:', res);

        if (!res || !res.articles) {
          console.warn('⚠️ Invalid response format:', res);
        }
      }),
      catchError(err => {
        console.error('❌ Headlines Error:', err);
        return throwError(() => err);
      })
    );
  }

  // 🔍 SEARCH NEWS
  searchNews(query: string): Observable<NewsResponse> {
    console.log('🔍 Searching for:', query);

    const params = new HttpParams().set('q', query);

    return this.http.get<NewsResponse>(this.API_URL, { params }).pipe(
      tap(res => {
        console.log('✅ Search Response:', res);
      }),
      catchError(err => {
        console.error('❌ Search Error:', err);
        return throwError(() => err);
      })
    );
  }

  // 🧪 OPTIONAL HEALTH CHECK (for debugging)
  healthCheck(): Observable<any> {
    console.log('🧪 Running health check...');

    return this.http.get(this.API_URL).pipe(
      tap(res => console.log('✅ Health Check Response:', res)),
      catchError(err => {
        console.error('❌ Health Check Error:', err);
        return throwError(() => err);
      })
    );
  }
}