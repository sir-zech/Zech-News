import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MascotComponent } from './mascot';

const GITHUB_DONATE = 'https://github.com/sponsors/sir-zech';
const UPI_ID = 'sirzech@axl';
const PAYEE_NAME = 'Naveen';
const UPI_NOTE = 'Zech News tip';
const PRESETS = [99, 299, 499, 999];

function buildUpiUri(amount: number | null): string {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: PAYEE_NAME,
    cu: 'INR',
    tn: UPI_NOTE
  });
  if (amount && amount > 0) params.set('am', amount.toFixed(2));
  return `upi://pay?${params.toString()}`;
}

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [CommonModule, RouterLink, MascotComponent],
  templateUrl: './donate.html',
  styleUrls: ['./donate.scss']
})
export class DonateComponent {
  readonly githubUrl = GITHUB_DONATE;
  readonly upiId = UPI_ID;
  readonly payeeName = PAYEE_NAME;
  readonly presets = PRESETS;

  tab = signal<'world' | 'india'>('world');
  amount = signal<number | null>(null);
  copied = signal(false);

  upiUri = computed(() => buildUpiUri(this.amount()));

  qrSrc = computed(() => {
    const data = encodeURIComponent(this.upiUri());
    return `https://api.qrserver.com/v1/create-qr-code/?data=${data}&size=260x260&margin=10&qzone=2`;
  });

  setTab(t: 'world' | 'india') {
    this.tab.set(t);
  }

  selectAmount(v: number | null) {
    const current = this.amount();
    this.amount.set(current === v ? null : v);
  }

  async copyUpi() {
    try {
      await navigator.clipboard.writeText(this.upiId);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    } catch {
      /* ignore */
    }
  }
}
