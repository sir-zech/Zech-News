import { Injectable, signal, computed } from '@angular/core';
import { Article } from '../models/article.model';

/**
 * Reading history — last 50 opened articles, persisted to localStorage.
 * Powers the /history page and the "Continue Reading" rail on home.
 */
@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly KEY = 'zech-history';
  private readonly MAX = 50;
  private _items = signal<Article[]>(this.load());

  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);

  private load(): Article[] {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save(items: Article[]) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this._items.set(items);
  }

  add(article: Article) {
    if (!article?.url) return;
    // fullBody can be hundreds of KB — never persist it
    const { fullBody, ...slim } = article;
    const items = [slim as Article, ...this._items().filter((a) => a.url !== article.url)];
    this.save(items.slice(0, this.MAX));
  }

  remove(url: string) {
    this.save(this._items().filter((a) => a.url !== url));
  }

  clear() {
    this.save([]);
  }
}
