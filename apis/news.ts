import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { NewsResponse } from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class NewsService {

  private API_URL = '/api/news';

  constructor(private http: HttpClient) {}

  // 🧪 HEALTH CHECK
  healthCheck(): Observable<any> {
    console.log('🧪 Calling API health check...');
    return this.http.get(this.API_URL).pipe(
      tap(res => {
        console.log('✅ Health Check Response:', res);
      }),
      catchError(err => {
        console.error('❌ Health Check Error:', err);
        return throwError(() => err);
      })
    );
  }

  // 📰 GET TOP HEADLINES
  getTopHeadlines(category: string = 'general'): Observable<NewsResponse> {
    console.log('📰 Fetching headlines for:', category);

    const params = new HttpParams().set('category', category);

    return this.http.get<NewsResponse>(this.API_URL, { params }).pipe(
      tap(res => {
        console.log('✅ Headlines Response:', res);

        // 🔍 Validate response structure
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
}