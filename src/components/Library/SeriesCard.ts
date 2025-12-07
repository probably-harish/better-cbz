import type { Series } from '@/types';
import { StorageService } from '@/services';

export class SeriesCard {
  private element: HTMLElement;
  private coverUrl: string | null = null;

  constructor(
    private series: Series,
    private onOpen: () => void,
    private onRemove: () => void
  ) {
    this.element = this.createElement();
    this.bindEvents();
    this.loadCover();
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'series-card';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    const volumeCount = this.series.volumes.length;
    const readCount = this.series.volumes.filter((v) => v.lastReadPage > 0).length;

    el.innerHTML = `
      <div class="series-card__cover">
        <div class="placeholder">📚</div>
      </div>
      <div class="series-card__info">
        <h3 class="series-card__title" title="${this.series.name}">${this.series.name}</h3>
        <p class="series-card__meta">${volumeCount} volume${volumeCount !== 1 ? 's' : ''}${readCount > 0 ? `, ${readCount} started` : ''}</p>
      </div>
      <div class="series-card__actions">
        <button class="btn-open primary">Open</button>
        <button class="btn-remove">Remove</button>
      </div>
    `;

    return el;
  }

  private bindEvents(): void {
    // Click/keyboard on card to open
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('button')) {
        this.onOpen();
      }
    });

    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.onOpen();
      }
    });

    // Button actions
    this.element.querySelector('.btn-open')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onOpen();
    });

    this.element.querySelector('.btn-remove')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onRemove();
    });
  }

  private async loadCover(): Promise<void> {
    try {
      const coverBlob = await StorageService.getCoverImage(this.series.id);
      if (coverBlob) {
        this.coverUrl = URL.createObjectURL(coverBlob);
        const coverDiv = this.element.querySelector('.series-card__cover');
        if (coverDiv) {
          coverDiv.innerHTML = `<img src="${this.coverUrl}" alt="${this.series.name} cover" loading="lazy" />`;
        }
      }
    } catch (err) {
      console.error('Failed to load cover:', err);
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.coverUrl) {
      URL.revokeObjectURL(this.coverUrl);
    }
  }
}
