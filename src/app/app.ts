import { Component, OnInit, Renderer2, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
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
    @if (updateAvailable) {
      <div class="sw-update-toast">
        <span>New version available</span>
        <button (click)="reloadForUpdate()">Reload</button>
      </div>
    }
  `,
  styles: [`
    .sw-update-toast {
      position: fixed;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: #2563eb;
      color: white;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 1rem;
      z-index: 9999;
      font-size: 0.9rem;
    }
    .sw-update-toast button {
      background: white;
      color: #2563eb;
      border: none;
      padding: 0.4rem 0.9rem;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class App implements OnInit {
  dark = false;
  updateAvailable = false;
  private swUpdate = inject(SwUpdate, { optional: true });
  constructor(private renderer: Renderer2) {}
  ngOnInit() {
    const saved = localStorage.getItem('zech-theme');
    this.dark = saved === 'dark';
    this.applyTheme();
    this.watchForUpdates();
  }
  toggleTheme() {
    this.dark = !this.dark;
    localStorage.setItem('zech-theme', this.dark ? 'dark' : 'light');
    this.applyTheme();
  }
  applyTheme() {
    this.renderer.setAttribute(document.documentElement, 'data-theme', this.dark ? 'dark' : 'light');
  }
  private watchForUpdates() {
    if (!this.swUpdate?.isEnabled) return;
    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => (this.updateAvailable = true));
  }
  reloadForUpdate() {
    this.swUpdate?.activateUpdate().then(() => document.location.reload());
  }
}