import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ArticleStateService } from '../services/article-state';
import { BookmarkService } from '../services/bookmark';
import { HistoryService } from '../services/history';
import { TtsService } from '../services/tts';
import { SmartService } from '../services/smart';
import { NewsService, ExtractedArticle } from '../services/news';
import { Article } from '../models/article.model';
import { ImgProxyPipe, FaviconPipe } from '../pipes/img-proxy.pipe';
import { IconComponent } from './icon';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [CommonModule, ImgProxyPipe, FaviconPipe, IconComponent],
  templateUrl: './article-detail.html',
  styleUrls: ['./article-detail.scss'],
})
export class ArticleDetailComponent implements OnInit, OnDestroy {
  article: Article | null = null;
  summaryPoints: string[] = [];
  isBookmarked = false;
  imgError = false;
  shareSupported = typeof navigator !== 'undefined' && !!navigator.share;

  fullContent: string[] = [];
  extractedImages: string[] = [];
  readerHtml = ''; // sanitized rich article HTML (ad-free), rendered via [innerHTML]
  byline = '';
  extracting = false;
  extractError = '';
  extracted = false;
  fullWordCount = 0;

  readingProgress = 0;
  fontScale = 1; // 0.85 – 1.4

  constructor(
    private articleState: ArticleStateService,
    private router: Router,
    public bookmarkService: BookmarkService,
    private historyService: HistoryService,
    public ttsService: TtsService,
    private smartService: SmartService,
    private newsService: NewsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.article = this.articleState.get();
    if (!this.article) {
      this.router.navigate(['/']);
      return;
    }
    const savedFont = parseFloat(localStorage.getItem('zech-font') || '1');
    if (!isNaN(savedFont)) this.fontScale = Math.min(1.4, Math.max(0.85, savedFont));

    this.article = this.smartService.enrichArticle(this.article);
    this.summaryPoints = this.smartService.generateSummaryPoints(this.article);
    this.isBookmarked = this.bookmarkService.isBookmarked(this.article.url);
    this.historyService.add(this.article);
    window.scrollTo({ top: 0 });
    this.loadFullArticle();
  }

  ngOnDestroy() {
    this.ttsService.stop();
  }

  @HostListener('window:scroll')
  onScroll() {
    const el = document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    this.readingProgress = max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0;
  }

  loadFullArticle() {
    if (!this.article) return;
    this.extracting = true;
    this.extractError = '';

    this.newsService.extractArticle(this.article.url).subscribe({
      next: (data: ExtractedArticle) => {
        this.extracting = false;
        if (data.extracted && data.paragraphs.length > 0) {
          this.fullContent = data.paragraphs;
          this.fullWordCount = data.wordCount;
          this.extractedImages = (data.images || []).filter(Boolean);
          this.byline = data.byline || '';
          this.readerHtml = data.html || '';
          this.extracted = true;
          if (data.image && !this.article!.image) this.article!.image = data.image;
        }
        // Zoneless CD: async mutations must schedule a refresh themselves
        this.cdr.markForCheck();
      },
      error: () => {
        this.extracting = false;
        this.extractError = 'Could not load full article.';
        this.cdr.markForCheck();
      },
    });
  }

  get bodyFontRem(): number {
    return +(1.05 * this.fontScale).toFixed(3);
  }

  incFont() {
    this.fontScale = Math.min(1.4, +(this.fontScale + 0.1).toFixed(2));
    localStorage.setItem('zech-font', String(this.fontScale));
  }

  decFont() {
    this.fontScale = Math.max(0.85, +(this.fontScale - 0.1).toFixed(2));
    localStorage.setItem('zech-font', String(this.fontScale));
  }

  toggleBookmark() {
    if (!this.article) return;
    this.isBookmarked = this.bookmarkService.toggle(this.article);
  }

  toggleTts() {
    if (!this.article) return;
    let text: string;
    if (this.extracted && this.fullContent.length > 0) {
      text = [this.article.title, ...this.fullContent].join('. ');
    } else {
      text = [this.article.title, this.article.description, this.article.content]
        .filter(Boolean)
        .join('. ');
    }
    this.ttsService.toggle(text);
  }

  async share() {
    if (!this.article) return;
    try {
      await navigator.share({
        title: this.article.title,
        text: this.article.description,
        url: this.article.url,
      });
    } catch {}
  }

  copyLink() {
    if (!this.article) return;
    navigator.clipboard.writeText(this.article.url);
  }

  openOriginal() {
    if (!this.article) return;
    window.open(this.article.url, '_blank');
  }

  goBack() {
    this.router.navigate(['/']);
  }

  onImgError() {
    this.imgError = true;
  }

  getSentimentIconName(): string {
    switch (this.article?.sentiment) {
      case 'positive':
        return 'smile';
      case 'negative':
        return 'frown';
      default:
        return 'meh';
    }
  }

  getSentimentLabel(): string {
    return this.article?.sentiment || 'neutral';
  }

  get readingTimeFull(): number {
    if (this.fullWordCount > 0) return Math.max(1, Math.ceil(this.fullWordCount / 200));
    return this.article?.readingTime || 1;
  }
}
