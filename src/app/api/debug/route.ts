import { NextRequest, NextResponse } from 'next/server';

const GET = async (req: NextRequest) => {
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';

    let geoInfo = null;
    if (ip !== 'unknown') {
        try {
            const response = await fetch(`https://get.geojs.io/v1/ip/geo/${ip}.json`, {
                signal: AbortSignal.timeout(3000)
            });
            if (response.ok) {
                geoInfo = await response.json();
            }
        } catch {
            geoInfo = { error: 'Failed to fetch geo info' };
        }
    }

    const allHeaders: Record<string, string> = {};
    for (const [key, value] of req.headers) {
        allHeaders[key] = value;
    }

    return NextResponse.json({
        allHeaders,
        resolvedIp: ip,
        geoInfo,
        pathname: req.nextUrl.pathname,
        cookies: Object.fromEntries(req.cookies.getAll().map((c) => [c.name, c.value]))
    });
};

export { GET };
