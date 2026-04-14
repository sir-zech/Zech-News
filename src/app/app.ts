import { Component, OnInit, Renderer2 } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar (themeToggle)="toggleTheme()"></app-navbar>
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>
  `
})
export class App implements OnInit {
  dark = false;
  constructor(private renderer: Renderer2) {}
  ngOnInit() {
    const saved = localStorage.getItem('zech-theme');
    this.dark = saved === 'dark';
    this.applyTheme();
  }
  toggleTheme() {
    this.dark = !this.dark;
    localStorage.setItem('zech-theme', this.dark ? 'dark' : 'light');
    this.applyTheme();
  }
  applyTheme() {
    this.renderer.setAttribute(document.documentElement, 'data-theme', this.dark ? 'dark' : 'light');
  }
}