import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryService } from '../services/history';
import { NewsCardComponent } from './news-card';
import { IconComponent } from './icon';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, NewsCardComponent, IconComponent],
  templateUrl: './history.html',
  styleUrls: ['./history.scss'],
})
export class HistoryComponent {
  constructor(public historyService: HistoryService) {}

  clearAll() {
    this.historyService.clear();
  }
}
