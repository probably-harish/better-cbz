import { readerStore } from '@/stores';
import type { ReadingState, PageImage } from '@/types';

export class PagedReader {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.element = this.createElement();
    this.subscribeToStore();
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'paged-reader';
    return el;
  }

  private subscribeToStore(): void {
    this.unsubscribe = readerStore.subscribe((state) => this.renderPages(state));
  }

  private renderPages(state: ReadingState): void {
    const { pages, currentPage, readingMode, readingDirection, zoomLevel } = state;

    this.element.innerHTML = '';

    if (pages.length === 0) return;

    if (readingMode === 'single-page') {
      this.renderSinglePage(pages[currentPage], zoomLevel);
    } else if (readingMode === 'two-page') {
      this.renderTwoPageSpread(pages, currentPage, readingDirection, zoomLevel);
    }
  }

  private renderSinglePage(page: PageImage | undefined, zoom: number): void {
    if (!page) return;

    const img = document.createElement('img');
    img.src = page.url;
    img.alt = `Page ${page.index + 1}`;
    img.style.maxHeight = `${zoom}vh`;
    img.style.maxWidth = '100%';

    this.element.appendChild(img);
  }

  private renderTwoPageSpread(
    pages: PageImage[],
    currentPage: number,
    direction: 'ltr' | 'rtl',
    zoom: number
  ): void {
    const container = document.createElement('div');
    container.className = 'two-page-spread';

    // For two-page spread, we show currentPage and currentPage+1
    // Direction affects which side each page appears on
    const leftIndex = direction === 'ltr' ? currentPage : currentPage + 1;
    const rightIndex = direction === 'ltr' ? currentPage + 1 : currentPage;

    const leftPage = pages[leftIndex];
    const rightPage = pages[rightIndex];

    if (leftPage) {
      const img = document.createElement('img');
      img.src = leftPage.url;
      img.alt = `Page ${leftPage.index + 1}`;
      img.style.maxHeight = `${zoom}vh`;
      container.appendChild(img);
    }

    if (rightPage) {
      const img = document.createElement('img');
      img.src = rightPage.url;
      img.alt = `Page ${rightPage.index + 1}`;
      img.style.maxHeight = `${zoom}vh`;
      container.appendChild(img);
    }

    this.element.appendChild(container);
  }

  render(container: HTMLElement): void {
    container.appendChild(this.element);
  }

  destroy(): void {
    this.unsubscribe?.();
    this.element.remove();
  }
}
