import { writable } from 'svelte/store';

export type LeftPanel = 'samples' | 'actions' | null;

export const leftPanelStore = writable<LeftPanel>(null);

export const toggleLeftPanel = (panel: 'samples' | 'actions'): void => {
  leftPanelStore.update((current) => (current === panel ? null : panel));
};
