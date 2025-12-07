export interface Volume {
  id: string;
  filename: string;
  fileHandle?: FileSystemFileHandle;
  lastReadPage: number;
  totalPages: number;
  dateAdded: number;
  lastReadDate?: number;
}

export interface Series {
  id: string;
  name: string;
  path: string;
  volumes: Volume[];
  dateAdded: number;
}

export interface LibraryState {
  series: Series[];
  isLoading: boolean;
  selectedSeriesId: string | null;
  error: string | null;
}
