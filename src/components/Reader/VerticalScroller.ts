import { readerStore } from '@/stores';
import type { ReadingState, PageImage } from '@/types';
import { throttle } from '@/utils/dom';

export class VerticalScroller {
  private element: HTMLElement;
  private unsubscribe: (() => void) | null = null;
  private observer: IntersectionObserver | null = null;
  private currentPages: PageImage[] = [];

  constructor() {
    this.element = this.createElement();
    this.subscribeToStore();
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'vertical-scroller';
    return el;
  }

  private subscribeToStore(): void {
    this.unsubscribe = readerStore.subscribe((state) => {
      // Only re-render if pages changed
      if (state.pages !== this.currentPages) {
        this.currentPages = state.pages;
        this.renderPages(state);
      }
      this.updateZoom(state);
    });
  }

  private renderPages(state: ReadingState): void {
    this.element.innerHTML = '';
    this.observer?.disconnect();

    state.pages.forEach((page, index) => {
      const img = document.createElement('img');
      img.src = page.url;
      img.alt = `Page ${index + 1}`;
      img.dataset.pageIndex = String(index);
      img.loading = 'lazy';
      img.style.maxHeight = `${state.zoomLevel}vh`;

      this.element.appendChild(img);
    });

    this.setupPageTracking();

    // Scroll to current page if resuming
    if (state.currentPage > 0) {
      this.scrollToPage(state.currentPage);
    }
  }

  private updateZoom(state: ReadingState): void {
    const images = this.element.querySelectorAll('img');
    images.forEach((img) => {
      img.style.maxHeight = `${state.zoomLevel}vh`;
    });
  }

  private setupPageTracking(): void {
    this.observer?.disconnect();

    const handleIntersection = throttle((entries: IntersectionObserverEntry[]) => {
      const visible = entries.find((e) => e.isIntersecting);
      if (visible) {
        const pageIndex = parseInt(visible.target.getAttribute('data-page-index') || '0');
        const { currentPage } = readerStore.getState();
        if (pageIndex !== currentPage) {
          readerStore.setState({ currentPage: pageIndex });
        }
      }
    }, 100);

    this.observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.5,
      root: this.element,
    });

    this.element.querySelectorAll('img').forEach((img) => {
      this.observer!.observe(img);
    });
  }

  scrollToPage(pageIndex: number): void {
    const img = this.element.querySelector(`img[data-page-index="${pageIndex}"]`);
    if (img) {
      img.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  render(container: HTMLElement): void {
    container.appendChild(this.element);
  }

  destroy(): void {
    this.observer?.disconnect();
    this.unsubscribe?.();
    this.element.remove();
  }
}
