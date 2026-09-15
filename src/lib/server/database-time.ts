export function asDatabaseDate(value: unknown): Date {
	const date = value instanceof Date ? value : new Date(String(value));
	if (Number.isNaN(date.getTime())) throw new Error('The database returned an invalid timestamp.');
	return date;
}
