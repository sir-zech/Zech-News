import { Injectable } from '@angular/core';
import { Article } from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class SmartService {

  enrichArticle(article: Article): Article {
    return {
      ...article,
      readingTime: this.estimateReadingTime(article),
      sentiment: this.analyzeSentiment(article.title + ' ' + (article.description || '')),
      keywords: this.extractKeywords(article.title + ' ' + (article.description || ''))
    };
  }

  enrichAll(articles: Article[]): Article[] {
    return articles.map(a => this.enrichArticle(a));
  }

  estimateReadingTime(article: Article): number {
    const text = [article.title, article.description, article.content].filter(Boolean).join(' ');
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const lower = text.toLowerCase();
    const positive = ['win', 'success', 'grow', 'gain', 'boost', 'rise', 'breakthrough', 'improve',
      'celebrate', 'launch', 'achieve', 'record', 'best', 'great', 'good', 'hope', 'save',
      'discover', 'innovation', 'progress', 'support', 'hero', 'recover', 'thrive'];
    const negative = ['kill', 'death', 'crash', 'fail', 'crisis', 'attack', 'war', 'disaster',
      'collapse', 'threat', 'fear', 'lose', 'worst', 'ban', 'strike', 'bomb', 'fraud',
      'scandal', 'victim', 'suffer', 'decline', 'danger', 'warning', 'tragic'];

    let score = 0;
    for (const w of positive) { if (lower.includes(w)) score++; }
    for (const w of negative) { if (lower.includes(w)) score--; }

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
      'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
      'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
      'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
      'just', 'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up',
      'that', 'this', 'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i',
      'his', 'her', 'their', 'our', 'your', 'my', 'what', 'which', 'who',
      'whom', 'new', 'said', 'says', 'also', 'one', 'two', 'first', 'last',
      'many', 'much', 'well', 'back', 'even', 'still', 'way', 'take', 'come'
    ]);

    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const freq = new Map<string, number>();

    for (const w of words) {
      if (w.length > 2 && !stopWords.has(w)) {
        freq.set(w, (freq.get(w) || 0) + 1);
      }
    }

    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  generateSummaryPoints(article: Article): string[] {
    const text = [article.description, article.content].filter(Boolean).join('. ');
    const sentences = text
      .replace(/\[\+\d+ chars\]/, '')
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 20);

    if (sentences.length === 0) return [article.title];
    return sentences.slice(0, 4).map(s => s.trim());
  }

  getTrendingTopics(articles: Article[]): string[] {
    const allKeywords = articles.flatMap(a => a.keywords || this.extractKeywords(a.title));
    const freq = new Map<string, number>();
    for (const k of allKeywords) {
      freq.set(k, (freq.get(k) || 0) + 1);
    }
    return [...freq.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);
  }
}
