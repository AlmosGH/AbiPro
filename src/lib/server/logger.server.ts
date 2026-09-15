export function logServerError(cause: unknown, context: { requestId?: string; route?: string; userId?: string | null } = {}) {
	const error = cause instanceof Error ? cause : new Error('Unknown server error');
	const safeMessage = error.message.split(/\r?\nparams:/u, 1)[0]
		.replace(/[?&](?:key|api_key)=[^&\s]+/giu, '?key=[REDACTED]')
		.replace(/AIza[\w-]{20,}/gu, '[REDACTED]')
		.slice(0, 500);
	console.error(JSON.stringify({
		level: 'error',
		time: new Date().toISOString(),
		requestId: context.requestId,
		route: context.route,
		userId: context.userId ?? undefined,
		name: error.name,
		message: safeMessage
	}));
}
