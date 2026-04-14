import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NewsService } from '../services/news';
import { Article, NewsResponse } from '../models/article.model';
import { NewsCardComponent } from './news-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NewsCardComponent, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent implements OnInit {
  articles: Article[] = [];
  featured: Article | null = null;
  loading = false;
  error = '';

  quickLinks = [
    { label: '🌍 World', value: 'world' },
    { label: '💻 Tech', value: 'technology' },
    { label: '📈 Business', value: 'business' },
    { label: '⚽ Sports', value: 'sports' },
    { label: '🔬 Science', value: 'science' },
    { label: '❤️ Health', value: 'health' }
  ];

  constructor(private newsService: NewsService) {}
  ngOnInit() { this.loadNews(); }
openUrl(url: string) { window.open(url, '_blank'); }
  loadNews() {
  this.loading = true;
  this.error = '';

  console.log('🚀 Calling /api/news...');

  this.newsService.getTopHeadlines('general').subscribe({
    next: (res: any) => {
      console.log('✅ FULL RESPONSE:', res);

      if (!res || !res.articles) {
        console.error('⚠️ Invalid response format:', res);
        this.error = 'Invalid API response';
        this.loading = false;
        return;
      }

      this.featured = res.articles[0] || null;
      this.articles = res.articles.slice(1);
      this.loading = false;
    },

    error: (err) => {
      console.error('❌ API ERROR:', err);

      if (err.status === 500) {
        this.error = 'Server error (Vercel API issue)';
      } else if (err.status === 404) {
        this.error = 'API route not found (/api/news missing)';
      } else {
        this.error = 'Failed to load news';
      }

      this.loading = false;
    }
  });
}
}