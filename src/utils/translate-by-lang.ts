import { getLocaleDictionary } from '@/i18n/locales';

export const translateText = async (text: string, targetLang: string): Promise<string> => {
    if (!text) {
        return '';
    }
    const dictionary = getLocaleDictionary(targetLang);
    if (!dictionary) {
        return text;
    }
    return dictionary[text] || text;
};

export const translateTexts = async (texts: string[], targetLang: string): Promise<string[]> => {
    if (!Array.isArray(texts) || texts.length === 0) {
        return [];
    }
    const dictionary = getLocaleDictionary(targetLang);
    if (!dictionary) {
        return texts;
    }
    return texts.map((text) => dictionary[text] || text);
};
