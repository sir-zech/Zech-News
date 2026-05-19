import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BookmarkService } from '../services/bookmark';
import { ArticleStateService } from '../services/article-state';
import { NewsCardComponent } from './news-card';
import { Article } from '../models/article.model';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [CommonModule, NewsCardComponent],
  templateUrl: './bookmarks.html',
  styleUrls: ['./bookmarks.scss']
})
export class BookmarksComponent {
  constructor(
    public bookmarkService: BookmarkService,
    private articleState: ArticleStateService,
    private router: Router
  ) {}

  openArticle(article: Article) {
    this.articleState.set(article);
    this.router.navigate(['/article']);
  }

  clearAll() {
    this.bookmarkService.clear();
  }
}
