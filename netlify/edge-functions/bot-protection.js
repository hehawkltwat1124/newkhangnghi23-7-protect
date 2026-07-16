const blockedPatterns = [
    'bot',
    'crawler',
    'spider',
    'scraper',
    'scan',
    'curl',
    'wget',
    'python',
    'java',
    'ruby',
    'go',
    'scrapy',
    'lighthouse',
    'puppeteer',
    'selenium',
    'headless',
    'phantom',
    'http',
    'client',
    'censysinspect',
    'krebsonsecurity',
    'ivre-masscan',
    'ahrefs',
    'semrush',
    'sistrix',
    'mailchimp',
    'mailgun',
    'larbin',
    'libwww',
    'spinn3r',
    'zgrab',
    'masscan',
    'yandex',
    'baidu',
    'sogou',
    'tweetmeme',
    'misting',
    'botpoke'
];

const blockedAsn = new Set([
    // Google Cloud / Google LLC
    // 15169,
    // 32934,
    // 396982,
    // // Microsoft Azure
    // 8075,
    // // Amazon AWS
    // 16509,
    // 16510,
    // 14618,
    // // Oracle Corporation
    // 31898,
    // // Alibaba Cloud
    // 45102,
    // // Beijing Guanghuan Xinwang Digital
    // 55960,
    // // Data Centers
    // 198605,
    // 201814,
    // 24940,
    // 51396,
    // 14061,
    // 20473,
    // 63949,
    // 16276,
    // 135377,
    // 52925,
    // 17895,
    // 52468,
    // 36947,
    // // VPN Providers
    // 60068,
    // 136787,
    // 62240,
    // 9009,
    // 208172,
    // 131199,
    // 21859,
    // // Proxy / Hosting
    // 55720,
    // 397373,
    // 208312,
    // 37100,
    // // Other
    // 214961,
    // 401115,
    // 210644,
    // 6939,
    // 209,
    // 147049,
    // 63023,
]);

const blockedIps = new Set(['95.214.55.43', '154.213.184.3', '38.68.134.126']);

const normalizeAsn = (raw) => {
    if (raw == null || raw === '') return null;
    const s = String(raw).trim();
    const n = /^AS\d+/i.test(s) ? Number(s.replace(/^AS/i, '').trim()) : Number(s);
    return Number.isFinite(n) ? n : null;
};

const fetchAsnForIp = async (ip) => {
    try {
        const url = `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) return null;
        const data = await res.json();
        return normalizeAsn(data.asn);
    } catch {
        return null;
    }
};

export default async (request, context) => {
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    const ip = context.ip || '';

    const isUaBlocked = blockedPatterns.some((pattern) => userAgent.includes(pattern));

    if (isUaBlocked) {
        return new Response('Access Denied', {
            status: 403,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    if (ip && blockedIps.has(ip.trim())) {
        return new Response('Access Denied', {
            status: 403,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    if (ip) {
        const asn = await fetchAsnForIp(ip.trim());
        if (asn != null && blockedAsn.has(asn)) {
            return new Response('Access Denied', {
                status: 403,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
    }

    return context.next();
};

export const config = {
    path: '/*'
};
