import postgres from 'postgres';
import { periodSlug, topicSlug } from '../src/lib/history-taxonomy.ts';
import { classifyHistoryTask } from '../src/lib/history-classification.ts';

const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_MIGRATION_URL or DATABASE_URL is required.');

const sql = postgres(connectionString, { max: 1, prepare: false });

const option = (label: string, index: number) => ({ id: `o${index + 1}`, label });
const choice = (prompt: string, options: string[], correct: number) => ({
	kind: 'choice', prompt, config: { kind: 'choice', options: options.map(option) },
	gradingRule: { kind: 'choice', correctOptionId: `o${correct + 1}` }, maxPoints: 1
});
const multipleChoice = (prompt: string, options: string[], correct: number[], maxPoints = 1) => ({
	kind: 'multiple_choice', prompt, config: { kind: 'multiple_choice', options: options.map(option), minimumSelections: correct.length, maximumSelections: correct.length },
	gradingRule: { kind: 'multiple_choice', correctOptionIds: correct.map((index) => `o${index + 1}`), allOrNothing: maxPoints === 1 }, maxPoints
});
const shortText = (prompt: string, acceptedAnswers: string[], criteria: string[], maxPoints = 1, aiEligible = false) => ({
	kind: 'short_text', prompt, config: { kind: 'short_text', multiline: maxPoints > 1, maximumLength: maxPoints > 1 ? 1000 : 300 },
	gradingRule: { kind: 'short_text', acceptedAnswers, criteria, aiEligible }, maxPoints
});
const matching = (prompt: string, left: string[], right: string[], pairs: number[], maxPoints: number) => ({
	kind: 'matching', prompt,
	config: { kind: 'matching', left: left.map((label, index) => ({ id: `l${index + 1}`, label })), right: right.map((label, index) => ({ id: `r${index + 1}`, label })) },
	gradingRule: { kind: 'matching', pairs: pairs.map((rightIndex, leftIndex) => ({ leftId: `l${leftIndex + 1}`, rightId: `r${rightIndex + 1}` })) }, maxPoints
});

