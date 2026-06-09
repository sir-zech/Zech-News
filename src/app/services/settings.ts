import { Injectable, signal, effect } from '@angular/core';

export type FeedDensity = 'card' | 'compact';

/**
 * User display preferences (Feeder-style list options), persisted to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  density = signal<FeedDensity>(
    (localStorage.getItem('zech-density') as FeedDensity) || 'card'
  );
  showImages = signal<boolean>(localStorage.getItem('zech-images') !== 'off');

  constructor() {
    effect(() => localStorage.setItem('zech-density', this.density()));
    effect(() => localStorage.setItem('zech-images', this.showImages() ? 'on' : 'off'));
  }

  toggleImages() {
    this.showImages.set(!this.showImages());
  }

  setDensity(d: FeedDensity) {
    this.density.set(d);
  }
}
