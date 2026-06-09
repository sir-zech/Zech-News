import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NewsService } from '../services/news';
import { SmartService } from '../services/smart';
import { LocationService, UserLocation } from '../services/location';
import { ArticleStateService } from '../services/article-state';
import { Article } from '../models/article.model';
import { NewsCardComponent } from './news-card';
import { MascotComponent } from './mascot';
import { TimeAgoPipe } from '../pipes/time-ago.pipe';
import { ImgProxyPipe } from '../pipes/img-proxy.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NewsCardComponent,
    MascotComponent,
    TimeAgoPipe,
    ImgProxyPipe,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollAnchor') scrollAnchor?: ElementRef<HTMLElement>;

  featured: Article | null = null;
  feedArticles: Article[] = [];
  hnArticles: Article[] = [];
  devtoArticles: Article[] = [];
  spaceArticles: Article[] = [];
  redditArticles: Article[] = [];
  localArticles: Article[] = [];
  trendingTopics: string[] = [];

  loading = false; // initial / category switch
  loadingMore = false; // infinite-scroll append
  hasMore = true;
  page = 1;
  private seenUrls = new Set<string>();
  private emptyStreak = 0;

  hnLoading = false;
  devtoLoading = false;
  spaceLoading = false;
  redditLoading = false;
  localLoading = false;
  error = '';

  currentCategory = 'general';
  private observer?: IntersectionObserver;

  selectedLang = 'en';
  languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pt', label: 'Português' },
    { code: 'ja', label: '日本語' },
    { code: 'zh', label: '中文' },
    { code: 'ar', label: 'العربية' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'it', label: 'Italiano' },
    { code: 'ru', label: 'Русский' },
    { code: 'ko', label: '한국어' },
  ];

  quickLinks = [
    { label: '🌍 World', value: 'world' },
    { label: '💻 Tech', value: 'technology' },
    { label: '📈 Business', value: 'business' },
    { label: '⚽ Sports', value: 'sports' },
    { label: '🔬 Science', value: 'science' },
    { label: '❤️ Health', value: 'health' },
    { label: '🎬 Culture', value: 'entertainment' },
  ];

  constructor(
    private newsService: NewsService,
    private smartService: SmartService,
    public locationService: LocationService,
    private articleState: ArticleStateService,
    private router: Router
  ) {
    const savedLang = localStorage.getItem('zech-lang');
    if (savedLang) this.selectedLang = savedLang;

    effect(() => {
      const loc = this.locationService.location();
      if (loc) this.loadLocalNewsFor(loc);
    });
  }

  ngOnInit() {
    this.newsService.warmUp();
    this.loadFeed(true);
    this.loadHackerNews();
    this.loadDevToNews();
    this.loadSpaceNews();
    this.loadRedditNews();
    this.locationService.detect();
  }

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) this.loadFeed(false);
      },
      { rootMargin: '600px 0px' }
    );
    if (this.scrollAnchor) this.observer.observe(this.scrollAnchor.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  openArticle(article: Article) {
    this.articleState.set(article);
    this.router.navigate(['/article']);
  }

  loadFeed(reset: boolean) {
    if (reset) {
      this.page = 1;
      this.feedArticles = [];
      this.featured = null;
      this.seenUrls.clear();
      this.emptyStreak = 0;
      this.hasMore = true;
      this.error = '';
      this.loading = true;
    } else {
      if (this.loadingMore || this.loading || !this.hasMore) return;
      this.loadingMore = true;
    }

    this.newsService.getFeed(this.currentCategory, this.selectedLang, this.page).subscribe({
      next: (res) => {
        const enriched = this.smartService.enrichAll(res.articles || []);
        const fresh = enriched.filter((a) => a.url && !this.seenUrls.has(a.url));
        fresh.forEach((a) => this.seenUrls.add(a.url));

        if (reset) {
          if (fresh.length === 0) {
            this.error = 'No news available. Try another language or category.';
            this.hasMore = false;
          } else {
            this.featured = fresh[0];
            this.feedArticles = fresh.slice(1);
            this.trendingTopics = this.smartService.getTrendingTopics(enriched);
          }
        } else {
          this.feedArticles = [...this.feedArticles, ...fresh];
        }

        this.emptyStreak = fresh.length === 0 ? this.emptyStreak + 1 : 0;
        this.hasMore = res.hasMore && this.emptyStreak < 3;
        this.page++;
        this.loading = false;
        this.loadingMore = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadingMore = false;
        if (reset) {
          this.error =
            err?.status === 429
              ? 'Too many requests. Please wait a few seconds.'
              : 'Failed to load news. Try a different language or category.';
        }
      },
    });
  }

  loadHackerNews() {
    this.hnLoading = true;
    this.newsService.getHackerNews(6).subscribe({
      next: (res) => {
        this.hnArticles = this.smartService.enrichAll(res.articles || []);
        this.hnLoading = false;
      },
      error: () => (this.hnLoading = false),
    });
  }

  loadDevToNews() {
    this.devtoLoading = true;
    this.newsService.getDevToNews(6).subscribe({
      next: (res) => {
        this.devtoArticles = this.smartService.enrichAll(res.articles || []);
        this.devtoLoading = false;
      },
      error: () => (this.devtoLoading = false),
    });
  }

  loadSpaceNews() {
    this.spaceLoading = true;
    this.newsService.getSpaceNews(4).subscribe({
      next: (res) => {
        this.spaceArticles = this.smartService.enrichAll(res.articles || []);
        this.spaceLoading = false;
      },
      error: () => (this.spaceLoading = false),
    });
  }

  loadRedditNews() {
    this.redditLoading = true;
    this.newsService.getRedditNews(6).subscribe({
      next: (res) => {
        this.redditArticles = this.smartService.enrichAll(res.articles || []);
        this.redditLoading = false;
      },
      error: () => (this.redditLoading = false),
    });
  }

  private loadLocalNewsFor(loc: UserLocation) {
    this.localLoading = true;
    this.newsService.getLocalNews(loc.countryCode, this.selectedLang).subscribe({
      next: (res) => {
        this.localArticles = this.smartService.enrichAll(res.articles || []).slice(0, 6);
        this.localLoading = false;
      },
      error: () => (this.localLoading = false),
    });
  }

  loadCategory(category: string) {
    if (this.currentCategory === category && !this.error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.currentCategory = category;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.loadFeed(true);
  }

  changeLang(lang: string) {
    this.selectedLang = lang;
    localStorage.setItem('zech-lang', lang);
    this.newsService.clearCache();
    this.loadFeed(true);
    const loc = this.locationService.location();
    if (loc) this.loadLocalNewsFor(loc);
  }

  retry() {
    this.loadFeed(true);
  }

  getLangLabel(): string {
    return this.languages.find((l) => l.code === this.selectedLang)?.label || 'English';
  }
}
