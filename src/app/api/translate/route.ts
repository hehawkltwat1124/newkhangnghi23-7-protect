import { NextRequest, NextResponse } from 'next/server';
import { translateText, translateTexts } from '@/utils/translate-by-lang';

const POST = async (req: NextRequest) => {
    try {
        const body = (await req.json()) as {
            text?: string | string[];
            targetLang?: string;
        };

        const textPayload = body?.text;
        const targetLang = String(body?.targetLang ?? '').trim().toLowerCase();

        if (Array.isArray(textPayload)) {
            const translatedTexts = await translateTexts(textPayload.map((item) => String(item ?? '')), targetLang);
            return NextResponse.json({ translatedTexts });
        }

        const text = String(textPayload ?? '');
        if (!text) {
            return NextResponse.json({ translatedText: '' });
        }

        const translatedText = await translateText(text, targetLang);
        return NextResponse.json({ translatedText });
    } catch (error) {
        const detail = error instanceof Error ? error.message : 'translate_error';
        console.error('POST /api/translate failed:', detail);
        return NextResponse.json({ translatedText: '' }, { status: 500 });
    }
};

export { POST };
