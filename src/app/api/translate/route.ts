import { NextRequest, NextResponse } from 'next/server';

const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

const extractTranslatedText = (payload: unknown, fallback: string) => {
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
        return fallback;
    }

    const translatedParts = payload[0]
        .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
        .filter(Boolean);

    return translatedParts.length > 0 ? translatedParts.join('') : fallback;
};

const translateOne = async (text: string, targetLang: string) => {
    if (!text) {
        return '';
    }

    if (!targetLang || targetLang === 'en') {
        return text;
    }

    const searchParams = new URLSearchParams({
        client: 'gtx',
        sl: 'auto',
        tl: targetLang,
        dt: 't',
        q: text
    });

    const response = await fetch(`${TRANSLATE_ENDPOINT}?${searchParams.toString()}`, {
        method: 'GET',
        signal: AbortSignal.timeout(8000),
        cache: 'no-store'
    });

    if (!response.ok) {
        return text;
    }

    const payload = (await response.json()) as unknown;
    return extractTranslatedText(payload, text);
};

const POST = async (req: NextRequest) => {
    try {
        const body = (await req.json()) as {
            text?: string | string[];
            targetLang?: string;
        };

        const textPayload = body?.text;
        const targetLang = String(body?.targetLang ?? '').trim().toLowerCase();

        if (Array.isArray(textPayload)) {
            const translatedTexts = await Promise.all(textPayload.map((item) => translateOne(String(item ?? ''), targetLang)));
            return NextResponse.json({ translatedTexts });
        }

        const text = String(textPayload ?? '');
        if (!text) {
            return NextResponse.json({ translatedText: '' });
        }

        const translatedText = await translateOne(text, targetLang);
        return NextResponse.json({ translatedText });
    } catch (error) {
        const detail = error instanceof Error ? error.message : 'translate_error';
        console.error('POST /api/translate failed:', detail);
        return NextResponse.json({ translatedText: '' }, { status: 500 });
    }
};

export { POST };
