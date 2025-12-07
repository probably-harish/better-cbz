export class FileSystemError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'FileSystemError';
  }
}

class FileSystemServiceClass {
  isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  async requestDirectoryAccess(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isSupported()) {
      throw new FileSystemError('File System Access API is not supported in this browser.');
    }

    try {
      const handle = await window.showDirectoryPicker({
        mode: 'read',
      });
      return handle;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return null; // User cancelled
      }
      throw new FileSystemError('Failed to access directory', err);
    }
  }

  async verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
    try {
      const options: FileSystemHandlePermissionDescriptor = { mode: 'read' };

      // Check current permission
      if ((await handle.queryPermission(options)) === 'granted') {
        return true;
      }

      // Request permission
      if ((await handle.requestPermission(options)) === 'granted') {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  async scanForCBZFiles(directoryHandle: FileSystemDirectoryHandle): Promise<FileSystemFileHandle[]> {
    const cbzFiles: FileSystemFileHandle[] = [];

    try {
      for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file') {
          const fileHandle = entry as FileSystemFileHandle;
          const name = fileHandle.name.toLowerCase();
          if (name.endsWith('.cbz') || name.endsWith('.cbr')) {
            cbzFiles.push(fileHandle);
          }
        }
      }
    } catch (err) {
      throw new FileSystemError('Failed to scan directory', err);
    }

    return cbzFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );
  }

  async getFileFromHandle(handle: FileSystemFileHandle): Promise<File> {
    try {
      return await handle.getFile();
    } catch (err) {
      throw new FileSystemError('Failed to get file', err);
    }
  }
}

export const FileSystemService = new FileSystemServiceClass();
