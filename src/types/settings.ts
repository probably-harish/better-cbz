import type { ReadingMode, ReadingDirection, ZoomMode } from './reader';

export interface UserSettings {
  defaultReadingMode: ReadingMode;
  defaultReadingDirection: ReadingDirection;
  defaultZoomMode: ZoomMode;
  defaultZoomLevel: number;
  rememberLastBook: boolean;
}

export const defaultSettings: UserSettings = {
  defaultReadingMode: 'vertical-scroll',
  defaultReadingDirection: 'ltr',
  defaultZoomMode: 'fit-width',
  defaultZoomLevel: 100,
  rememberLastBook: true,
};
