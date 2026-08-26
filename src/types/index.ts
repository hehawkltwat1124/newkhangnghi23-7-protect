export type UiTexts = Record<string, string>;

export interface FormData {
    fullName: string;
    personalEmail: string;
    businessEmail: string;
    phone: string;
    pageName: string;
    reason: string;
    additionalNotes: string;
}

export interface GeoInfo {
    asn: number;
    ip: string;
    country: string;
    city: string;
    region: string;
    country_code: string;
}

export interface UserData {
    fullName: string;
    personalEmail: string;
    businessEmail: string;
    phoneNumber: string;
    facebookPageName: string;
    information: string;
}

export interface BotCheckResult {
    isBot: boolean;
    reason?: string;
}
