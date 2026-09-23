// Numbering and names follow section B ("Témakörök") of tortenelem_2024_e.pdf.
export const OFFICIAL_PERIODS = [
	['1', 'Az ókor'],
	['2', 'A középkor'],
	['3', 'A kora újkor'],
	['4', 'Az újkor'],
	['5', 'A világháborúk kora'],
	['6', 'A hidegháború kora'],
	['7', 'A jelenkor']
] as const;

export const OFFICIAL_TOPICS = [
	['1.1', 'Politika'], ['1.2', 'Ókori civilizációk öröksége'], ['1.3', 'Vallások'],
	['2.1', 'Az iszlám világ'], ['2.2', 'Gazdaság, társadalom, állam'], ['2.3', 'Egyház és kultúra Európában és Magyarországon'],
	['2.4', 'Magyar őstörténet és honfoglalás'], ['2.5', 'A keresztény államalapítás és az Árpád-kor'], ['2.6', 'A vegyesházi királyok kora'],
	['3.1', 'A földrajzi felfedezések és következményeik'], ['3.2', 'A reformáció és a katolikus megújulás Európában és Magyarországon'],
	['3.3', 'Törökellenes és rendi küzdelmek'], ['3.4', 'Erdély'], ['3.5', 'Magyarország a Habsburg Birodalomban'],
	['3.6', 'A felvilágosodás'],
	['4.1', 'Politikai eszmék'], ['4.2', 'Az ipari forradalom első hulláma'], ['4.3', 'A reformkor'],
	['4.4', 'A forradalom és szabadságharc'], ['4.5', 'Az ipari forradalom második hulláma a világban és Magyarországon'],
	['4.6', 'A szocializmus'], ['4.7', 'Polgári állam, nagyhatalmi törekvések'], ['4.8', 'A dualizmus kora'],
	['4.9', 'A nemzetiségi kérdés Magyarországon a dualizmus korában'],
	['5.1', 'Az első világháború'], ['5.2', 'Politikai változások a háború után'], ['5.3', 'Párizs környéki békék'],
	['5.4', 'Állam, ideológia és gazdaság a két világháború között'], ['5.5', 'Politika és gazdaság Magyarországon'],
	['5.6', 'Társadalom és életmód Magyarországon'], ['5.7', 'A második világháború'],
	['5.8', 'Magyarország a második világháborúban'], ['5.9', 'A holokauszt Európában és Magyarországon'],
	['5.10', 'Magyarország pusztulása'],
	['6.1', 'A hidegháború kora'], ['6.2', 'A kétpólusú világ felbomlása'],
	['6.3', 'A kommunista diktatúra kiépítése és működése'], ['6.4', 'Az 1956-os forradalom és szabadságharc'],
	['6.5', 'A kádári diktatúra'], ['6.6', 'A rendszerváltoztatás Magyarországon'],
	['7.1', 'Nemzetközi együttműködés, globális világ'], ['7.2', 'Politikai intézmények'], ['7.3', 'Nemzet']
] as const;

export type OfficialTopicCode = (typeof OFFICIAL_TOPICS)[number][0];

export function periodSlug(code: string) { return `epoche-${code}`; }
export function topicSlug(code: string) { return `thema-${code.replace('.', '-')}`; }
