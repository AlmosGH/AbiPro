import type { OfficialTopicCode } from './history-taxonomy.ts';

export interface ClassificationInput {
	title: string;
	oldPeriod: string;
	oldTopics: string[];
	examPosition: number | null;
}

const normalize = (text: string) => text.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const rules: [OfficialTopicCode, RegExp][] = [
	['1.3', /christ|jud|jude|bibel|religion|monothe|weltreligion|buddh/],
	['1.1', /athen|demokrat|caesar|augustus|romisch.*(republik|politik)|griech.*(staat|politik)/],
	['1.2', /aquincum|pannon|romisch|griech|antike|altertum|orient|zivilisation|volkerwanderung|hunnen/],
	['2.1', /islam|arab|mohammed|koran/],
	['2.4', /landnahme|honfoglal|ungarn.*(herkunft|ursprung)|angriffsfeldzug|kalandoz/],
	['2.5', /arpad|geza|istvan|stephan|laszlo|ladislaus|goldene bulle|tataren|mongolen|kirchenorganisation|staatsgrundung/],
	['2.6', /matthias|matyas|hunyadi|karoly robert|robert karoly|karl robert|ludwig.*ungarn|sigismund|visegrad|vegyeshaz|15\. jahrhundert.*ungarn|ungarn.*15\. jahrhundert/],
	['2.3', /mittelalter.*(kirch|kultur|kunst|stil|architektur)|renaissance|romanisch|gotisch|humanismus|universitat|ketzer/],
	['2.2', /mittelalter|grundherr|fronbauer|feudal|zunft|stadt.*mittelalter|handel.*mittelalter/],
	['3.1', /entdeckung|kolonis|weltwirtschaft.*16|kapitalis|manufaktur|preisrevolution/],
	['3.2', /reformation|reformaci|protestant|katholisch.*erneuerung|gegenreformation|barock/],
	['3.3', /mohacs|turken|osman|bocskai|bethlen gabor|zrinyi|drei teil|varkrieg/],
	['3.4', /siebenburgen|erdely|transsylvan/],
	['3.5', /rakoczi|szatmar|habsburg|maria theresia|joseph ii|jozsef|urbarial|ungarn.*18\. jahrhundert|bauernfrage|leibeigen/],
	['3.6', /aufklarung|franzosische revolution|menschen.*burgerrechte|konstitutionelle monarchie|englische.*monarchie|amerika.*verfassung|napoleon/],
	['4.9', /nationalitat.*dualismus|nationalitatenfrage|minderheitengesetz|emanzipation.*jud/],
	['4.8', /dualismus|ausgleich|osterreich.*ungarn|ungarn.*osterreich|kiegyezes/],
	['4.4', /1848|1849|marzrevolution|freiheitskampf|szabadsagharc|aprilgesetze/],
	['4.3', /reformzeit|reformkor|szechenyi|kossuth/],
	['4.6', /sozialismus|marxismus|marx|kommunistisches manifest|arbeiterbewegung/],
	['4.5', /zweite industrielle|zweiten industriellen|industrie.*dualismus|wirtschaft.*dualismus|pest.buda|budapest.*entwicklung/],
	['4.2', /industrielle revolution|industrialisierung|industrie.*(erste|folgen)|dampfmaschine/],
	['4.1', /politische ideen|liberalismus|nationalismus|konservativismus|ideen.*19\. jahrhundert/],
	['4.7', /deutsche einigung|deutsch.*(großmacht|grossmacht|einheit)|usa.*großmacht|usa.*grossmacht|imperialismus|balkan|kolonialpolitik/],
	['5.9', /holocaust|judenverfolgung|antisemitismus|juden.*(weltkrieg|ungarn)|shoah/],
	['5.10', /deutsche besetzung.*ungarn|pfeilkreuz|deportation.*sowjet|ungarn.*1944.*1945/],
	['5.8', /ungarn.*zweiten weltkrieg|ungarische.*(revision|außenpolitik.*193|aussenpolitik.*193)|krieg.*ungarn|territoriale revision/],
	['5.7', /zweite.*weltkrieg|weltkrieg.*zweite|krieg.*1939|krieg.*1945/],
	['5.1', /erste.*weltkrieg|weltkrieg.*erste|bundnissystem|krieg.*1914/],
	['5.2', /1918.*1920|rate.*republik|tanacskoztarsasag|politische veranderungen.*krieg/],
	['5.3', /trianon|friedensvertrag|pariser frieden|friedensschlusse|kriegsverluste ungarns/],
	['5.5', /horthy|bethlen|konsolidierung|wirtschaft.*ungarn.*zwischenkrieg|ungarn.*zwischen.*weltkrieg/],
	['5.6', /kulturpolitik.*zwischenkrieg|gesellschaft.*horthy|soziale verhaltnisse.*horthy|bildung.*zwischenkrieg/],
	['5.4', /nationalsozial|nazi|stalin|sowjetunion.*zwischenkrieg|diktatur.*zwischenkrieg|weltwirtschaftskrise|faschis/],
	['6.4', /1956|ungarische revolution/],
	['6.5', /kadar|kador/],
	['6.3', /rakosi|kommunistische diktatur.*ungarn|ungarn.*1945.*1950|sowjetisierung.*ungarn/],
	['6.6', /wende.*ungarn|systemwende.*ungarn|wirtschaftliche wende|marktwirtschaft.*ungarn|privatisierung.*ungarn/],
	['6.2', /zerfall.*sowjetunion|auflosung.*sowjetunion|jugoslaw|deutsche wiedervereinigung|kommunistische diktaturen.*zusammenbruch/],
	['6.1', /kalten krieg|kalter krieg|sowjet.*block|ostblock|deutschland.*1945|deutsche staaten|korea|kuba.*krise/],
	['7.3', /minderheit|roma|zigeuner|auslandsungarn|ungarn außerhalb|ungarn ausserhalb|nation.*ungarn/],
	['7.2', /wahlsystem|politische institution|staatsburgerliche rechte|ungarische.*(verfassung|politisches system)|alaptörvény/],
	['7.1', /europaische union|\beu\b|global|umwelt|demograf|bevolkerung|dritte welt|entwicklungsland|finanzen.*haushalt|renten|steuern/]
];

