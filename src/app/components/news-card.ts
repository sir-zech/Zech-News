import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Article } from '../models/article.model';
import { BookmarkService } from '../services/bookmark';
import { ArticleStateService } from '../services/article-state';

@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './news-card.html',
  styleUrls: ['./news-card.scss']
})
export class NewsCardComponent {
  @Input() article!: Article;
  imgError = false;

  constructor(
    private bookmarkService: BookmarkService,
    private articleState: ArticleStateService,
    private router: Router
  ) {}

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
          url: this.article.url
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(this.article.url);
    }
  }

  onImgError() { this.imgError = true; }

  get sentimentIcon(): string {
    switch (this.article.sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  }
}
