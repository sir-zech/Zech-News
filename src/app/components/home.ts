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

  currentCategory = 'general'; // ✅ track current category

  quickLinks = [
    { label: '🌍 World', value: 'world' },
    { label: '💻 Tech', value: 'technology' },
    { label: '📈 Business', value: 'business' },
    { label: '⚽ Sports', value: 'sports' },
    { label: '🔬 Science', value: 'science' },
    { label: '❤️ Health', value: 'health' }
  ];

  constructor(private newsService: NewsService) {}

  ngOnInit() {
    this.loadNews();
  }

  // 🔗 Open article
  openUrl(url: string) {
    window.open(url, '_blank');
  }

  // 📰 Load news (main method)
  loadNews(category: string = 'general') {

    // ✅ prevent duplicate calls
    if (this.loading && this.currentCategory === category) {
      return;
    }

    this.currentCategory = category;
    this.loading = true;
    this.error = '';

    console.log('🚀 Loading news for:', category);

    this.newsService.getTopHeadlines(category).subscribe({

      next: (res: NewsResponse) => {
        console.log('✅ API RESPONSE:', res);

        if (!res || !res.articles || res.articles.length === 0) {
          this.error = 'No news available';
          this.loading = false;
          return;
        }

        this.featured = res.articles[0] || null;
        this.articles = res.articles.slice(1);
        this.loading = false;
      },

      error: (err) => {
        console.error('❌ API ERROR:', err);

        // ✅ Handle rate limit
        if (err.status === 429) {
          this.error = '⚠️ Too many requests. Please wait a few seconds.';
        }
        // ✅ Server issue
        else if (err.status === 500) {
          this.error = '⚠️ Server error. Try again later.';
        }
        // ✅ Not found
        else if (err.status === 404) {
          this.error = '⚠️ API route not found.';
        }
        // ✅ Fallback
        else {
          this.error = 'Failed to load news.';
        }

        this.loading = false;
      }
    });
  }

  // 🔥 Category click handler (IMPORTANT)
  loadCategory(category: string) {
    console.log('📂 Switching category:', category);
    this.loadNews(category);
  }

  // 🔄 Retry button support
  retry() {
    this.loadNews(this.currentCategory);
  }
}