const tasks = [
	{
		number: 1, slug: 'test-2026-mai-01-juedische-religion', title: '[TEST] 2026/1 – Jüdische Religion',
		period: ['altertum', 'Altertum', 10], topic: ['juedische-religion', 'Jüdische Religion'], maxPoints: 4,
		sources: [{ kind: 'text', title: 'Hebräische Bibel', content: { text: '„Ich bin der Ewige Herr, dein Gott, der dich aus dem Land Ägypten, aus einem Sklavenhaus herausführte. […] Du sollst dir kein Gottesbild machen noch irgendein Abbild von etwas, was oben im Himmel, was unten auf der Erde oder was im Wasser unter der Erde ist. […] Denn in sechs Tagen schuf der Herr den Himmel und die Erde, das Meer und alles, was in ihnen ist, dann aber ruhte er am siebten Tag. Darum segnete der Ewige Herr den […c)…] und heiligte ihn.“' } }],
		questions: [
			shortText('a) Nennen Sie die biblische Person, die die zitierten Gebote Gottes vermittelte!', ['Mose', 'Moses'], ['Mose(s)']),
			multipleChoice('b) Auf welche charakteristischen Merkmale der jüdischen Religion deutet das Zitat hin? Wählen Sie zwei Antworten!', ['Die jüdische Religion ist monotheistisch.', 'In der jüdischen Religion gibt es Essvorschriften.', 'Laut der jüdischen Religion soll der Messias bald kommen.', 'Die Juden sind das auserwählte Volk Gottes.', 'In der jüdischen Religion ist die Absicht zur Bekehrung stark.'], [0, 3], 2),
			shortText('c) Nennen Sie den ausgelassenen Tag in der Woche!', ['Samstag', 'Sabbat', 'Schabbat'], ['Samstag'])
		]
	},
	{
		number: 2, slug: 'test-2026-mai-02-grundherrschaft', title: '[TEST] 2026/2 – Mittelalterliche Grundherrschaft',
		period: ['mittelalter', 'Mittelalter', 20], topic: ['grundherrschaft', 'Grundherrschaft'], maxPoints: 4,
		sources: [{ kind: 'text', title: 'Deutsche Urkunde, 1106', content: { text: '„Wir, Friedrich, von Gottes Gnaden Erzbischof der Kirche in Hamburg […] wollen, dass jeder Kenntnis von diesem Vertrag erlange, den wir mit den Menschen diesseits des Rheins schlossen. Diese Menschen suchten unsere Majestät auf und baten uns inständig darum […], ihnen die bisher unbewirtschafteten Felder zu überlassen, damit sie diese urbar machen. [...] Nach jeder Bauernhufe der oben erwähnten Besitzung wird uns jährlich 1 Denar entrichtet. […] Sie akzeptierten, [einen Teil] der Früchte des Feldes […] uns [der Kirche] zu übergeben, auch aus den [Getreide]Garben, Lämmern, Schweinen, Ziegen, Honig und Flachs […]. Damit ihnen von Fremden kein Unrecht angetan wird, verpflichteten sie sich, uns nach jeden hundert Bauernhufen jährlich zwei Marken zu bezahlen, so dürfen sie in allen Prozessen unter sich Urteile fällen.“' } }],
		questions: [
			shortText('a) Nennen Sie die im Text unterstrichene Leistung mit einem Fachbegriff!', ['Zehnt', 'Kirchenzehnt'], ['Zehnt / Kirchenzehnt']),
			shortText('b) Nach welchem Recht forderte Erzbischof Friedrich die weiteren Leistungen?', ['Er war der Grundherr.', 'Er war der Grundbesitzer.', 'Als Grundherr.'], ['Grundherrschaft; Überlassung und Schutz des Bodens'], 1, true),
			shortText('c) Was deutet bei der Form der Leistungen auf den relativen wirtschaftlichen Entwicklungsstand hin?', ['Die Leistung wurde in Geld entrichtet.', 'Geldleistung statt nur Naturalien.'], ['Geldleistung statt ausschließlich Naturalabgaben'], 1, true),
			shortText('d) Welches, für Leibeigene nicht charakteristische Privileg erlangten die Siedler?', ['Eigene Gerichtsbarkeit', 'Gerichtsbarkeit', 'Selbstgerichtsbarkeit'], ['eigene Gerichtsbarkeit'])
		]
	},
	{
		number: 3, slug: 'test-2026-mai-03-hunyadis', title: '[TEST] 2026/3 – Zeitalter der Hunyadis',
		period: ['mittelalter', 'Mittelalter', 20], topic: ['hunyadis', 'Zeitalter der Hunyadis'], maxPoints: 4,
		sources: [
			{ kind: 'map', title: 'Die Kämpfe der Hunyadis gegen die Türken', content: { url: '/test-data/2026-mai-geschichte-de/aufgabe-03-karte.png' } },
			{ kind: 'text', title: 'Quellenauszüge A–E', content: { text: 'A) Wladislaw fällt beim Angriff auf das Lager Sultan Murads II. B) János Hunyadi bittet den byzantinischen Kaiser um Gebiete und verspricht Hilfe bei einer Belagerung der Stadt, schickt aber keine. C) 1396 zieht ein internationales Heer unter Sigismund über die Donau nach Nikopolis. D) Hunyadis Truppen durchbrechen die türkische Schiffsblockade und bringen Hilfe in die bedrängte Burg. E) Pál Kinizsi rettet István Báthori in einer Schlacht gegen die Türken.' } }
		],
		questions: [matching('Ordnen Sie die Quellenauszüge A–E den auf der Karte mit 1–4 markierten Schauplätzen zu. Ein Auszug bleibt übrig.', ['Schauplatz 1', 'Schauplatz 2', 'Schauplatz 3', 'Schauplatz 4'], ['A', 'B', 'C', 'D', 'E'], [0, 3, 4, 1], 4)]
	},
	{
		number: 4, slug: 'test-2026-mai-04-usa', title: '[TEST] 2026/4 – Vereinigte Staaten von Amerika',
		period: ['fruehe-neuzeit', 'Frühe Neuzeit', 30], topic: ['usa-verfassung', 'Verfassung der USA'], maxPoints: 4,
		sources: [{ kind: 'text', title: 'Verfassung der Vereinigten Staaten von Amerika, 1787', content: { text: '„Das Repräsentantenhaus soll aus Abgeordneten zusammengesetzt sein, die jedes zweite Jahr in den einzelnen Staaten vom Volke gewählt werden […]. Die Abgeordneten sollen auf die einzelnen Staaten im Verhältnis zu deren zahlenmäßiger Stärke verteilt werden. Der Senat soll aus zwei Senatoren von jedem Staate zusammengesetzt sein. Die vollziehende Gewalt soll einem Präsidenten übertragen sein. Jeder Mitgliedstaat bestellt eine Anzahl von Wahlmännern, die der Gesamtzahl seiner Senatoren und Abgeordneten entspricht. […] Im Falle der Amtsentsetzung, des Todes, Verzichts oder der Unfähigkeit des Präsidenten soll das Amt auf den Vizepräsidenten übergehen. Der Präsident ist Oberbefehlshaber, empfängt Gesandte und sorgt für die Ausführung der Gesetze.“' } }],
		questions: [
			choice('a) 1804 wurden 142 Abgeordnete aus 17 Mitgliedstaaten gewählt. Wie viele Wahlmännerstimmen brauchte man bei zwei Kandidaten mindestens zur Präsidentenwahl?', ['34 Stimmen', '89 Stimmen', '142 Stimmen'], 1),
			choice('b) Was gehörte nicht zum Aufgabenbereich des amerikanischen Präsidenten?', ['Kriegswesen', 'Justizwesen', 'Außenpolitik'], 1),
			choice('c) Was passiert, wenn der amerikanische Präsident abdankt?', ['Es kommt zu Neuwahlen; der neue Präsident amtiert vier Jahre.', 'Der Vizepräsident wird Präsident und amtiert vier Jahre.', 'Der Vizepräsident wird Präsident und vollendet die verbleibende Amtszeit.'], 2),
			shortText('d) Nennen Sie den ersten Präsidenten der Vereinigten Staaten!', ['Washington', 'George Washington'], ['George Washington'])
		]
	},
	{
		number: 5, slug: 'test-2026-mai-05-rakoczi', title: '[TEST] 2026/5 – Rákóczi-Freiheitskampf',
		period: ['fruehe-neuzeit', 'Frühe Neuzeit', 30], topic: ['rakoczi-freiheitskampf', 'Rákóczi-Freiheitskampf'], maxPoints: 6,
		sources: [
			{ kind: 'text', title: 'A) Proklamation von Ferenc Rákóczi II., 1703–1704', content: { text: '„Der wichtigste Grund für die so zahlreichen großen Bewegungen ist jetzt und immer die schändliche Abschaffung der uralten Gesetze. […] Sie formten das Land zum Ebenbild des Erbkönigtums um. […] Sie schafften das hochbedeutende Gesetz des Königs Andreas II. ab, das die fundamentalen Freiheitsrechte sämtlicher Stände beinhaltete.“' } },
			{ kind: 'text', title: 'B) Frieden von Szatmár, 1711', content: { text: '„Wir lassen sämtlichen Anhängern von Rákóczi versöhnliche Gnade walten. In Bezug auf die Religion behalten wir die gültigen Gesetze des Landes. Unverletzt bleibt die Möglichkeit bestehen, dass sonstige Beschwerden auf dem kommenden Landtag vorgetragen werden können.“' } }
		],
		questions: [
			matching('a–d) Entscheiden Sie, auf welchen Text sich die Behauptungen beziehen.', ['Der Text deutet auf die Goldene Bulle hin.', 'Der Text deutet darauf hin, dass den Teilnehmern Amnestie gewährt wurde.', 'Der Text deutet auf die zentralisierenden Bestrebungen der Habsburg-Regierung hin.', 'Der Text deklariert die Wiederherstellung des Rechts zur freien Königswahl.'], ['Text A', 'Text B', 'Beide Texte', 'Keiner der beiden Texte'], [0, 1, 0, 3], 4),
			shortText('e) Nennen Sie die Kirche, deren privilegierte Lage vom Frieden von Szatmár bekräftigt wurde!', ['römisch-katholische Kirche', 'katholische Kirche', 'römisch-katholisch'], ['römisch-katholische Kirche']),
			choice('f) Wie gestaltete sich die Lage des Fürstentums Siebenbürgen infolge des Friedens von Szatmár?', ['Ferenc Rákóczi wurde Fürst des selbständigen Fürstentums.', 'Das Fürstentum wurde mit Ungarn vereinigt.', 'Das Fürstentum blieb als gesonderte Provinz Teil des Habsburgerreiches.'], 2)
		]
	},
	{
		number: 6, slug: 'test-2026-mai-06-sozialismus', title: '[TEST] 2026/6 – Ideologie des Sozialismus',
		period: ['neunzehntes-jahrhundert', 'Das 19. Jahrhundert', 40], topic: ['sozialismus', 'Sozialismus'], maxPoints: 4,
		sources: [{ kind: 'image', title: 'Verhältnis des Sozialismus zu anderen politischen Ideologien', content: { url: '/test-data/2026-mai-geschichte-de/aufgabe-06-schaubild.png' } }],
		questions: [
			shortText('a) Nennen Sie die wirtschaftliche Zielsetzung der sozialistischen Ideologie, die den Gegensatz zum Privateigentum bildet!', ['Gemeinbesitz', 'Gemeineigentum', 'Staatseigentum', 'Kollektiveigentum'], ['Gemeinbesitz / Staatseigentum']),
			shortText('b) Nennen Sie die grundlegende Gruppe der Gesellschaft nach der Ideologie des Sozialismus!', ['Klasse', 'Arbeiter', 'Proletarier', 'Bauern'], ['Klasse']),
			shortText('c) Nennen Sie die politische Methode der sozialistischen Ideologie, die sich auf die Ergreifung der Macht richtet!', ['Revolution', 'Proletarrevolution'], ['(Proletar-)Revolution']),
			shortText('d) Nennen Sie den bedeutendsten Verfasser der sozialistischen Ideologie, der die kommunistischen Ideen formulierte!', ['Marx', 'Karl Marx', 'Engels', 'Friedrich Engels'], ['Karl Marx; auch Friedrich Engels'])
		]
	},
	{
		number: 7, slug: 'test-2026-mai-07-wirtschaftlicher-ausgleich', title: '[TEST] 2026/7 – Wirtschaftlicher Ausgleich',
		period: ['neunzehntes-jahrhundert', 'Das 19. Jahrhundert', 40], topic: ['oesterreichisch-ungarischer-ausgleich', 'Österreichisch-ungarischer Ausgleich'], maxPoints: 4,
		sources: [
			{ kind: 'text', title: 'A) László Böszörményi, 28. Februar 1867', content: { text: 'Die unteilbare und gemeinsame Herrschaft über die Erbländer und Ungarn nehme keine engere Übereinkunft an. Gemeinsames Finanz-, Kriegs- und Handelswesen dürfe es nie geben; unzählige Gesetze sicherten die getrennte Behandlung.' } },
			{ kind: 'text', title: 'B) Sándor Gubody, 22. März 1867', content: { text: 'Bei Zöllen und Steuern werde es keine gemeinsamen Interessen, sondern Streitigkeiten geben. Die österreichische Regierung habe Ungarn nur Spaten und Hacke aufgezwungen; Ungarn sei zu einer österreichischen Kolonie geschrumpft.' } },
			{ kind: 'text', title: 'C) Sándor Csanády, 26. März 1867', content: { text: 'Der Redner kritisiert die Gemeinsamkeit der Staatsschulden. Wer viertausend Millionen Schulden machen konnte, müsse über viel Geschick verfügen; vor der Freundschaft solcher geschickten Menschen hüte er sich.' } }
		],
		questions: [matching('Ordnen Sie jeder Behauptung den zutreffenden Quellenauszug zu.', ['Ungarns Industrie konnte sich wegen österreichischer Interessen früher nicht entwickeln.', 'Der Standpunkt wird mit historischen Argumenten begründet.', 'Ungarn müsste mit dem Ausgleich bedeutende finanzielle Lasten übernehmen.', 'Der Standpunkt der Regierungspartei zum wirtschaftlichen Ausgleich wird formuliert.'], ['A', 'B', 'C', 'Alle drei', 'Keine'], [1, 0, 2, 4], 4)]
	},
	{
		number: 8, slug: 'test-2026-mai-08-sowjetunion', title: '[TEST] 2026/8 – Sowjetunion in der Zwischenkriegszeit',
		period: ['zwanzigstes-jahrhundert', 'Das 20. Jahrhundert', 50], topic: ['stalinismus-kollektivierung', 'Stalinismus und Kollektivierung'], maxPoints: 4,
		sources: [
			{ kind: 'image', title: 'Sowjetisches Propagandaplakat, 1930er Jahre', content: { url: '/test-data/2026-mai-geschichte-de/aufgabe-08-plakat.png' } },
			{ kind: 'text', title: 'Aufschrift und Vergleichszitate', content: { text: 'Plakataufschrift: „Den weinenden Kulaken gegenüber einheitliche, kollektive Front für die Aussäung!“ Zitat 1: Ein Zeitzeuge erinnert sich an Hunger und die Suche nach Ästen und Büschen als Nahrung. Zitat 2: Kulaken und ihre Familien wurden deportiert oder in Arbeitslager verbannt. Zitat 3: Gefangene wurden selbst bei Temperaturen unter minus fünfzig Grad zur Arbeit getrieben.' } }
		],
		questions: [
			choice('a) Welche Behauptung trifft auf das Plakat zu?', ['Die Landwirtschaft hat Vorrang vor der Industrie.', 'Die Industrieentwicklung wird für den Rückgang der Landwirtschaft verantwortlich gemacht.', 'Die Landwirtschaft wird dank der Industrieentwicklung modernisiert.'], 2),
			choice('b) Welches Vergleichszitat widerspricht dem vom Plakat angedeuteten Zukunftsbild?', ['Zitat 1: Hunger und Nahrungssuche', 'Zitat 2: Deportation der Kulaken', 'Zitat 3: Zwangsarbeit bei extremer Kälte'], 0),
			shortText('c) Erklären Sie, warum die Kulaken vom System als Feinde betrachtet wurden!', ['Sie hielten an ihrem Privateigentum fest.', 'Sie wollten nicht in die Genossenschaften eintreten.', 'Sie verfügten über größere Felder.', 'Die Macht brauchte Sündenböcke.'], ['Privateigentum / Widerstand gegen Kollektivierung / größere Felder / Sündenbock'], 1, true),
			shortText('d) Nennen Sie den Generalsekretär, mit dessen Namen die Umgestaltung der Landwirtschaft verbunden ist!', ['Stalin', 'Josef Stalin', 'Joseph Stalin'], ['Stalin'])
		]
	},
	{
		number: 9, slug: 'test-2026-mai-09-kulturpolitik', title: '[TEST] 2026/9 – Ungarische Kulturpolitik der Zwischenkriegszeit',
		period: ['zwanzigstes-jahrhundert', 'Das 20. Jahrhundert', 50], topic: ['ungarn-zwischenkriegszeit', 'Ungarn in der Zwischenkriegszeit'], maxPoints: 4,
		sources: [
			{ kind: 'text', title: 'A) Gesetz, 1926', content: { text: 'Der ausgelassene Institutionstyp kann überall eingerichtet werden, wo in einem bestimmten Umkreis mindestens 20 Familien oder 30 täglich Schulpflichtige leben und keine geeignete Schule vorhanden ist.' } },
			{ kind: 'text', title: 'B) Zeitungsartikel, 1926', content: { text: 'Die moderne Volksbildung vertieft auf Grundlage elementarer Kenntnisse den moralischen und kulturellen Wert der Massen. In Orten mit mehr als fünftausend Einwohnern und in Kreissitzen soll der ausgelassene Institutionstyp errichtet werden.' } },
			{ kind: 'text', title: 'C) Rede, 1922', content: { text: 'Der Redner nennt es seine heilige Pflicht, über die Unabhängigkeit der wissenschaftlichen Forschung zu wachen. Die ausgelassene Institution habe einen Direktionsrat mit Vertretern der Stifterfamilien, Amtsträgern und wissenschaftlich interessierten Fachleuten.' } }
		],
		questions: [
			shortText('a) Welcher Institutionstyp fehlt in Quelle A?', ['Volksschule', 'Volksschulen'], ['Volksschule']),
			shortText('b) Welcher Institutionstyp fehlt in Quelle B?', ['Mittelschule', 'Mittelschulen'], ['Mittelschule']),
			shortText('c) Welcher Institutionstyp fehlt in Quelle C?', ['Ungarische Akademie der Wissenschaften'], ['Ungarische Akademie der Wissenschaften']),
			shortText('d) Nennen Sie den Minister (mit Vornamen), mit dessen Namen die Maßnahmen verbunden sind!', ['Kunó Klebelsberg', 'Kuno Klebelsberg'], ['Kunó Klebelsberg'])
		]
	},
	{
		number: 10, slug: 'test-2026-mai-10-deutschland-nach-1945', title: '[TEST] 2026/10 – Deutschland nach dem Zweiten Weltkrieg',
		period: ['zwanzigstes-jahrhundert', 'Das 20. Jahrhundert', 50], topic: ['deutschland-nach-1945', 'Deutschland nach 1945'], maxPoints: 4,
		sources: [
			{ kind: 'text', title: 'A) Potsdamer Konferenz, Sommer 1945', content: { text: 'Churchill fragt, was „Deutschland“ nun bedeute. Stalin antwortet, Deutschland sei das, was es nach dem Krieg geworden sei; ein anderes Deutschland gebe es nicht. Truman fragt nach Deutschland in den Grenzen von 1937. Stalin entgegnet, bei einer deutschen Verwaltung in Königsberg würde man sie verjagen.' } },
			{ kind: 'text', title: 'B) Potsdamer Konferenz, Sommer 1945', content: { text: 'Truman erinnert daran, dass Jalta Besatzungszonen für Großbritannien, die Sowjetunion, die Vereinigten Staaten und Frankreich vorgesehen habe. Nun habe offensichtlich Polen ohne vorherige Konsultation eine weitere „Besatzungszone“ erhalten.' } },
			{ kind: 'map', title: 'C) Die Besatzungszonen Deutschlands', content: { url: '/test-data/2026-mai-geschichte-de/aufgabe-10-karte.png' } }
		],
		questions: [
			multipleChoice('a) Welche zwei politischen Zielsetzungen werden durch Quelle A untermauert?', ['Stalin wollte für Deutschland neue Grenzen.', 'Truman akzeptierte die Aufteilung Deutschlands.', 'Stalin akzeptierte deutsche Verwaltung in Königsberg.', 'Truman erkannte die Gebietserweiterung Deutschlands vor dem Krieg nicht an.', 'Churchill wollte die sowjetische Besatzungszone verkleinern.'], [0, 3], 2),
			shortText('b) Erklären Sie anhand der Karte, warum Polen eine „Besatzungszone“ in Deutschland erhielt!', ['Polen verlor im Osten Gebiete.', 'Die Gebietsverluste Polens im Osten wurden durch deutsche Gebiete kompensiert.', 'Damit sich das Gebiet Polens nicht bedeutend verringerte.'], ['Ostverluste Polens wurden durch deutsche Gebiete kompensiert'], 1, true),
			shortText('c) Nennen Sie den deutschen Staat, der auf dem Gebiet der sowjetischen Besatzungszone entstand!', ['Deutsche Demokratische Republik', 'DDR'], ['Deutsche Demokratische Republik / DDR'])
		]
	},
	{
		number: 11, slug: 'test-2026-mai-11-wende', title: '[TEST] 2026/11 – Die Wende',
		period: ['zwanzigstes-jahrhundert', 'Das 20. Jahrhundert', 50], topic: ['ungarische-wende', 'Ungarische Wende'], maxPoints: 4,
		sources: [
			{ kind: 'text', title: 'A) Gesetz, 1990', content: { text: 'Ziel des Gesetzes ist die Verbesserung der wirtschaftlichen Effektivität und die Entfaltung von Markt- und Wettbewerbsverhältnissen; private Unternehmen sollen im Kleinhandel, Gastgewerbe und bei Konsumdienstleistungen bestimmend werden.' } },
			{ kind: 'text', title: 'B) Zeitungsartikel, 19. Oktober 1990', content: { text: 'Wegen der in der Golfkrise verdoppelten Ölpreise werde die Regierung die Verbraucherpreise für Benzin und Diesel drastisch erhöhen.' } },
			{ kind: 'text', title: 'C) Gesetz, 1996', content: { text: 'Es ist verboten, wirtschaftliche Tätigkeit unehrlich oder unter Verletzung der Interessen von Kunden und Konkurrenten auszuüben.' } },
			{ kind: 'text', title: 'D) Rede von József Antall, 1990', content: { text: 'Die internationale Beurteilung hänge davon ab, ob Ungarn die Zinsen für seine Kredite zahlen und eine effektive Wirtschaft aufbauen könne, für die der schwere Bestand nur noch eine kleinere Last bedeute.' } }
		],
		questions: [matching('Ordnen Sie den Quellen A–D die passenden Fachbegriffe zu. Zwei Begriffe bleiben übrig.', ['Quelle A', 'Quelle B', 'Quelle C', 'Quelle D'], ['Privatisierung', 'Staatsschulden', 'Inflation', 'freier Wettbewerb', 'Planwirtschaft', 'Entschädigung'], [0, 2, 3, 1], 4)]
	},
	{
		number: 12, slug: 'test-2026-mai-12-auslandsungarn', title: '[TEST] 2026/12 – Die Auslandsungarn',
		period: ['gegenwart', 'Gegenwart', 60], topic: ['auslandsungarn', 'Auslandsungarn'], maxPoints: 4,
		sources: [{ kind: 'table', title: 'Ungarische Minderheit im Karpatenbecken (gerundet)', content: { headers: ['Gebiet', 'Volkszählung 2001/2002', 'Volkszählung 2011'], rows: [['Siebenbürgen', '1 431 000', '1 239 000'], ['a)', '573 000', '459 000'], ['abgetrennte Südgebiete', '307 000', '271 000'], ['Karpatenvorland', '159 600', '152 000'], ['Burgenland', '6 541', '6 000']] } }],
		questions: [
			shortText('a) Nennen Sie das historische Gebiet, das in der Tabelle mit a) markiert ist!', ['Oberland'], ['Oberland']),
			shortText('b) Welches Gebiet ist gemeint? Ende 1989 beteiligten sich dort Ungarn am Sturz des kommunistischen Diktators; 1990 kam es zu Ausschreitungen gegen Ungarn; seit dem EU-Beitritt 2007 entsendet das Gebiet ungarische Abgeordnete ins Europäische Parlament.', ['Siebenbürgen'], ['Siebenbürgen']),
			shortText('c) Formulieren Sie zwei Ursachen für die Abnahme der ungarischen Minderheit im Karpatenbecken!', ['Assimilierung und Abwanderung', 'Assimilierung und Auswanderung', 'Assimilierung und natürliche Abnahme', 'Abwanderung und natürliche Abnahme', 'Migration und natürliche Abnahme'], ['Zwei aus: Assimilierung; Abwanderung / Auswanderung / Migration; natürliche Abnahme'], 2, true)
		]
	}
] as const;

