import postgres from 'postgres';

const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_MIGRATION_URL or DATABASE_URL is required.');

const sql = postgres(connectionString, { max: 1, prepare: false });

const samples = [
	{
		slug: 'reformation-und-konfessionen', title: 'Reformation und Konfessionen', year: 2024, session: 'spring', period: 'fruehe-neuzeit', periodName: 'Frühe Neuzeit', topic: 'reformation', topicName: 'Reformation', maxPoints: 2,
		source: 'Auszug aus einer zeitgenössischen Quelle zur Reformation.',
		questions: [
			{ kind: 'choice', prompt: 'Welche Aussage passt zur Quelle?', config: { kind: 'choice', options: [{ id: 'a', label: 'Aussage A' }, { id: 'b', label: 'Aussage B' }] }, gradingRule: { kind: 'choice', correctOptionId: 'a' }, maxPoints: 1 },
			{ kind: 'multiple_choice', prompt: 'Welche Folgen gehören zur Reformation?', config: { kind: 'multiple_choice', options: [{ id: 'a', label: 'Folge A' }, { id: 'b', label: 'Folge B' }, { id: 'c', label: 'Folge C' }] }, gradingRule: { kind: 'multiple_choice', correctOptionIds: ['a', 'b'], allOrNothing: true }, maxPoints: 1 }
		]
	},
	{
		slug: 'industrialisierung-in-europa', title: 'Industrialisierung in Europa', year: 2023, session: 'autumn', period: 'neunzehntes-jahrhundert', periodName: 'Das 19. Jahrhundert', topic: 'industrialisierung', topicName: 'Industrialisierung', maxPoints: 2,
		source: 'Statistische Angaben zur europäischen Industrialisierung.',
		questions: [
			{ kind: 'matching', prompt: 'Ordne Begriff und Erklärung zu.', config: { kind: 'matching', left: [{ id: 'factory', label: 'Fabrik' }], right: [{ id: 'production', label: 'Maschinelle Produktion' }] }, gradingRule: { kind: 'matching', pairs: [{ leftId: 'factory', rightId: 'production' }] }, maxPoints: 1 },
			{ kind: 'ordering', prompt: 'Bringe die Entwicklungen in die richtige Reihenfolge.', config: { kind: 'ordering', items: [{ id: 'steam', label: 'Dampfmaschine' }, { id: 'rail', label: 'Eisenbahnausbau' }] }, gradingRule: { kind: 'ordering', correctOrder: ['steam', 'rail'] }, maxPoints: 1 }
		]
	},
	{
		slug: 'ungarn-im-kalten-krieg', title: 'Ungarn im Kalten Krieg', year: 2022, session: 'spring', period: 'zwanzigstes-jahrhundert', periodName: 'Das 20. Jahrhundert', topic: 'kalter-krieg', topicName: 'Kalter Krieg', maxPoints: 2,
		source: 'Auszug aus einer Rede aus der Zeit des Kalten Krieges.',
		questions: [
			{ kind: 'short_text', prompt: 'Erläutere die historische Bedeutung der Quelle.', config: { kind: 'short_text', multiline: true, maximumLength: 1000 }, gradingRule: { kind: 'short_text', acceptedAnswers: [], criteria: ['historischer Kontext', 'Bedeutung'], aiEligible: true }, maxPoints: 2 }
		]
	}
] as const;

try {
	await sql.begin(async (transaction) => {
		const [curriculum] = await transaction<{ id: number }[]>`
			insert into app_private.curricula (code, name) values ('NAT_2020', 'NAT 2020')
			on conflict (code) do update set name = excluded.name returning id
		`;
		for (const sample of samples) {
			const [period] = await transaction<{ id: number }[]>`
				insert into app_private.historical_periods (slug, name, position)
				values (${sample.period}, ${sample.periodName}, 0)
				on conflict (slug) do update set name = excluded.name returning id
			`;
			const [topic] = await transaction<{ id: number }[]>`
				insert into app_private.topics (slug, name, period_id)
				values (${sample.topic}, ${sample.topicName}, ${period.id})
				on conflict (slug) do update set name = excluded.name, period_id = excluded.period_id returning id
			`;
			const [session] = await transaction<{ id: number }[]>`
				insert into app_private.exam_sessions (year, session)
				values (${sample.year}, ${sample.session})
				on conflict (year, session) do update set year = excluded.year returning id
			`;
			const existing = await transaction<{ id: number }[]>`select id from app_private.tasks where slug = ${sample.slug}`;
			if (existing.length) continue;
			const [task] = await transaction<{ id: number }[]>`insert into app_private.tasks (slug, status) values (${sample.slug}, 'draft') returning id`;
			const [version] = await transaction<{ id: number }[]>`
				insert into app_private.task_versions (task_id, version, status, title, instructions, curriculum_id, period_id, exam_session_id, max_points)
				values (${task.id}, 1, 'draft', ${sample.title}, 'Beispielinhalt: vor einer Veröffentlichung durch echte Prüfungsinhalte ersetzen.', ${curriculum.id}, ${period.id}, ${session.id}, ${sample.maxPoints}) returning id
			`;
			await transaction`insert into app_private.task_version_topics (task_version_id, topic_id) values (${version.id}, ${topic.id})`;
			await transaction`insert into app_private.sources (task_version_id, position, kind, title, content) values (${version.id}, 0, 'text', 'Quelle A', ${transaction.json({ text: sample.source })})`;
			for (const [position, question] of sample.questions.entries()) {
				await transaction`
					insert into app_private.questions (task_version_id, position, kind, prompt, config, grading_rule, max_points)
					values (${version.id}, ${position}, ${question.kind}, ${question.prompt}, ${transaction.json(question.config)}, ${transaction.json(question.gradingRule)}, ${question.maxPoints})
				`;
			}
		}
	});
	console.log('Three Milestone 2 draft templates are ready for editorial review.');
} finally {
	await sql.end();
}
