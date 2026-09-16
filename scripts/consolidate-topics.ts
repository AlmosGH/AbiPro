import postgres from 'postgres';

const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_MIGRATION_URL or DATABASE_URL is required.');

// Each list keeps the first id as the canonical topic. These are equivalent
// labels/variants, not merely topics that happen to be related.
const groups = [
	[1, 477], [2, 39], [6, 43, 635],
	[7, 20, 44, 58, 260, 508, 520, 726], [9, 638],
	[12, 291, 501], [18, 70, 775], [25, 65], [28, 68, 479, 556],
	[36, 63, 563, 782], [38, 514], [42, 258], [47, 215, 744],
	[48, 277, 439], [50, 206, 415, 746], [176, 372], [181, 452, 565],
	[212, 471, 648], [257, 658], [269, 393], [275, 766],
	[276, 387, 426, 730], [280, 391], [373, 448],
	[374, 411, 473, 651, 677], [375, 523, 781], [380, 644], [385, 261],
	[386, 399, 449, 703], [397, 521], [412, 474], [422, 774], [428, 525],
	[443, 632, 368, 405, 735], [451, 564], [469, 724], [494, 558],
	[503, 581], [516, 773], [560, 689, 753], [572, 584, 688, 776],
	[585, 32], [667, 719]
	,[8, 45], [11, 216], [24, 264], [173, 518], [270, 481, 671],
	[371, 395], [274, 650, 702], [279, 441, 502], [50, 579], [409, 597, 777]
	,[695, 591, 366, 403, 279, 490]
	,[50, 655, 416, 14]
	,[667, 38, 1, 170, 630]
	,[266, 2]
	,[172, 267, 656, 503, 15, 27, 280, 391, 734, 442, 696, 492]
	,[443, 3, 28, 40, 16, 431, 504, 568, 516, 268, 281, 544]
	,[29, 69, 171, 207, 381, 283]
	,[173, 518, 419, 594, 420]
	,[42, 258, 394, 5, 432, 369]
	,[454, 421, 469, 270, 481]
	,[602, 666, 750, 282, 570, 645, 269]
	,[274, 690, 511, 623]
	,[373, 397, 290, 664]
	,[263, 487, 512, 615, 499, 780, 768, 375, 523, 781]
	,[273, 464, 410, 472, 604, 49, 396, 463, 413]
	,[428, 25, 634]
	,[48, 678, 451, 427]
	,[52, 77, 37, 616, 585]
	,[622, 52], [559, 422], [721, 443], [731, 273], [485, 273], [610, 572],
	[553, 602], [10, 47], [668, 266], [4, 493], [743, 273, 779, 654],
	[401, 552], [461, 771], [402, 13], [433, 42], [437, 374], [625, 179],
	[424, 21], [757, 263]
	,[485, 743], [609, 743], [577, 36]
	,[609, 29]
];

const renames: Record<number, { name: string; slug: string }> = {
	695: { name: 'Antike Welt', slug: 'antike-welt' },
	50: { name: 'Griechische Antike', slug: 'griechische-antike' },
	667: { name: 'Römische Geschichte', slug: 'roemische-geschichte' },
	266: { name: 'Religionen', slug: 'religionen' },
	172: { name: 'Mittelalter', slug: 'mittelalter' },
	443: { name: 'Ungarn im Mittelalter', slug: 'ungarn-im-mittelalter' },
	29: { name: 'Kultur und Religion der Frühen Neuzeit', slug: 'kultur-und-religion-fruehe-neuzeit' },
	42: { name: 'Absolutismus und Habsburgermonarchie', slug: 'absolutismus-und-habsburgermonarchie' },
	270: { name: 'Türkische Herrschaft und Kriege', slug: 'tuerkische-herrschaft-und-kriege' },
	602: { name: 'Politik und Staatsformen', slug: 'politik-und-staatsformen' },
	274: { name: 'Diktaturen und Ideologien im 20. Jahrhundert', slug: 'diktaturen-und-ideologien-im-20-jahrhundert' },
	373: { name: 'Kalter Krieg und Ostblock', slug: 'kalter-krieg-und-ostblock' },
	263: { name: 'Zeitgeschichte nach 1945', slug: 'zeitgeschichte-nach-1945' },
	273: { name: 'Gesellschaft und Lebensweise', slug: 'gesellschaft-und-lebensweise' },
	428: { name: 'Bevölkerung und Demografie', slug: 'bevoelkerung-und-demografie' },
	48: { name: 'Globale Welt und Wirtschaft', slug: 'globale-welt-und-wirtschaft' },
	52: { name: 'Wirtschaftsgeschichte', slug: 'wirtschaftsgeschichte' }
	,743: { name: 'Gesellschaft und Lebensweise', slug: 'gesellschaft-und-lebensweise' }
};

const sql = postgres(connectionString, { max: 1, prepare: false });
let removed = 0;
let remappedRelations = 0;

try {
	const existing = await sql.unsafe<{ id: number }[]>('select id from app_private.topics');
	const existingIds = new Set(existing.map((row) => Number(row.id)));
	const applicableGroups = groups.map((ids) => ids.filter((id) => existingIds.has(id))).filter((ids) => ids.length > 1);
	await sql.begin(async (tx) => {
		await tx.unsafe('alter table app_private.task_version_topics disable trigger protect_topic_version');
		for (const ids of applicableGroups) {
			const [canonical, ...duplicates] = ids;
			for (const duplicate of duplicates) {
				const [{ count }] = await tx.unsafe<{ count: number }[]>(
					'select count(*)::int as count from app_private.task_version_topics where topic_id = $1',
					[duplicate]
				);
				await tx.unsafe(
					'insert into app_private.task_version_topics (task_version_id, topic_id) select task_version_id, $1 from app_private.task_version_topics where topic_id = $2 on conflict (task_version_id, topic_id) do nothing',
					[canonical, duplicate]
				);
				remappedRelations += count;
				await tx.unsafe('delete from app_private.task_version_topics where topic_id = $1', [duplicate]);
				await tx.unsafe('delete from app_private.topics where id = $1', [duplicate]);
				removed++;
			}
		}
		await tx.unsafe('alter table app_private.task_version_topics enable trigger protect_topic_version');
		for (const [id, values] of Object.entries(renames)) {
			await tx.unsafe('update app_private.topics set name = $1, slug = $2 where id = $3', [values.name, values.slug, Number(id)]);
		}
	});

	const [{ count: topics }] = await sql.unsafe('select count(*)::int as count from app_private.topics');
	const [{ count: relations }] = await sql.unsafe('select count(*)::int as count from app_private.task_version_topics');
	console.log(JSON.stringify({ removed, remappedRelations, topics, relations }));
} finally {
	await sql.end();
}
