import { readerStore, readerActions } from '@/stores';
import { BookService, BookLoadError } from '@/services';
import { SettingsService } from '@/services';
import { StorageService } from '@/services';
import type { ReadingState } from '@/types';
import { ReaderControls } from './ReaderControls';
import { VerticalScroller } from './VerticalScroller';
import { PagedReader } from './PagedReader';

export class ReaderView {
  private element: HTMLElement;
  private container: HTMLElement;
  private controls: ReaderControls;
  private scroller: VerticalScroller | null = null;
  private pagedReader: PagedReader | null = null;
  private unsubscribe: (() => void) | null = null;
  private currentMode: string | null = null;

  // Touch gesture state
  private touchStartX = 0;
  private touchStartY = 0;

  constructor(private onBack: () => void) {
    this.element = this.createElement();
    this.container = this.element.querySelector('.reader-container')!;
    this.controls = new ReaderControls(this.handleBack);
    this.bindEvents();
    this.subscribeToStore();
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'reader-view';
    el.innerHTML = `
      <div class="reader-container"></div>
    `;
    return el;
  }

  private bindEvents(): void {
    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown);

    // Touch gestures
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: true });

    // Click to turn page (on paged modes)
    this.container.addEventListener('click', this.handleContainerClick);

    // Fullscreen change
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
  }

  private handleBack = (): void => {
    this.saveProgress();
    this.onBack();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const state = readerStore.getState();

    // Ignore if user is typing in an input
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        state.readingDirection === 'ltr' ? readerActions.nextPage() : readerActions.prevPage();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        state.readingDirection === 'ltr' ? readerActions.prevPage() : readerActions.nextPage();
        break;
      case 'ArrowDown':
      case ' ':
        if (state.readingMode !== 'vertical-scroll') {
          e.preventDefault();
          readerActions.nextPage();
        }
        break;
      case 'ArrowUp':
        if (state.readingMode !== 'vertical-scroll') {
          e.preventDefault();
          readerActions.prevPage();
        }
        break;
      case 'Home':
        e.preventDefault();
        readerActions.goToPage(0);
        break;
      case 'End':
        e.preventDefault();
        readerActions.goToPage(state.totalPages - 1);
        break;
      case 'f':
      case 'F11':
        e.preventDefault();
        readerActions.toggleFullscreen();
        break;
      case 'i':
        e.preventDefault();
        readerActions.toggleInvertColors();
        break;
      case 'd':
        e.preventDefault();
        readerActions.toggleDirection();
        break;
      case 'v':
        e.preventDefault();
        readerActions.setReadingMode('vertical-scroll');
        break;
      case '1':
        e.preventDefault();
        readerActions.setReadingMode('single-page');
        break;
      case '2':
        e.preventDefault();
        readerActions.setReadingMode('two-page');
        break;
      case 'Escape':
        e.preventDefault();
        this.handleBack();
        break;
    }
  };

  private handleTouchStart = (e: TouchEvent): void => {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    const state = readerStore.getState();
    if (state.readingMode === 'vertical-scroll') return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;

    const SWIPE_THRESHOLD = 50;

    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        // Swipe right
        state.readingDirection === 'ltr' ? readerActions.prevPage() : readerActions.nextPage();
      } else {
        // Swipe left
        state.readingDirection === 'ltr' ? readerActions.nextPage() : readerActions.prevPage();
      }
    }
  };

  private handleContainerClick = (e: MouseEvent): void => {
    const state = readerStore.getState();
    if (state.readingMode === 'vertical-scroll') return;

    const rect = this.container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    // Click on left 30% = prev, right 30% = next
    if (clickX < width * 0.3) {
      state.readingDirection === 'ltr' ? readerActions.prevPage() : readerActions.nextPage();
    } else if (clickX > width * 0.7) {
      state.readingDirection === 'ltr' ? readerActions.nextPage() : readerActions.prevPage();
    }
  };

  private handleFullscreenChange = (): void => {
    readerStore.setState({ isFullscreen: !!document.fullscreenElement });
  };

  private subscribeToStore(): void {
    this.unsubscribe = readerStore.subscribe((state) => this.updateFromState(state));
  }

  private updateFromState(state: ReadingState): void {
    // Update invert class
    this.element.classList.toggle('inverted', state.invertColors);

    // Switch renderers based on mode
    if (state.readingMode !== this.currentMode) {
      this.switchRenderer(state.readingMode);
      this.currentMode = state.readingMode;
    }

    // Save reading state to localStorage
    SettingsService.saveReadingState(state);
  }

  private switchRenderer(mode: string): void {
    // Cleanup existing renderer
    this.scroller?.destroy();
    this.pagedReader?.destroy();
    this.scroller = null;
    this.pagedReader = null;

    // Create new renderer
    if (mode === 'vertical-scroll') {
      this.scroller = new VerticalScroller();
      this.scroller.render(this.container);
    } else {
      this.pagedReader = new PagedReader();
      this.pagedReader.render(this.container);
    }
  }

  async loadFile(file: File, volumeId?: string, seriesId?: string): Promise<void> {
    readerActions.setLoading(true);

    try {
      const pages = await BookService.loadFromFile(file);
      readerActions.setPages(pages, volumeId || file.name, file.name, seriesId);

      // Restore reading preferences
      const savedState = SettingsService.getReadingState();
      if (savedState) {
        readerStore.setState({
          readingMode: savedState.readingMode ?? 'vertical-scroll',
          readingDirection: savedState.readingDirection ?? 'ltr',
          zoomLevel: savedState.zoomLevel ?? 100,
          invertColors: savedState.invertColors ?? false,
        });
      }
    } catch (err) {
      if (err instanceof BookLoadError) {
        readerActions.setError(err.message);
      } else {
        readerActions.setError('Failed to load the comic file.');
      }
      console.error('Error loading book:', err);
    }
  }

  async loadFromHandle(handle: FileSystemFileHandle, volumeId: string, seriesId: string): Promise<void> {
    readerActions.setLoading(true);

    try {
      const file = await handle.getFile();
      const pages = await BookService.loadFromFile(file);
      readerActions.setPages(pages, volumeId, file.name, seriesId);

      // Restore reading preferences
      const savedState = SettingsService.getReadingState();
      if (savedState) {
        readerStore.setState({
          readingMode: savedState.readingMode ?? 'vertical-scroll',
          readingDirection: savedState.readingDirection ?? 'ltr',
          zoomLevel: savedState.zoomLevel ?? 100,
          invertColors: savedState.invertColors ?? false,
        });
      }

      // Restore last read page for this volume
      const series = await StorageService.getSeries(seriesId);
      if (series) {
        const volume = series.volumes.find((v) => v.id === volumeId);
        if (volume && volume.lastReadPage > 0) {
          setTimeout(() => {
            readerActions.goToPage(volume.lastReadPage);
            if (this.scroller) {
              this.scroller.scrollToPage(volume.lastReadPage);
            }
          }, 100);
        }
      }
    } catch (err) {
      if (err instanceof BookLoadError) {
        readerActions.setError(err.message);
      } else {
        readerActions.setError('Failed to load the comic file.');
      }
      console.error('Error loading book:', err);
    }
  }

  private async saveProgress(): Promise<void> {
    const { currentSeriesId, currentVolumeId, currentPage, totalPages } = readerStore.getState();

    if (currentSeriesId && currentVolumeId) {
      await StorageService.updateVolumeProgress(currentSeriesId, currentVolumeId, currentPage, totalPages);

      // Save as last session
      SettingsService.saveLastSession({
        seriesId: currentSeriesId,
        volumeId: currentVolumeId,
        page: currentPage,
      });
    }
  }

  render(container: HTMLElement): void {
    container.appendChild(this.element);
    this.controls.render(this.element);

    // Initialize with current mode
    const state = readerStore.getState();
    this.switchRenderer(state.readingMode);
    this.currentMode = state.readingMode;
  }

  destroy(): void {
    this.saveProgress();

    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);

    this.scroller?.destroy();
    this.pagedReader?.destroy();
    this.controls.destroy();
    this.unsubscribe?.();
    readerActions.cleanup();
    this.element.remove();
  }
}
