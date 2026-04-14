import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NewsResponse } from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class NewsService {

  constructor(private http: HttpClient) {}

  // ✅ Top headlines (via Vercel API)
  getTopHeadlines(category: string = 'general'): Observable<NewsResponse> {
    const params = new HttpParams()
      .set('category', category);

    return this.http.get<NewsResponse>('/api/news', { params });
  }

  // ✅ Search news (via Vercel API)
  searchNews(query: string): Observable<NewsResponse> {
    const params = new HttpParams()
      .set('q', query);

    return this.http.get<NewsResponse>('/api/news', { params });
  }
}