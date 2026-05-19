import { Injectable, signal, computed } from '@angular/core';
import { Article } from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private readonly KEY = 'zech-bookmarks';
  private _bookmarks = signal<Article[]>(this.load());

  readonly bookmarks = this._bookmarks.asReadonly();
  readonly count = computed(() => this._bookmarks().length);

  private load(): Article[] {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save(items: Article[]) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this._bookmarks.set(items);
  }

  toggle(article: Article): boolean {
    const items = [...this._bookmarks()];
    const idx = items.findIndex(b => b.url === article.url);
    if (idx >= 0) {
      items.splice(idx, 1);
      this.save(items);
      return false;
    }
    items.unshift(article);
    this.save(items);
    return true;
  }

  isBookmarked(url: string): boolean {
    return this._bookmarks().some(b => b.url === url);
  }

  remove(url: string) {
    this.save(this._bookmarks().filter(b => b.url !== url));
  }

  clear() {
    this.save([]);
  }
}
