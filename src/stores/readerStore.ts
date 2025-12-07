import { createStore } from './createStore';
import type { ReadingState, ReadingMode, ReadingDirection, PageImage } from '@/types';
import { defaultReadingState } from '@/types';

export const readerStore = createStore<ReadingState>(defaultReadingState);

export const readerActions = {
  setPages(pages: PageImage[], volumeId: string, volumeName: string, seriesId?: string): void {
    readerStore.setState({
      pages,
      totalPages: pages.length,
      currentPage: 0,
      currentVolumeId: volumeId,
      currentVolumeName: volumeName,
      currentSeriesId: seriesId ?? null,
      isLoading: false,
      error: null,
    });
  },

  goToPage(page: number): void {
    const { totalPages } = readerStore.getState();
    const clampedPage = Math.max(0, Math.min(page, totalPages - 1));
    readerStore.setState({ currentPage: clampedPage });
  },

  nextPage(): void {
    const { currentPage, totalPages, readingMode } = readerStore.getState();
    const increment = readingMode === 'two-page' ? 2 : 1;
    if (currentPage < totalPages - 1) {
      readerActions.goToPage(currentPage + increment);
    }
  },

  prevPage(): void {
    const { currentPage, readingMode } = readerStore.getState();
    const decrement = readingMode === 'two-page' ? 2 : 1;
    if (currentPage > 0) {
      readerActions.goToPage(currentPage - decrement);
    }
  },

  setReadingMode(mode: ReadingMode): void {
    readerStore.setState({ readingMode: mode });
  },

  setReadingDirection(direction: ReadingDirection): void {
    readerStore.setState({ readingDirection: direction });
  },

  toggleDirection(): void {
    const { readingDirection } = readerStore.getState();
    readerStore.setState({
      readingDirection: readingDirection === 'ltr' ? 'rtl' : 'ltr',
    });
  },

  setZoom(level: number): void {
    readerStore.setState({ zoomLevel: level, zoomMode: 'custom' });
  },

  toggleInvertColors(): void {
    const { invertColors } = readerStore.getState();
    readerStore.setState({ invertColors: !invertColors });
  },

  async toggleFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        readerStore.setState({ isFullscreen: true });
      } else {
        await document.exitFullscreen();
        readerStore.setState({ isFullscreen: false });
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  },

  setLoading(isLoading: boolean): void {
    readerStore.setState({ isLoading });
  },

  setError(error: string | null): void {
    readerStore.setState({ error, isLoading: false });
  },

  cleanup(): void {
    const { pages } = readerStore.getState();
    pages.forEach((page) => URL.revokeObjectURL(page.url));
    readerStore.reset();
  },
};
