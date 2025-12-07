import { createStore } from './createStore';
import type { LibraryState, Series, Volume } from '@/types';

const initialState: LibraryState = {
  series: [],
  isLoading: false,
  selectedSeriesId: null,
  error: null,
};

export const libraryStore = createStore<LibraryState>(initialState);

export const libraryActions = {
  setSeries(series: Series[]): void {
    libraryStore.setState({ series, isLoading: false });
  },

  addSeries(series: Series): void {
    const { series: existing } = libraryStore.getState();
    // Check if series already exists (by path)
    const exists = existing.some((s) => s.path === series.path);
    if (!exists) {
      libraryStore.setState({ series: [...existing, series] });
    }
  },

  removeSeries(id: string): void {
    const { series } = libraryStore.getState();
    libraryStore.setState({
      series: series.filter((s) => s.id !== id),
      selectedSeriesId: null,
    });
  },

  selectSeries(id: string | null): void {
    libraryStore.setState({ selectedSeriesId: id });
  },

  updateVolume(seriesId: string, volumeId: string, updates: Partial<Volume>): void {
    const { series } = libraryStore.getState();
    const updatedSeries = series.map((s) => {
      if (s.id !== seriesId) return s;
      return {
        ...s,
        volumes: s.volumes.map((v) =>
          v.id === volumeId ? { ...v, ...updates } : v
        ),
      };
    });
    libraryStore.setState({ series: updatedSeries });
  },

  setLoading(isLoading: boolean): void {
    libraryStore.setState({ isLoading });
  },

  setError(error: string | null): void {
    libraryStore.setState({ error, isLoading: false });
  },
};
