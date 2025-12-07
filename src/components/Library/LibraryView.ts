import { libraryStore, libraryActions } from '@/stores';
import { FileSystemService, StorageService, BookService } from '@/services';
import type { LibraryState, Series, Volume } from '@/types';
import { generateId } from '@/utils/dom';
import { SeriesCard } from './SeriesCard';
import { VolumeList } from './VolumeList';

interface LibraryViewOptions {
  onOpenVolume: (seriesId: string, volumeId: string, fileHandle: FileSystemFileHandle) => void;
  onOpenFile: (file: File) => void;
}

export class LibraryView {
  private element: HTMLElement;
  private seriesCards: SeriesCard[] = [];
  private volumeList: VolumeList | null = null;
  private unsubscribe: (() => void) | null = null;
  private directoryHandles: Map<string, FileSystemDirectoryHandle> = new Map();

  constructor(private options: LibraryViewOptions) {
    this.element = this.createElement();
    this.bindEvents();
    this.subscribeToStore();
    this.loadLibrary();
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'library-view';

    const isSupported = FileSystemService.isSupported();

    el.innerHTML = `
      <header class="library-header">
        <h1>Comic Library</h1>
        <div class="actions">
          ${isSupported ? '<button class="btn-add-folder primary">+ Add Folder</button>' : ''}
          <button class="btn-open-file">Open File</button>
        </div>
      </header>
      ${!isSupported ? `
        <div class="browser-notice">
          <p>Your browser doesn't support the File System Access API. You can still open individual comic files, but library features won't be available.</p>
          <p>For full features, use Chrome or Edge.</p>
        </div>
      ` : ''}
      <div class="library-content">
        <div class="library-empty">
          <h2>Your library is empty</h2>
          <p>${isSupported
            ? 'Click "Add Folder" to add a folder containing your comic files (.cbz, .cbr)'
            : 'Click "Open File" to open a comic file'}</p>
          ${isSupported ? '<button class="btn-add-folder-empty primary">+ Add Folder</button>' : ''}
        </div>
        <div class="series-grid"></div>
      </div>
      <input type="file" class="file-input hidden" accept=".cbz,.cbr" />
    `;

    return el;
  }

