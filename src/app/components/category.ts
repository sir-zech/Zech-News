import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { NewsService } from '../services/news';
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

  constructor(private route: ActivatedRoute, private newsService: NewsService) {}

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
    const obs = this.isSearch
      ? this.newsService.searchNews(this.searchQuery)
      : this.newsService.getTopHeadlines(this.categoryName);

    obs.subscribe({
      next: (res: NewsResponse) => { this.articles = res.articles; this.loading = false; },
      error: () => { this.error = 'Failed to load news.'; this.loading = false; }
    });
  }
}