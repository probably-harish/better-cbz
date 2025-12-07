import JSZip from 'jszip';
import type { PageImage } from '@/types';

export class BookLoadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'BookLoadError';
  }
}

class BookServiceClass {
  async loadFromFile(file: File): Promise<PageImage[]> {
    const zip = new JSZip();
    const zipData = await file.arrayBuffer();

    let contents: JSZip;
    try {
      contents = await zip.loadAsync(zipData);
    } catch (err) {
      throw new BookLoadError(
        `Failed to load ${file.name}. It may be 7z encoded. Please use zip-encoded CBZ files only.`,
        err
      );
    }

    return this.extractImages(contents);
  }

  async loadFromHandle(handle: FileSystemFileHandle): Promise<PageImage[]> {
    const file = await handle.getFile();
    return this.loadFromFile(file);
  }

  private async extractImages(zip: JSZip): Promise<PageImage[]> {
    const imageFiles = Object.keys(zip.files)
      .filter((filename) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename))
      .filter((filename) => !filename.startsWith('__MACOSX')) // Skip macOS artifacts
      .filter((filename) => !zip.files[filename].dir) // Skip directories
      .sort(this.naturalSort);

    const pages: PageImage[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i];
      const blob = await zip.files[filename].async('blob');
      const dimensions = await this.getImageDimensions(blob);

      pages.push({
        index: i,
        blob,
        url: URL.createObjectURL(blob),
        width: dimensions.width,
        height: dimensions.height,
      });
    }

    return pages;
  }

  async extractCoverImage(file: File): Promise<Blob | null> {
    try {
      const zip = new JSZip();
      const zipData = await file.arrayBuffer();
      const contents = await zip.loadAsync(zipData);

      const imageFiles = Object.keys(contents.files)
        .filter((filename) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename))
        .filter((filename) => !filename.startsWith('__MACOSX'))
        .filter((filename) => !contents.files[filename].dir)
        .sort(this.naturalSort);

      if (imageFiles.length === 0) return null;

      return contents.files[imageFiles[0]].async('blob');
    } catch {
      return null;
    }
  }

  private naturalSort(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  private async getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(blob);
    });
  }

  cleanup(pages: PageImage[]): void {
    pages.forEach((page) => URL.revokeObjectURL(page.url));
  }
}

export const BookService = new BookServiceClass();
