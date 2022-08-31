export function isoLanguageCodeToFlagEmoji(languageCode: string): string {
    let regionCode: string;

    try {
        regionCode = new Intl.Locale(languageCode).maximize().region || languageCode;
    } catch {
        regionCode = languageCode;
    }

    if (regionCode.length !== 2) regionCode = 'UN';
    return String.fromCodePoint(...[...regionCode.toUpperCase()].map((c) => c.charCodeAt(0) + 0x1f1a5));
}

const isoLanguageDisplayNames = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'none' });
export function isoLanguageCodeToName(languageCode: string): string {
    return isoLanguageDisplayNames.of(languageCode) || languageCode.toUpperCase();
}
