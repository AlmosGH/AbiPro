import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createTask: vi.fn(), publishTaskVersion: vi.fn(), createDraftRevision: vi.fn() }));

vi.mock('$lib/server/authorization', () => ({
	requireAdmin: () => ({ userId: '00000000-0000-0000-0000-000000000001', profile: { role: 'admin' } })
}));
vi.mock('$lib/server/content', () => ({
	createTask: mocks.createTask,
	publishTaskVersion: mocks.publishTaskVersion,
	createDraftRevision: mocks.createDraftRevision,
	archiveTask: vi.fn(),
	restoreTask: vi.fn(),
	getReferenceData: vi.fn(),
	listFilteredAdminTasks: vi.fn(),
	listAssetRecords: vi.fn(),
	getAdminTaskVersion: vi.fn(),
	saveTaskDraft: vi.fn()
}));

import { actions as createActions } from './+page.server';
import { actions as editorActions } from './[id]/+page.server';

describe('successful admin action redirects', () => {
	beforeEach(() => vi.clearAllMocks());

	it('redirects after publishing instead of converting the redirect to a 400', async () => {
		mocks.publishTaskVersion.mockResolvedValue(undefined);
		await expect(editorActions.publish!({ params: { id: '3' }, locals: {} } as never))
			.rejects.toMatchObject({ status: 303, location: '/admin/aufgaben/3' });
	});

	it('redirects after creating a task instead of converting the redirect to a 400', async () => {
		mocks.createTask.mockResolvedValue({ id: 12 });
		const formData = new FormData();
		formData.set('slug', 'test-aufgabe');
		formData.set('title', 'Testaufgabe');
		formData.set('instructions', 'Anweisung');
		formData.set('curriculumId', '1');
		formData.set('periodId', '1');
		formData.set('examSessionId', '1');
		formData.set('maxPoints', '2');
		const request = new Request('http://localhost/admin/aufgaben', { method: 'POST', body: formData });

		await expect(createActions.create!({ request, locals: {} } as never))
			.rejects.toMatchObject({ status: 303, location: '/admin/aufgaben/12' });
	});

	it('redirects to a newly created draft revision', async () => {
		mocks.createDraftRevision.mockResolvedValue({ id: 21 });
		await expect(editorActions.createRevision!({ params: { id: '3' }, locals: {} } as never))
			.rejects.toMatchObject({ status: 303, location: '/admin/aufgaben/21' });
	});
});
