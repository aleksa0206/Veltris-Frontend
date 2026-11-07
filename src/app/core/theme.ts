import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

// Must match the pre-paint script in index.html.
const STORAGE_KEY = 'veltris.theme';

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Light/dark theme: the user's choice, or the operating system's when they have not chosen. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly preference = signal<ThemePreference>(readPreference());
  readonly resolved = computed(() =>
    this.preference() === 'system' ? (this.systemDark() ? 'dark' : 'light') : this.preference(),
  );

  constructor() {
    this.media?.addEventListener('change', (event) => this.systemDark.set(event.matches));
    effect(() => this.document.documentElement.setAttribute('data-theme', this.resolved()));
  }

  set(preference: ThemePreference): void {
    this.preference.set(preference);
    try {
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Private mode: the choice simply lasts for this session.
    }
  }

  toggle(): void {
    this.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }
}
