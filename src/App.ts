import { LibraryView } from '@/components/Library';
import { ReaderView } from '@/components/Reader';
import { StorageService } from '@/services';

export class App {
  private libraryView: LibraryView | null = null;
  private readerView: ReaderView | null = null;

  constructor(private container: HTMLElement) {}

  async init(): Promise<void> {
    // Initialize storage
    await StorageService.init();

    // Show library view
    this.showLibrary();
  }

  private showLibrary(): void {
    // Cleanup reader if exists
    this.readerView?.destroy();
    this.readerView = null;

    this.libraryView = new LibraryView({
      onOpenVolume: (seriesId, volumeId, fileHandle) => {
        this.openReader(fileHandle, volumeId, seriesId);
      },
      onOpenFile: (file) => {
        this.openReaderWithFile(file);
      },
    });
    this.libraryView.render(this.container);
  }

  private async openReader(fileHandle: FileSystemFileHandle, volumeId: string, seriesId: string): Promise<void> {
    // Cleanup library
    this.libraryView?.destroy();
    this.libraryView = null;

    this.readerView = new ReaderView(() => this.showLibrary());
    this.readerView.render(this.container);
    await this.readerView.loadFromHandle(fileHandle, volumeId, seriesId);
  }

  private async openReaderWithFile(file: File): Promise<void> {
    // Cleanup library
    this.libraryView?.destroy();
    this.libraryView = null;

    this.readerView = new ReaderView(() => this.showLibrary());
    this.readerView.render(this.container);
    await this.readerView.loadFile(file);
  }
}
