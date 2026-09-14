function timestamp(value: unknown) {
	if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
	if (typeof value === 'string' || typeof value === 'number') {
		const parsed = new Date(value).getTime();
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

export function newestUpdatedFirst(
	a: { updatedAt?: unknown; version?: number },
	b: { updatedAt?: unknown; version?: number }
) {
	return timestamp(b.updatedAt) - timestamp(a.updatedAt) || (b.version ?? 0) - (a.version ?? 0);
}
