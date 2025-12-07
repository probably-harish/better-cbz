import { openDB, type IDBPDatabase } from 'idb';
import type { Series } from '@/types';

const DB_NAME = 'htmlcbz';
const DB_VERSION = 1;

interface HtmlCbzDB {
  series: {
    key: string;
    value: Series;
  };
  directoryHandles: {
    key: string;
    value: FileSystemDirectoryHandle;
  };
  coverImages: {
    key: string;
    value: Blob;
  };
}

class StorageServiceClass {
  private db: IDBPDatabase<HtmlCbzDB> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<HtmlCbzDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create object stores
        if (!db.objectStoreNames.contains('series')) {
          db.createObjectStore('series', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('directoryHandles')) {
          db.createObjectStore('directoryHandles');
        }
        if (!db.objectStoreNames.contains('coverImages')) {
          db.createObjectStore('coverImages');
        }
      },
    });
  }

  private getDB(): IDBPDatabase<HtmlCbzDB> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // Series operations
  async saveSeries(series: Series): Promise<void> {
    await this.getDB().put('series', series);
  }

  async getSeries(id: string): Promise<Series | undefined> {
    return this.getDB().get('series', id);
  }

  async getAllSeries(): Promise<Series[]> {
    return this.getDB().getAll('series');
  }

  async deleteSeries(id: string): Promise<void> {
    const db = this.getDB();
    await db.delete('series', id);
    await db.delete('directoryHandles', id);
    await db.delete('coverImages', id);
  }

  // Directory handle operations (for File System Access API persistence)
  async saveDirectoryHandle(seriesId: string, handle: FileSystemDirectoryHandle): Promise<void> {
    await this.getDB().put('directoryHandles', handle, seriesId);
  }

  async getDirectoryHandle(seriesId: string): Promise<FileSystemDirectoryHandle | undefined> {
    return this.getDB().get('directoryHandles', seriesId);
  }

  async getAllDirectoryHandles(): Promise<Map<string, FileSystemDirectoryHandle>> {
    const db = this.getDB();
    const keys = await db.getAllKeys('directoryHandles');
    const handles = new Map<string, FileSystemDirectoryHandle>();

    for (const key of keys) {
      const handle = await db.get('directoryHandles', key);
      if (handle) {
        handles.set(key as string, handle);
      }
    }

    return handles;
  }

  // Cover image operations
  async saveCoverImage(seriesId: string, blob: Blob): Promise<void> {
    await this.getDB().put('coverImages', blob, seriesId);
  }

  async getCoverImage(seriesId: string): Promise<Blob | undefined> {
    return this.getDB().get('coverImages', seriesId);
  }

  // Volume progress
  async updateVolumeProgress(seriesId: string, volumeId: string, page: number, totalPages: number): Promise<void> {
    const series = await this.getSeries(seriesId);
    if (!series) return;

    const updatedVolumes = series.volumes.map((v) =>
      v.id === volumeId
        ? { ...v, lastReadPage: page, totalPages, lastReadDate: Date.now() }
        : v
    );

    await this.saveSeries({ ...series, volumes: updatedVolumes });
  }
}

export const StorageService = new StorageServiceClass();
