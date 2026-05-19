import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NewsService } from '../services/news';
import { SmartService } from '../services/smart';
import { LocationService, UserLocation } from '../services/location';
import { ArticleStateService } from '../services/article-state';
import { Article, NewsResponse } from '../models/article.model';
import { NewsCardComponent } from './news-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NewsCardComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent implements OnInit {
  articles: Article[] = [];
  featured: Article | null = null;
  hnArticles: Article[] = [];
  localArticles: Article[] = [];
  trendingTopics: string[] = [];

  loading = false;
  hnLoading = false;
  localLoading = false;
  error = '';

  currentCategory = 'general';
  userLocation: UserLocation | null = null;

  locationQuery = '';
  locationResults: { label: string; country: string; countryCode: string; city: string }[] = [];
  showLocationSearch = false;

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
    { code: 'ko', label: '한국어' }
  ];

  quickLinks = [
    { label: '🌍 World', value: 'world' },
    { label: '💻 Tech', value: 'technology' },
    { label: '📈 Business', value: 'business' },
    { label: '⚽ Sports', value: 'sports' },
    { label: '🔬 Science', value: 'science' },
    { label: '❤️ Health', value: 'health' }
  ];

  constructor(
    private newsService: NewsService,
    private smartService: SmartService,
    private locationService: LocationService,
    private articleState: ArticleStateService,
    private router: Router
  ) {
    const savedLang = localStorage.getItem('zech-lang');
    if (savedLang) this.selectedLang = savedLang;
  }

  ngOnInit() {
    this.loadNews();
    this.loadHackerNews();
    this.detectLocation();
  }

  openArticle(article: Article) {
    this.articleState.set(article);
    this.router.navigate(['/article']);
  }

  loadNews(category = 'general') {
    if (this.loading && this.currentCategory === category) return;

    this.currentCategory = category;
    this.loading = true;
    this.error = '';

    this.newsService.getTopHeadlines(category, this.selectedLang).subscribe({
      next: (res: NewsResponse) => {
        if (!res?.articles?.length) {
          this.error = 'No news available';
          this.loading = false;
          return;
        }
        const enriched = this.smartService.enrichAll(res.articles);
        this.featured = enriched[0] || null;
        this.articles = enriched.slice(1);
        this.trendingTopics = this.smartService.getTrendingTopics(enriched);
        this.loading = false;
      },
      error: (err) => {
        if (err.status === 429) {
          this.error = 'Too many requests. Please wait a few seconds.';
        } else if (err.status === 500) {
          this.error = 'Server error. Try again later.';
        } else {
          this.error = 'Failed to load news.';
        }
        this.loading = false;
      }
    });
  }

  loadHackerNews() {
    this.hnLoading = true;
    this.newsService.getHackerNews(6).subscribe({
      next: (res) => {
        this.hnArticles = this.smartService.enrichAll(res.articles || []);
        this.hnLoading = false;
      },
      error: () => { this.hnLoading = false; }
    });
  }

  async detectLocation() {
    try {
      this.userLocation = await this.locationService.detect();
      this.loadLocalNews();
    } catch {}
  }

  loadLocalNews() {
    if (!this.userLocation) return;
    this.localLoading = true;
    this.newsService.getLocalNews(this.userLocation.countryCode, this.selectedLang).subscribe({
      next: (res) => {
        this.localArticles = this.smartService.enrichAll(res.articles || []).slice(0, 6);
        this.localLoading = false;
      },
      error: () => { this.localLoading = false; }
    });
  }

  loadCategory(category: string) {
    this.loadNews(category);
  }

  changeLang(lang: string) {
    this.selectedLang = lang;
    localStorage.setItem('zech-lang', lang);
    this.newsService.clearCache();
    this.loadNews(this.currentCategory);
    if (this.userLocation) this.loadLocalNews();
  }

  retry() {
    this.loadNews(this.currentCategory);
  }

  getLangLabel(): string {
    return this.languages.find(l => l.code === this.selectedLang)?.label || 'English';
  }

  onLocationSearch() {
    this.locationResults = this.locationService.searchLocations(this.locationQuery);
  }

  selectLocation(result: { label: string; country: string; countryCode: string; city: string }) {
    this.locationService.setManual(result.country, result.countryCode, result.city);
    this.userLocation = { country: result.country, countryCode: result.countryCode, city: result.city };
    this.locationQuery = '';
    this.locationResults = [];
    this.showLocationSearch = false;
    this.newsService.clearCache();
    this.loadLocalNews();
  }

  toggleLocationSearch() {
    this.showLocationSearch = !this.showLocationSearch;
    if (!this.showLocationSearch) {
      this.locationQuery = '';
      this.locationResults = [];
    }
  }

  resetToAutoLocation() {
    this.locationService['cached'] = null;
    this.showLocationSearch = false;
    this.locationQuery = '';
    this.locationResults = [];
    this.newsService.clearCache();
    this.detectLocation();
  }
}
