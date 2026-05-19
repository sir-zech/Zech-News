import { Injectable, signal } from '@angular/core';
import { Article } from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class ArticleStateService {
  private _article = signal<Article | null>(null);
  readonly article = this._article.asReadonly();

  set(article: Article) {
    this._article.set(article);
  }

  get(): Article | null {
    return this._article();
  }

  clear() {
    this._article.set(null);
  }
}
