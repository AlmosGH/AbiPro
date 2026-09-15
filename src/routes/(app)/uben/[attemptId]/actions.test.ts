import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ submitPracticeAttempt: vi.fn() }));

vi.mock('$lib/server/authorization', () => ({
	requireActor: () => ({ userId: '00000000-0000-0000-0000-000000000001', profile: { role: 'learner' } })
}));
vi.mock('$lib/server/practice', () => ({
	getBestPracticeScore: vi.fn(),
	getPracticeAttempt: vi.fn(),
	submitPracticeAttempt: mocks.submitPracticeAttempt
}));
vi.mock('$lib/server/storage', () => ({ createAssetSignedUrl: vi.fn() }));

import { actions } from './+page.server';

describe('practice submission action', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns a successful grading result so the current page can reload its corrections', async () => {
		mocks.submitPracticeAttempt.mockResolvedValue({ score: 3, maximum: 4 });

		await expect(actions.submit!({ params: { attemptId: '7' }, locals: {} } as never)).resolves.toEqual({
			graded: true,
			score: 3,
			maximum: 4
		});
		expect(mocks.submitPracticeAttempt).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 7);
	});
});
