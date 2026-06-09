import { Injectable, signal } from '@angular/core';

/**
 * Tracks which articles have been opened (read), Feeder-style — so the feed can
 * dim already-read stories. Local-only (localStorage), no account, capped size.
 */
@Injectable({ providedIn: 'root' })
export class ReadStateService {
  private readonly KEY = 'zech-read';
  private readonly MAX = 3000;
  private set = new Set<string>(this.load());

  /** Bump to let templates re-evaluate isRead() after a change. */
  version = signal(0);

  private load(): string[] {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  }

  isRead(url: string): boolean {
    return !!url && this.set.has(url);
  }

  markRead(url: string): void {
    if (url && !this.set.has(url)) {
      this.set.add(url);
      this.persist();
    }
  }

  markAllRead(urls: (string | undefined)[]): void {
    let changed = false;
    for (const u of urls) {
      if (u && !this.set.has(u)) {
        this.set.add(u);
        changed = true;
      }
    }
    if (changed) this.persist();
  }

  clearAll(): void {
    this.set.clear();
    this.persist();
  }

  private persist(): void {
    let arr = [...this.set];
    if (arr.length > this.MAX) {
      arr = arr.slice(-this.MAX);
      this.set = new Set(arr);
    }
    localStorage.setItem(this.KEY, JSON.stringify(arr));
    this.version.update((v) => v + 1);
  }
}
