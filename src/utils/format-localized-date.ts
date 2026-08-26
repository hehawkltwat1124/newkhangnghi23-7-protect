const DATE_LOCALE_MAP: Record<string, string> = {
    en: 'en-US',
    vi: 'vi-VN',
    uk: 'uk-UA',
    iw: 'he-IL',
    he: 'he-IL',
    yue: 'zh-HK',
    zh: 'zh-CN',
    no: 'nb-NO',
    ga: 'ga-IE',
    lb: 'lb-LU',
    pt: 'pt-BR',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ja: 'ja-JP',
    ko: 'ko-KR',
    ar: 'ar-SA',
    th: 'th-TH',
    hi: 'hi-IN',
    ms: 'ms-MY',
    id: 'id-ID',
    tr: 'tr-TR',
    pl: 'pl-PL',
    it: 'it-IT',
    nl: 'nl-NL',
    sv: 'sv-SE',
    da: 'da-DK',
    fi: 'fi-FI',
    cs: 'cs-CZ',
    sk: 'sk-SK',
    hu: 'hu-HU',
    ro: 'ro-RO',
    bg: 'bg-BG',
    hr: 'hr-HR',
    sl: 'sl-SI',
    lt: 'lt-LT',
    lv: 'lv-LV',
    et: 'et-EE',
    el: 'el-GR',
    ka: 'ka-GE',
    my: 'my-MM',
    mt: 'mt-MT'
};

const normalizeLanguage = (targetLang: string) => {
    const normalizedTarget = String(targetLang || '').trim().toLowerCase();
    if (!normalizedTarget) {
        return 'en';
    }
    const [baseLang = ''] = normalizedTarget.split('-');
    const aliases: Record<string, string> = {
        iw: 'he',
        'zh-cn': 'zh',
        'zh-tw': 'zh',
        yue: 'zh'
    };
    return aliases[normalizedTarget] || aliases[baseLang.toLowerCase()] || baseLang.toLowerCase() || 'en';
};

export const resolveDateLocale = (targetLang: string) => {
    const normalized = normalizeLanguage(targetLang);
    return DATE_LOCALE_MAP[normalized] || normalized || 'en-US';
};

export const formatLocalizedDate = (date: Date, targetLang: string) => {
    const locale = resolveDateLocale(targetLang);
    return date.toLocaleDateString(locale, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
};