  private bindEvents(): void {
    // Add folder button
    this.element.querySelectorAll('.btn-add-folder, .btn-add-folder-empty').forEach((btn) => {
      btn.addEventListener('click', () => this.handleAddFolder());
    });

    // Open file button
    this.element.querySelector('.btn-open-file')?.addEventListener('click', () => {
      (this.element.querySelector('.file-input') as HTMLInputElement)?.click();
    });

    // File input change
    this.element.querySelector('.file-input')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.options.onOpenFile(file);
      }
    });
  }

  private subscribeToStore(): void {
    this.unsubscribe = libraryStore.subscribe((state) => this.updateFromState(state));
  }

  private async loadLibrary(): Promise<void> {
    libraryActions.setLoading(true);

    try {
      // Load series from IndexedDB
      const series = await StorageService.getAllSeries();

      // Load directory handles and verify permissions
      const handles = await StorageService.getAllDirectoryHandles();
      this.directoryHandles = handles;

      // Verify we still have permission for each handle
      const validSeries: Series[] = [];
      for (const s of series) {
        const handle = handles.get(s.id);
        if (handle) {
          const hasPermission = await FileSystemService.verifyPermission(handle);
          if (hasPermission) {
            // Re-scan for volumes in case files changed
            const volumes = await this.scanVolumes(handle, s.volumes);
            validSeries.push({ ...s, volumes });
          }
        }
      }

      libraryActions.setSeries(validSeries);
    } catch (err) {
      console.error('Failed to load library:', err);
      libraryActions.setError('Failed to load library');
    }
  }

  private async scanVolumes(handle: FileSystemDirectoryHandle, existingVolumes: Volume[]): Promise<Volume[]> {
    const fileHandles = await FileSystemService.scanForCBZFiles(handle);
    const existingMap = new Map(existingVolumes.map((v) => [v.filename, v]));

    const volumes: Volume[] = [];
    for (const fileHandle of fileHandles) {
      const existing = existingMap.get(fileHandle.name);
      volumes.push({
        id: existing?.id || generateId(),
        filename: fileHandle.name,
        fileHandle,
        lastReadPage: existing?.lastReadPage || 0,
        totalPages: existing?.totalPages || 0,
        dateAdded: existing?.dateAdded || Date.now(),
        lastReadDate: existing?.lastReadDate,
      });
    }

    return volumes;
  }

  private async handleAddFolder(): Promise<void> {
    try {
      const handle = await FileSystemService.requestDirectoryAccess();
      if (!handle) return; // User cancelled

      libraryActions.setLoading(true);

      // Scan for CBZ files
      const fileHandles = await FileSystemService.scanForCBZFiles(handle);

      // Create volumes
      const volumes: Volume[] = fileHandles.map((fh) => ({
        id: generateId(),
        filename: fh.name,
        fileHandle: fh,
        lastReadPage: 0,
        totalPages: 0,
        dateAdded: Date.now(),
      }));

      // Create series
      const series: Series = {
        id: generateId(),
        name: handle.name,
        path: handle.name,
        volumes,
        dateAdded: Date.now(),
      };

      // Extract cover from first volume
      if (fileHandles.length > 0) {
        try {
          const firstFile = await fileHandles[0].getFile();
          const coverBlob = await BookService.extractCoverImage(firstFile);
          if (coverBlob) {
            await StorageService.saveCoverImage(series.id, coverBlob);
          }
        } catch (err) {
          console.error('Failed to extract cover:', err);
        }
      }

      // Save to IndexedDB
      await StorageService.saveSeries(series);
      await StorageService.saveDirectoryHandle(series.id, handle);

      // Update store
      this.directoryHandles.set(series.id, handle);
      libraryActions.addSeries(series);
    } catch (err) {
      console.error('Failed to add folder:', err);
      libraryActions.setError('Failed to add folder');
    }
  }

  private async handleRemoveSeries(seriesId: string): Promise<void> {
    if (!confirm('Remove this series from your library?')) return;

    await StorageService.deleteSeries(seriesId);
    this.directoryHandles.delete(seriesId);
    libraryActions.removeSeries(seriesId);
  }

  private handleOpenSeries(series: Series): void {
    this.volumeList?.destroy();
    this.volumeList = new VolumeList(
      series,
      (volume) => this.handleSelectVolume(series.id, volume),
      () => {
        this.volumeList?.destroy();
        this.volumeList = null;
      }
    );
    this.volumeList.render(this.element);
  }

  private async handleSelectVolume(seriesId: string, volume: Volume): Promise<void> {
    // Get the file handle
    const handle = this.directoryHandles.get(seriesId);
    if (!handle) {
      console.error('No directory handle for series');
      return;
    }

    try {
      // Get fresh file handle
      const fileHandle = volume.fileHandle || (await this.getFileHandle(handle, volume.filename));
      if (fileHandle) {
        this.volumeList?.destroy();
        this.volumeList = null;
        this.options.onOpenVolume(seriesId, volume.id, fileHandle);
      }
    } catch (err) {
      console.error('Failed to open volume:', err);
    }
  }

  private async getFileHandle(directoryHandle: FileSystemDirectoryHandle, filename: string): Promise<FileSystemFileHandle | null> {
    try {
      return await directoryHandle.getFileHandle(filename);
    } catch {
      return null;
    }
  }

  private updateFromState(state: LibraryState): void {
    const emptyEl = this.element.querySelector('.library-empty') as HTMLElement;
    const gridEl = this.element.querySelector('.series-grid') as HTMLElement;

    if (state.series.length === 0) {
      emptyEl?.classList.remove('hidden');
      gridEl?.classList.add('hidden');
    } else {
      emptyEl?.classList.add('hidden');
      gridEl?.classList.remove('hidden');
      this.renderSeriesGrid(state.series);
    }
  }

  private renderSeriesGrid(seriesList: Series[]): void {
    const gridEl = this.element.querySelector('.series-grid') as HTMLElement;
    if (!gridEl) return;

    // Cleanup old cards
    this.seriesCards.forEach((card) => card.destroy());
    this.seriesCards = [];
    gridEl.innerHTML = '';

    // Create new cards
    seriesList.forEach((series) => {
      const card = new SeriesCard(
        series,
        () => this.handleOpenSeries(series),
        () => this.handleRemoveSeries(series.id)
      );
      this.seriesCards.push(card);
      gridEl.appendChild(card.getElement());
    });
  }

  render(container: HTMLElement): void {
    container.appendChild(this.element);
  }

  destroy(): void {
    this.volumeList?.destroy();
    this.seriesCards.forEach((card) => card.destroy());
    this.unsubscribe?.();
    this.element.remove();
  }
}
