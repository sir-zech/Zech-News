import { Component, Output, EventEmitter, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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

  // ✅ FIX: scroll state
  scrolled = false;

  categories = [
    { label: 'World', value: 'world', icon: '🌍' },
    { label: 'Tech', value: 'technology', icon: '💻' },
    { label: 'Business', value: 'business', icon: '📈' },
    { label: 'Sports', value: 'sports', icon: '⚽' },
    { label: 'Science', value: 'science', icon: '🔬' },
    { label: 'Health', value: 'health', icon: '❤️' }
  ];

  constructor(private router: Router) {
    const saved = localStorage.getItem('zech-theme');
    this.dark = saved === 'dark';
  }

  // 🔍 Search
  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/category', 'search'], {
        queryParams: { q: this.searchQuery }
      });
      this.menuOpen = false;
    }
  }

  // 🌙 Theme toggle
  toggle() {
    this.dark = !this.dark;
    localStorage.setItem('zech-theme', this.dark ? 'dark' : 'light');
    this.themeToggle.emit();
  }

  // 🍔 Mobile menu
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  // 📱 Close menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('.navbar')) {
      this.menuOpen = false;
    }
  }

  // 🚀 Scroll detection (WORKS on mobile too)
  @HostListener('window:scroll', [])
  onScroll() {
    this.scrolled = window.scrollY > 20;
  }
}