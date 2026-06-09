import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Article } from '../models/article.model';
import { BookmarkService } from '../services/bookmark';
import { ArticleStateService } from '../services/article-state';
import { TimeAgoPipe } from '../pipes/time-ago.pipe';
import { ImgProxyPipe, FaviconPipe } from '../pipes/img-proxy.pipe';

@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [CommonModule, TimeAgoPipe, ImgProxyPipe, FaviconPipe],
  templateUrl: './news-card.html',
  styleUrls: ['./news-card.scss'],
})
export class NewsCardComponent {
  @Input() article!: Article;
  /** Compact thumbnail-left list row (used by secondary feed sections). */
  @Input() compact = false;
  imgError = false;
  faviconError = false;

  constructor(
    private bookmarkService: BookmarkService,
    private articleState: ArticleStateService,
    private router: Router
  ) {}

  get hasImage(): boolean {
    return !!this.article.image && !this.imgError;
  }

  get domainInitial(): string {
    try {
      const host = new URL(this.article.url).hostname.replace('www.', '');
      return host.charAt(0).toUpperCase();
    } catch {
      return this.article.source?.name?.charAt(0)?.toUpperCase() || 'Z';
    }
  }

  get domainName(): string {
    try {
      return new URL(this.article.url).hostname.replace('www.', '');
    } catch {
      return this.article.source?.name || '';
    }
  }

  openArticle(e: Event) {
    e.stopPropagation();
    this.articleState.set(this.article);
    this.router.navigate(['/article']);
  }

  toggleBookmark(e: Event) {
    e.stopPropagation();
    this.bookmarkService.toggle(this.article);
  }

  isBookmarked(): boolean {
    return this.bookmarkService.isBookmarked(this.article.url);
  }

  async share(e: Event) {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: this.article.title,
          text: this.article.description,
          url: this.article.url,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(this.article.url);
    }
  }

  onImgError() {
    this.imgError = true;
  }
  onFaviconError() {
    this.faviconError = true;
  }

  get sentimentIcon(): string {
    switch (this.article.sentiment) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😟';
      default:
        return '😐';
    }
  }
}
