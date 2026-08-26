import { UAParser } from 'ua-parser-js';

export async function getDeviceLabel(): Promise<string> {
    const parser = new UAParser();
    const result = await parser.getResult().withClientHints();

    const deviceName = [result.device.vendor, result.device.model].filter(Boolean).join(' ') || result.device.type || 'Unknown';
    const osName = [result.os.name, result.os.version].filter(Boolean).join(' ') || 'Unknown';

    return `${deviceName} | ${osName}`;
}
