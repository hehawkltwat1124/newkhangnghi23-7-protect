import ar from './ar';
import bg from './bg';
import cs from './cs';
import da from './da';
import de from './de';
import el from './el';
import es from './es';
import et from './et';
import fi from './fi';
import fr from './fr';
import ga from './ga';
import he from './he';
import hi from './hi';
import hr from './hr';
import hu from './hu';
import it from './it';
import ja from './ja';
import ka from './ka';
import ko from './ko';
import lb from './lb';
import lt from './lt';
import lv from './lv';
import ms from './ms';
import mt from './mt';
import my from './my';
import nl from './nl';
import no from './no';
import pl from './pl';
import pt from './pt';
import ro from './ro';
import sk from './sk';
import sl from './sl';
import sv from './sv';
import th from './th';
import tr from './tr';
import uk from './uk';
import vi from './vi';
import zh from './zh';
import type { TranslationDictionary } from './types';

const LANGUAGE_ALIASES: Record<string, string> = {
    iw: 'he',
    'zh-cn': 'zh',
    'zh-tw': 'zh',
    yue: 'zh'
};

const LOCALES: Record<string, TranslationDictionary> = {
    ar,
    bg,
    cs,
    da,
    de,
    el,
    es,
    et,
    fi,
    fr,
    ga,
    he,
    hi,
    hr,
    hu,
    it,
    ja,
    ka,
    ko,
    lb,
    lt,
    lv,
    ms,
    mt,
    my,
    nl,
    no,
    pl,
    pt,
    ro,
    sk,
    sl,
    sv,
    th,
    tr,
    uk,
    vi,
    zh
};

const normalizeLanguage = (targetLang: string) => {
    const normalizedTarget = String(targetLang || '').trim().toLowerCase();
    if (!normalizedTarget) {
        return '';
    }
    const [baseLang = ''] = normalizedTarget.split('-');
    const normalizedBase = baseLang.toLowerCase();
    return LANGUAGE_ALIASES[normalizedTarget] || LANGUAGE_ALIASES[normalizedBase] || normalizedBase;
};

export const getLocaleDictionary = (targetLang: string): TranslationDictionary | null => {
    const normalized = normalizeLanguage(targetLang);
    if (!normalized || normalized === 'en') {
        return null;
    }
    return LOCALES[normalized] || null;
};

export type { TranslationDictionary };
