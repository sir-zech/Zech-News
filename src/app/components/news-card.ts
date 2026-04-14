import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Article } from '../models/article.model';

@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './news-card.html',
  styleUrls: ['./news-card.scss']
})
export class NewsCardComponent {
  @Input() article!: Article;
  imgError = false;

  openArticle() { window.open(this.article.url, '_blank'); }
  onImgError() { this.imgError = true; }
}