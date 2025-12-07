import type { Series, Volume } from '@/types';
import { $ } from '@/utils/dom';

export class VolumeList {
  private element: HTMLElement;

  constructor(
    private series: Series,
    private onSelectVolume: (volume: Volume) => void,
    private onClose: () => void
  ) {
    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'volume-list-overlay';

    el.innerHTML = `
      <div class="volume-list">
        <div class="volume-list__header">
          <h2>${this.series.name}</h2>
          <button class="btn-close" aria-label="Close">✕</button>
        </div>
        <div class="volume-list__content">
          ${this.series.volumes.length === 0
            ? '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--spacing-lg);">No volumes found in this folder.</p>'
            : this.series.volumes.map((volume) => this.renderVolumeItem(volume)).join('')
          }
        </div>
      </div>
    `;

    return el;
  }

  private renderVolumeItem(volume: Volume): string {
    const progress = volume.totalPages > 0
      ? `${volume.lastReadPage + 1} / ${volume.totalPages}`
      : volume.lastReadPage > 0
        ? `Page ${volume.lastReadPage + 1}`
        : 'Not started';

    return `
      <div class="volume-item" data-volume-id="${volume.id}" role="button" tabindex="0">
        <span class="volume-item__name" title="${volume.filename}">${volume.filename}</span>
        <span class="volume-item__progress">${progress}</span>
      </div>
    `;
  }

  private bindEvents(): void {
    // Close button
    $('.btn-close', this.element)?.addEventListener('click', this.onClose);

    // Click outside to close
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.onClose();
      }
    });

    // Escape to close
    document.addEventListener('keydown', this.handleKeyDown);

    // Volume selection
    this.element.querySelectorAll('.volume-item').forEach((item) => {
      item.addEventListener('click', () => {
        const volumeId = (item as HTMLElement).dataset.volumeId;
        const volume = this.series.volumes.find((v) => v.id === volumeId);
        if (volume) {
          this.onSelectVolume(volume);
        }
      });

      item.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
          e.preventDefault();
          const volumeId = (item as HTMLElement).dataset.volumeId;
          const volume = this.series.volumes.find((v) => v.id === volumeId);
          if (volume) {
            this.onSelectVolume(volume);
          }
        }
      });
    });
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.onClose();
    }
  };

  render(container: HTMLElement): void {
    container.appendChild(this.element);
    // Focus the close button for accessibility
    ($('.btn-close', this.element) as HTMLElement)?.focus();
  }

  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.element.remove();
  }
}
