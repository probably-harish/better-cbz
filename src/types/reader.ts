export type ReadingMode = 'vertical-scroll' | 'single-page' | 'two-page';
export type ReadingDirection = 'ltr' | 'rtl';
export type ZoomMode = 'fit-width' | 'fit-height' | 'custom';

export interface PageImage {
  index: number;
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

export interface ReadingState {
  currentSeriesId: string | null;
  currentVolumeId: string | null;
  currentVolumeName: string | null;
  currentPage: number;
  totalPages: number;
  pages: PageImage[];
  readingMode: ReadingMode;
  readingDirection: ReadingDirection;
  zoomMode: ZoomMode;
  zoomLevel: number;
  invertColors: boolean;
  isFullscreen: boolean;
  isLoading: boolean;
  error: string | null;
}

export const defaultReadingState: ReadingState = {
  currentSeriesId: null,
  currentVolumeId: null,
  currentVolumeName: null,
  currentPage: 0,
  totalPages: 0,
  pages: [],
  readingMode: 'vertical-scroll',
  readingDirection: 'ltr',
  zoomMode: 'fit-width',
  zoomLevel: 100,
  invertColors: false,
  isFullscreen: false,
  isLoading: false,
  error: null,
};
