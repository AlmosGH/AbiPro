import { translate, type Locale } from '$lib/i18n';

interface SocialPageData {
	task?: { title: string; year: number | null };
}

export function getSocialMetadata(pathname: string, data: SocialPageData, locale: Locale) {
	const t = (key: string) => translate(locale, key);
	const description = t('Geschichte gezielt üben, Fortschritte verfolgen und sicherer in die Prüfung gehen.');

	if (pathname.startsWith('/aufgaben/') && data.task) {
		return {
			title: data.task.title,
			description: [data.task.title, data.task.year, t('Geschichtsaufgabe auf AbiPro ansehen und üben.')].filter(Boolean).join(' · ')
		};
	}

	const pages: Record<string, { title: string; description: string }> = {
		'/': {
			title: t('Geschichte verstehen. Sicherer in die Prüfung.'),
			description: t('Entdecke echte Geschichtsaufgaben. Mit einem Konto kannst du gezielt üben, Probeprüfungen schreiben und deinen Fortschritt verfolgen.')
		},
		'/aufgaben': {
			title: t('Geschichtsaufgaben entdecken'),
			description: t('Durchsuche veröffentlichte Aufgaben nach Thema, Epoche und Prüfungsjahr.')
		},
		'/login': { title: t('Bei AbiPro anmelden'), description },
		'/register': { title: t('Kostenlos bei AbiPro registrieren'), description },
		'/datenschutz': { title: t('Datenschutz'), description },
		'/impressum': { title: t('Impressum'), description },
		'/ki-bewertung': { title: t('KI-Bewertung'), description }
	};

	return pages[pathname] ?? { title: 'AbiPro', description };
}
