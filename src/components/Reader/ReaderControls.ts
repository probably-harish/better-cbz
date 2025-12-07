import { readerStore, readerActions } from '@/stores';
import type { ReadingMode, ReadingState } from '@/types';
import { $ } from '@/utils/dom';

export class ReaderControls {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(private onBack: () => void) {
    this.element = this.createElement();
    this.bindEvents();
    this.subscribeToStore();
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'reader-controls';
    el.innerHTML = `
      <div class="controls-bar">
        <button class="btn-back" aria-label="Back to library" title="Back (Esc)">
          ← Back
        </button>

        <div class="control-group page-nav">
          <button class="btn-prev" aria-label="Previous page" title="Previous (←)">◀</button>
          <span class="page-counter">0 / 0</span>
          <button class="btn-next" aria-label="Next page" title="Next (→)">▶</button>
        </div>

        <div class="control-group reading-modes">
          <button class="btn-mode" data-mode="vertical-scroll" title="Vertical Scroll (V)">↕</button>
          <button class="btn-mode" data-mode="single-page" title="Single Page (1)">☐</button>
          <button class="btn-mode" data-mode="two-page" title="Two Page Spread (2)">☐☐</button>
        </div>

        <button class="btn-direction" aria-label="Toggle reading direction" title="Toggle LTR/RTL (D)">
          LTR
        </button>

        <div class="control-group zoom">
          <input type="range" class="zoom-slider" min="50" max="200" value="100" aria-label="Zoom level" />
          <span class="zoom-value">100%</span>
        </div>

        <div class="quick-actions">
          <button class="btn-invert" aria-label="Invert colors" title="Invert Colors (I)">◐</button>
          <button class="btn-fullscreen" aria-label="Fullscreen" title="Fullscreen (F)">⛶</button>
        </div>
      </div>
    `;
    return el;
  }

  private bindEvents(): void {
    // Navigation
    $('.btn-back', this.element)?.addEventListener('click', this.onBack);
    $('.btn-prev', this.element)?.addEventListener('click', () => readerActions.prevPage());
    $('.btn-next', this.element)?.addEventListener('click', () => readerActions.nextPage());

    // Reading modes
    this.element.querySelectorAll('.btn-mode').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as ReadingMode;
        readerActions.setReadingMode(mode);
      });
    });

    // Direction
    $('.btn-direction', this.element)?.addEventListener('click', () => readerActions.toggleDirection());

    // Zoom
    const zoomSlider = $('.zoom-slider', this.element) as HTMLInputElement;
    zoomSlider?.addEventListener('input', () => {
      readerActions.setZoom(parseInt(zoomSlider.value));
    });

    // Quick actions
    $('.btn-invert', this.element)?.addEventListener('click', () => readerActions.toggleInvertColors());
    $('.btn-fullscreen', this.element)?.addEventListener('click', () => readerActions.toggleFullscreen());
  }

  private subscribeToStore(): void {
    this.unsubscribe = readerStore.subscribe((state) => this.updateFromState(state));
  }

  private updateFromState(state: ReadingState): void {
    // Page counter
    const counter = $('.page-counter', this.element);
    if (counter) {
      counter.textContent = `${state.currentPage + 1} / ${state.totalPages}`;
    }

    // Reading mode buttons
    this.element.querySelectorAll('.btn-mode').forEach((btn) => {
      const mode = (btn as HTMLElement).dataset.mode;
      btn.classList.toggle('active', mode === state.readingMode);
    });

    // Direction button
    const dirBtn = $('.btn-direction', this.element);
    if (dirBtn) {
      dirBtn.textContent = state.readingDirection.toUpperCase();
    }

    // Zoom
    const zoomSlider = $('.zoom-slider', this.element) as HTMLInputElement;
    const zoomValue = $('.zoom-value', this.element);
    if (zoomSlider) zoomSlider.value = String(state.zoomLevel);
    if (zoomValue) zoomValue.textContent = `${state.zoomLevel}%`;

    // Navigation buttons state
    const prevBtn = $('.btn-prev', this.element) as HTMLButtonElement;
    const nextBtn = $('.btn-next', this.element) as HTMLButtonElement;
    if (prevBtn) prevBtn.disabled = state.currentPage <= 0;
    if (nextBtn) nextBtn.disabled = state.currentPage >= state.totalPages - 1;
  }

  render(container: HTMLElement): void {
    container.appendChild(this.element);
  }

  destroy(): void {
    this.unsubscribe?.();
    this.element.remove();
  }
}