try {
	await sql.begin(async (transaction) => {
		const [curriculum] = await transaction<{ id: number }[]>`
			insert into app_private.curricula (code, name) values ('NAT_2020', 'NAT 2020')
			on conflict (code) do update set name = excluded.name returning id
		`;
		const [session] = await transaction<{ id: number }[]>`
			insert into app_private.exam_sessions (year, session, official_code)
			values (2026, 'spring', 'K2512')
			on conflict (year, session) do update set official_code = excluded.official_code returning id
		`;

		for (const taskData of tasks) {
			const seedSlug = `${taskData.slug}-mock-exam`;
			const classification = classifyHistoryTask({ title: taskData.title, oldPeriod: taskData.period[0], oldTopics: [taskData.topic[1]], examPosition: taskData.number });
			const [period] = await transaction<{ id: number }[]>`
				select id from app_private.historical_periods where slug = ${periodSlug(String(classification.period))}
			`;
			const [topic] = await transaction<{ id: number }[]>`
				select id from app_private.topics where slug = ${topicSlug(classification.topic)}
			`;
			if (!period || !topic) throw new Error('Official history taxonomy is not installed.');

			const existing = await transaction<{ id: number; version_id: number | null; version_status: 'draft' | 'published' | 'retired' | null; exam_position: number | null }[]>`
				select task.id, version.id as version_id, version.status as version_status, version.exam_position
				from app_private.tasks as task
				left join lateral (
					select candidate.id, candidate.status, candidate.exam_position
					from app_private.task_versions as candidate
					where candidate.task_id = task.id
					order by case candidate.status when 'published' then 0 when 'draft' then 1 else 2 end, candidate.version desc
					limit 1
				) as version on true
				where task.slug = ${seedSlug}
			`;
			if (existing.length) {
				const existingTask = existing[0];
				if (!existingTask.version_id || !existingTask.version_status) throw new Error(`Seeded task ${seedSlug} has no version.`);
				await transaction`
					update app_private.tasks
					set status = 'published', updated_at = now()
					where id = ${existingTask.id}
				`;
				if (existingTask.version_status === 'draft') {
					await transaction`
						update app_private.task_versions
						set status = 'published', exam_position = ${taskData.number}, published_at = now(), updated_at = now()
						where id = ${existingTask.version_id}
					`;
				} else if (existingTask.version_status !== 'published' || existingTask.exam_position !== taskData.number) {
					throw new Error(`Seeded task ${seedSlug} is not an eligible published task at exam position ${taskData.number}.`);
				}
				continue;
			}

			const [task] = await transaction<{ id: number }[]>`
				insert into app_private.tasks (slug, status) values (${seedSlug}, 'draft') returning id
			`;
			const [version] = await transaction<{ id: number }[]>`
				insert into app_private.task_versions (task_id, version, status, title, instructions, curriculum_id, period_id, exam_session_id, history_scope, max_points, exam_position, published_at)
				values (${task.id}, 1, 'draft', ${taskData.title}, 'Offizielle Kurzantwort-Aufgabe aus der deutschsprachigen Abiturprüfung vom 6. Mai 2026. Als Testdaten importiert.', ${curriculum.id}, ${period.id}, ${session.id}, ${classification.scope}, ${taskData.maxPoints}, ${taskData.number}, null) returning id
			`;
			await transaction`insert into app_private.task_version_topics (task_version_id, topic_id) values (${version.id}, ${topic.id})`;

			for (const [position, source] of taskData.sources.entries()) {
				await transaction`
					insert into app_private.sources (task_version_id, position, kind, title, content)
					values (${version.id}, ${position}, ${source.kind}, ${source.title}, ${transaction.json(source.content)})
				`;
			}
			for (const [position, question] of taskData.questions.entries()) {
				await transaction`
					insert into app_private.questions (task_version_id, position, kind, prompt, config, grading_rule, max_points)
					values (${version.id}, ${position}, ${question.kind}, ${question.prompt}, ${transaction.json(question.config)}, ${transaction.json(question.gradingRule)}, ${question.maxPoints})
				`;
			}
			await transaction`update app_private.task_versions set status = 'published', published_at = now() where id = ${version.id}`;
			await transaction`update app_private.tasks set status = 'published' where id = ${task.id}`;
		}
	});
	const seeded = await sql<{ exam_position: number; max_points: number }[]>`
		select version.exam_position, version.max_points::float8 as max_points
		from app_private.task_versions as version
		inner join app_private.tasks as task on task.id = version.task_id
		inner join app_private.curricula as curriculum on curriculum.id = version.curriculum_id
		inner join app_private.exam_sessions as session on session.id = version.exam_session_id
		where task.slug like 'test-2026-mai-%-mock-exam'
			and task.status = 'published'
			and version.status = 'published'
			and curriculum.code = 'NAT_2020'
			and session.year >= 2024
			and session.session in ('spring', 'autumn')
		order by version.exam_position
	`;
	const ready = seeded.length === tasks.length && tasks.every((taskData, index) => {
		const row = seeded[index];
		return row?.exam_position === taskData.number && row.max_points === taskData.maxPoints;
	});
	if (!ready) throw new Error('Seed verification failed: the published mock-exam pool does not satisfy all 12 configured positions.');
	console.log('12 published short-answer exam tasks are ready for practice and mock exam mode (50 points verified). Essay tasks were not imported.');
} finally {
	await sql.end();
}
