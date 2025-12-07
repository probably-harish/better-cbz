import type { UserSettings, ReadingState } from '@/types';
import { defaultSettings } from '@/types';

const SETTINGS_KEY = 'htmlcbz_settings';
const READING_STATE_KEY = 'htmlcbz_reading_state';
const LAST_SESSION_KEY = 'htmlcbz_last_session';

interface LastSession {
  seriesId: string;
  volumeId: string;
  page: number;
}

class SettingsServiceClass {
  getSettings(): UserSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return defaultSettings;
      return { ...defaultSettings, ...JSON.parse(stored) };
    } catch {
      return defaultSettings;
    }
  }

  saveSettings(settings: Partial<UserSettings>): void {
    const current = this.getSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
  }

  getReadingState(): Partial<ReadingState> | null {
    try {
      const stored = localStorage.getItem(READING_STATE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  saveReadingState(state: Partial<ReadingState>): void {
    // Only save serializable state (no pages/blobs)
    const { readingMode, readingDirection, zoomMode, zoomLevel, invertColors } = state;
    localStorage.setItem(
      READING_STATE_KEY,
      JSON.stringify({ readingMode, readingDirection, zoomMode, zoomLevel, invertColors })
    );
  }

  getLastSession(): LastSession | null {
    try {
      const stored = localStorage.getItem(LAST_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  saveLastSession(session: LastSession): void {
    localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(session));
  }

  clearLastSession(): void {
    localStorage.removeItem(LAST_SESSION_KEY);
  }
}

export const SettingsService = new SettingsServiceClass();
