import { writable } from 'svelte/store';

export type AppStatusTone = 'success' | 'danger' | 'info' | 'warning';
export interface AppStatusMessage { id: number; message: string; tone: AppStatusTone; timeout: number }

export const appStatuses = writable<AppStatusMessage[]>([]);
let nextId = 0;

export function announceStatus(message: string, tone: AppStatusTone = 'info', timeout = 4_000) {
	const id = ++nextId;
	appStatuses.update((items) => [...items, { id, message, tone, timeout }]);
	if (timeout > 0 && typeof window !== 'undefined') window.setTimeout(() => dismissStatus(id), timeout);
	return id;
}

export function dismissStatus(id: number) {
	appStatuses.update((items) => items.filter((item) => item.id !== id));
}
