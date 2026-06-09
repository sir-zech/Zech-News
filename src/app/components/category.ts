import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { NewsService } from '../services/news';
import { SmartService } from '../services/smart';
import { Article } from '../models/article.model';
import { NewsCardComponent } from './news-card';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, NewsCardComponent],
  templateUrl: './category.html',
  styleUrls: ['./category.scss'],
})
export class CategoryComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollAnchor') scrollAnchor?: ElementRef<HTMLElement>;

  articles: Article[] = [];
  loading = false;
  loadingMore = false;
  hasMore = true;
  page = 1;
  error = '';
  categoryName = '';
  searchQuery = '';
  isSearch = false;

  private seenUrls = new Set<string>();
  private emptyStreak = 0;
  private observer?: IntersectionObserver;

  constructor(
    private route: ActivatedRoute,
    private newsService: NewsService,
    private smartService: SmartService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.categoryName = params['name'];
      this.isSearch = this.categoryName === 'search';
      this.route.queryParams.subscribe((qp) => {
        this.searchQuery = qp['q'] || '';
        this.loadFeed(true);
      });
    });
  }

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !this.loadingMore && !this.loading && this.hasMore) {
          setTimeout(() => this.loadFeed(false));
        }
      },
      { rootMargin: '600px 0px' }
    );
    if (this.scrollAnchor) this.observer.observe(this.scrollAnchor.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private get lang(): string {
    return localStorage.getItem('zech-lang') || 'en';
  }

  loadFeed(reset: boolean) {
    if (reset) {
      this.page = 1;
      this.articles = [];
      this.seenUrls.clear();
      this.emptyStreak = 0;
      this.hasMore = true;
      this.error = '';
      this.loading = true;
      window.scrollTo({ top: 0 });
    } else {
      if (this.loadingMore || this.loading || !this.hasMore) return;
      this.loadingMore = true;
    }

    const cat = this.isSearch ? 'general' : this.categoryName;
    const q = this.isSearch ? this.searchQuery : undefined;

    this.newsService.getFeed(cat, this.lang, this.page, q).subscribe({
      next: (res) => {
        const enriched = this.smartService.enrichAll(res.articles || []);
        const fresh = enriched.filter((a) => a.url && !this.seenUrls.has(a.url));
        fresh.forEach((a) => this.seenUrls.add(a.url));
        this.articles = reset ? fresh : [...this.articles, ...fresh];
        this.emptyStreak = fresh.length === 0 ? this.emptyStreak + 1 : 0;
        this.hasMore = res.hasMore && this.emptyStreak < 3;
        this.page++;
        this.loading = false;
        this.loadingMore = false;
      },
      error: () => {
        this.loading = false;
        this.loadingMore = false;
        if (reset) this.error = 'Failed to load news.';
      },
    });
  }

  retry() {
    this.loadFeed(true);
  }
}