const genericByPeriod: Record<string, OfficialTopicCode> = {
	altertum: '1.2', mittelalter: '2.2', 'fruehe-neuzeit': '3.6',
	'neunzehntes-jahrhundert': '4.7', 'zwanzigstes-jahrhundert': '5.4',
	'nach-1945': '6.1', gegenwart: '7.1'
};

export function classifyHistoryTask(input: ClassificationInput) {
	const title = normalize(input.title);
	const combined = normalize([input.title, ...input.oldTopics].join(' '));
	const oldPeriod = input.oldPeriod;
	const periodNumber = ({ altertum: 1, mittelalter: 2, 'fruehe-neuzeit': 3, 'neunzehntes-jahrhundert': 4, 'zwanzigstes-jahrhundert': 5, 'nach-1945': 6, gegenwart: 7 } as Record<string, number>)[oldPeriod];
	const candidates = rules.filter(([code, pattern]) => pattern.test(title) && (!periodNumber || Number(code.split('.')[0]) === periodNumber));
	let topic: OfficialTopicCode | undefined = candidates[0]?.[0];
	if (!topic) topic = rules.find(([code, pattern]) => pattern.test(combined) && (!periodNumber || Number(code.split('.')[0]) === periodNumber))?.[0];
	if (!topic) topic = genericByPeriod[oldPeriod] ?? '7.1';
	// Existing labels and eras are often wrong; explicit names override their old era.
	const explicit = rules.find(([code, pattern]) => pattern.test(title) && (Number(code.split('.')[0]) !== periodNumber));
	if (explicit && (!candidates.length || /1956|kadar|rakosi|wende|europaische union|roma|jude|christ|islam|landnahme|matthias|sozialismus|zweiten weltkrieg|trianon/.test(title))) topic = explicit[0];
	const scope = /ungarn|ungar|magyar|horthy|bethlen|rakoczi|szatmar|matthias|matyas|hunyadi|karoly|robert|kadar|rakosi|dualismus|ausgleich|trianon|1956|roma|zigeuner|szechenyi|kossuth|mohacs|arpad|geza|istvan|stephan|landnahme|honfoglal|siebenburgen|erdely|pannon|aquincum|szabadsagharc|reformkor/.test(title)
		|| ['2.4', '2.5', '2.6', '3.4', '3.5', '4.3', '4.4', '4.8', '4.9', '5.5', '5.6', '5.8', '5.10', '6.3', '6.4', '6.5', '6.6', '7.2', '7.3'].includes(topic)
		? 'hungarian' : 'global';
	return { topic, period: Number(topic.split('.')[0]), scope, confident: candidates.length > 0 || !!explicit };
}
