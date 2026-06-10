import { Component, Output, EventEmitter, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BookmarkService } from '../services/bookmark';
import { LocationService } from '../services/location';
import { IconComponent } from './icon';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule, CommonModule, IconComponent],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  @Output() themeToggle = new EventEmitter<void>();

  private readonly RECENT_KEY = 'zech-recent-searches';

  searchQuery = '';
  menuOpen = false;
  dark = false;
  scrolled = false;
  showTop = false;
  recentSearches: string[] = this.loadRecent();
  showRecent = false;

  showLocationDropdown = false;
  locationQuery = '';
  locationResults: { label: string; country: string; countryCode: string; city: string }[] = [];

  categories = [
    { label: 'World', value: 'world', icon: 'globe' },
    { label: 'Tech', value: 'technology', icon: 'cpu' },
    { label: 'Business', value: 'business', icon: 'trending-up' },
    { label: 'Sports', value: 'sports', icon: 'trophy' },
    { label: 'Science', value: 'science', icon: 'atom' },
    { label: 'Health', value: 'health', icon: 'heart' }
  ];

  constructor(
    private router: Router,
    public bookmarkService: BookmarkService,
    public locationService: LocationService
  ) {
    const saved = localStorage.getItem('zech-theme');
    this.dark = saved === 'dark';
  }

  private loadRecent(): string[] {
    try {
      return JSON.parse(localStorage.getItem(this.RECENT_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveRecent(q: string) {
    this.recentSearches = [q, ...this.recentSearches.filter((s) => s !== q)].slice(0, 6);
    localStorage.setItem(this.RECENT_KEY, JSON.stringify(this.recentSearches));
  }

  clearRecent(e?: Event) {
    e?.stopPropagation();
    this.recentSearches = [];
    localStorage.removeItem(this.RECENT_KEY);
    this.showRecent = false;
  }

  onSearch() {
    const q = this.searchQuery.trim();
    if (q) {
      this.saveRecent(q);
      this.router.navigate(['/category', 'search'], { queryParams: { q } });
      this.menuOpen = false;
      this.showRecent = false;
    }
  }

  searchRecent(term: string) {
    this.searchQuery = term;
    this.onSearch();
  }

  onSearchFocus() {
    this.showRecent = this.recentSearches.length > 0;
  }

  toggle() {
    this.dark = !this.dark;
    localStorage.setItem('zech-theme', this.dark ? 'dark' : 'light');
    this.themeToggle.emit();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) this.showLocationDropdown = false;
  }

  toggleLocationDropdown(e?: Event) {
    e?.stopPropagation();
    this.showLocationDropdown = !this.showLocationDropdown;
    if (!this.showLocationDropdown) {
      this.locationQuery = '';
      this.locationResults = [];
    }
    if (this.showLocationDropdown) this.menuOpen = false;
  }

  onLocationSearch() {
    this.locationResults = this.locationService.searchLocations(this.locationQuery);
  }

  selectLocation(result: { label: string; country: string; countryCode: string; city: string }) {
    this.locationService.setManual(result.country, result.countryCode, result.city);
    this.locationQuery = '';
    this.locationResults = [];
    this.showLocationDropdown = false;
  }

  autoDetectLocation() {
    (this.locationService as any).cached = null;
    this.showLocationDropdown = false;
    this.locationQuery = '';
    this.locationResults = [];
    this.locationService.detect();
  }

  scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('.navbar')) {
      this.menuOpen = false;
    }
    if (!target.closest('.loc-wrap')) {
      this.showLocationDropdown = false;
      this.locationQuery = '';
      this.locationResults = [];
    }
    if (!target.closest('.search-wrap')) {
      this.showRecent = false;
    }
  }

  @HostListener('window:scroll', [])
  onScroll() {
    this.scrolled = window.scrollY > 20;
    this.showTop = window.scrollY > 700;
  }
}
