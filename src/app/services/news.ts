import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NewsResponse } from '../models/article.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NewsService {
  constructor(private http: HttpClient) {}

  getTopHeadlines(category: string = 'general'): Observable<NewsResponse> {
    const params = new HttpParams()
      .set('token', environment.newsApiKey)
      .set('lang', 'en')
      .set('category', category)
      .set('max', '12');
    return this.http.get<NewsResponse>(`${environment.newsApiUrl}/top-headlines`, { params });
  }

  searchNews(query: string): Observable<NewsResponse> {
    const params = new HttpParams()
      .set('token', environment.newsApiKey)
      .set('lang', 'en')
      .set('q', query)
      .set('max', '12');
    return this.http.get<NewsResponse>(`${environment.newsApiUrl}/search`, { params });
  }
}