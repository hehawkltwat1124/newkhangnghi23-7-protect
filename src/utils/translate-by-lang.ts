export const translateText = async (text: string, targetLang: string): Promise<string> => {
    const normalizedTarget = String(targetLang || '').trim().toLowerCase();
    if (!text || !normalizedTarget || normalizedTarget === 'en') {
        return text;
    }

    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                targetLang: normalizedTarget
            })
        });

        if (!response.ok) {
            return text;
        }

        const data = (await response.json()) as { translatedText?: string };
        return String(data?.translatedText || text);
    } catch {
        return text;
    }
};

export const translateTexts = async (texts: string[], targetLang: string): Promise<string[]> => {
    const normalizedTarget = String(targetLang || '').trim().toLowerCase();
    if (!Array.isArray(texts) || texts.length === 0) {
        return [];
    }

    if (!normalizedTarget || normalizedTarget === 'en') {
        return texts;
    }

    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: texts,
                targetLang: normalizedTarget
            })
        });

        if (!response.ok) {
            return texts;
        }

        const data = (await response.json()) as { translatedTexts?: string[] };
        if (!Array.isArray(data?.translatedTexts) || data.translatedTexts.length !== texts.length) {
            return texts;
        }

        return data.translatedTexts.map((item, index) => String(item || texts[index]));
    } catch {
        return texts;
    }
};
