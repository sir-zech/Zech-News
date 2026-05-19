import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ArticleStateService } from '../services/article-state';
import { BookmarkService } from '../services/bookmark';
import { TtsService } from '../services/tts';
import { SmartService } from '../services/smart';
import { Article } from '../models/article.model';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './article-detail.html',
  styleUrls: ['./article-detail.scss']
})
export class ArticleDetailComponent implements OnInit, OnDestroy {
  article: Article | null = null;
  summaryPoints: string[] = [];
  isBookmarked = false;
  imgError = false;
  shareSupported = typeof navigator !== 'undefined' && !!navigator.share;

  constructor(
    private articleState: ArticleStateService,
    private router: Router,
    public bookmarkService: BookmarkService,
    public ttsService: TtsService,
    private smartService: SmartService
  ) {}

  ngOnInit() {
    this.article = this.articleState.get();
    if (!this.article) {
      this.router.navigate(['/']);
      return;
    }
    this.article = this.smartService.enrichArticle(this.article);
    this.summaryPoints = this.smartService.generateSummaryPoints(this.article);
    this.isBookmarked = this.bookmarkService.isBookmarked(this.article.url);
  }

  ngOnDestroy() {
    this.ttsService.stop();
  }

  toggleBookmark() {
    if (!this.article) return;
    this.isBookmarked = this.bookmarkService.toggle(this.article);
  }

  toggleTts() {
    if (!this.article) return;
    const text = [this.article.title, this.article.description, this.article.content]
      .filter(Boolean).join('. ');
    this.ttsService.toggle(text);
  }

  async share() {
    if (!this.article) return;
    try {
      await navigator.share({
        title: this.article.title,
        text: this.article.description,
        url: this.article.url
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

  getSentimentIcon(): string {
    switch (this.article?.sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  }

  getSentimentLabel(): string {
    return this.article?.sentiment || 'neutral';
  }
}
