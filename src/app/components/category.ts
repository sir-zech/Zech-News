import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { NewsService } from '../services/news';
import { SmartService } from '../services/smart';
import { Article, NewsResponse } from '../models/article.model';
import { NewsCardComponent } from './news-card';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, NewsCardComponent],
  templateUrl: './category.html',
  styleUrls: ['./category.scss']
})
export class CategoryComponent implements OnInit {
  articles: Article[] = [];
  loading = false;
  error = '';
  categoryName = '';
  searchQuery = '';
  isSearch = false;

  constructor(
    private route: ActivatedRoute,
    private newsService: NewsService,
    private smartService: SmartService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.categoryName = params['name'];
      this.isSearch = this.categoryName === 'search';
      this.route.queryParams.subscribe(qp => {
        this.searchQuery = qp['q'] || '';
        this.loadNews();
      });
    });
  }

  loadNews() {
    this.loading = true;
    this.error = '';
    const lang = localStorage.getItem('zech-lang') || 'en';

    const obs = this.isSearch
      ? this.newsService.searchNews(this.searchQuery, lang)
      : this.newsService.getTopHeadlines(this.categoryName, lang);

    obs.subscribe({
      next: (res: NewsResponse) => {
        this.articles = this.smartService.enrichAll(res.articles || []);
        this.loading = false;
      },
      error: () => { this.error = 'Failed to load news.'; this.loading = false; }
    });
  }
}
