import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TtsService {
  readonly speaking = signal(false);
  readonly paused = signal(false);
  private synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private utterance: SpeechSynthesisUtterance | null = null;

  speak(text: string, lang = 'en') {
    if (!this.synth) return;
    this.stop();
    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.lang = lang;
    this.utterance.rate = 0.95;
    this.utterance.pitch = 1;
    this.utterance.onend = () => {
      this.speaking.set(false);
      this.paused.set(false);
    };
    this.utterance.onerror = () => {
      this.speaking.set(false);
      this.paused.set(false);
    };
    this.speaking.set(true);
    this.synth.speak(this.utterance);
  }

  pause() {
    if (!this.synth) return;
    this.synth.pause();
    this.paused.set(true);
  }

  resume() {
    if (!this.synth) return;
    this.synth.resume();
    this.paused.set(false);
  }

  stop() {
    if (!this.synth) return;
    this.synth.cancel();
    this.speaking.set(false);
    this.paused.set(false);
    this.utterance = null;
  }

  toggle(text: string, lang = 'en') {
    if (this.speaking()) {
      if (this.paused()) {
        this.resume();
      } else {
        this.pause();
      }
    } else {
      this.speak(text, lang);
    }
  }
}
