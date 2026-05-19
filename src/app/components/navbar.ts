import { Component, Output, EventEmitter, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BookmarkService } from '../services/bookmark';
import { LocationService } from '../services/location';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule, CommonModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  @Output() themeToggle = new EventEmitter<void>();

  searchQuery = '';
  menuOpen = false;
  dark = false;
  scrolled = false;

  showLocationDropdown = false;
  locationQuery = '';
  locationResults: { label: string; country: string; countryCode: string; city: string }[] = [];

  categories = [
    { label: 'World', value: 'world', icon: '🌍' },
    { label: 'Tech', value: 'technology', icon: '💻' },
    { label: 'Business', value: 'business', icon: '📈' },
    { label: 'Sports', value: 'sports', icon: '⚽' },
    { label: 'Science', value: 'science', icon: '🔬' },
    { label: 'Health', value: 'health', icon: '❤️' }
  ];

  constructor(
    private router: Router,
    public bookmarkService: BookmarkService,
    public locationService: LocationService
  ) {
    const saved = localStorage.getItem('zech-theme');
    this.dark = saved === 'dark';
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/category', 'search'], {
        queryParams: { q: this.searchQuery }
      });
      this.menuOpen = false;
    }
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
  }

  @HostListener('window:scroll', [])
  onScroll() {
    this.scrolled = window.scrollY > 20;
  }
}
