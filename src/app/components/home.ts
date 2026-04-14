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
    this.newsService.getTopHeadlines('general').subscribe({
      next: (res: NewsResponse) => {
        this.featured = res.articles[0] || null;
        this.articles = res.articles.slice(1);
        this.loading = false;
      },
      error: () => { this.error = 'Failed to load news. Check your API key.'; this.loading = false; }
    });
  }
}