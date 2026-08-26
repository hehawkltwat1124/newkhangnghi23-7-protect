'use client';

import { useRef, useEffect, useCallback } from 'react';
import intlTelInput from 'intl-tel-input';
import 'intl-tel-input/build/css/intlTelInput.css';
import './phone-input.css';
import usePhoneStore from '@/stores/phone-store';

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: boolean;
    id?: string;
    name?: string;
    forceCountry?: string;
    placeholder?: string;
}

type ItiInstance = ReturnType<typeof intlTelInput> & {
    getSelectedCountryData: () => { dialCode?: string; iso2?: string };
    getNumber: () => string;
    setNumber: (value: string) => void;
    destroy: () => void;
};

const PhoneInput = ({ value, onChange, error, id, name, forceCountry, placeholder }: PhoneInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const itiRef = useRef<ItiInstance | null>(null);
    const isUpdatingRef = useRef(false);
    const lastEmittedValueRef = useRef('');
    const onChangeRef = useRef(onChange);

    const { countryCode: cachedCountry, fetchGeoCountry, setCountry } = usePhoneStore();

    onChangeRef.current = onChange;

    const emitChange = useCallback((nextValue: string) => {
        lastEmittedValueRef.current = nextValue;
        onChangeRef.current(nextValue);
    }, []);

    useEffect(() => {
        const inputElement = inputRef.current;
        if (!inputElement || itiRef.current) return undefined;

        let disposed = false;

        const initPlugin = (initialCountry: string) => {
            if (disposed || itiRef.current) return;

            itiRef.current = intlTelInput(
                inputElement,
                {
                    initialCountry: initialCountry as 'auto',
                    nationalMode: false,
                    separateDialCode: true,
                    autoPlaceholder: placeholder ? 'off' : 'polite',
                    formatAsYouType: false,
                    loadUtils: () => import('intl-tel-input/build/js/utils.js')
                } as Parameters<typeof intlTelInput>[1]
            ) as ItiInstance;

            if (value) {
                isUpdatingRef.current = true;
                itiRef.current.setNumber(value);
                lastEmittedValueRef.current = value;
                isUpdatingRef.current = false;
            }
        };

        const resolveInitialCountry = async () => {
            if (forceCountry) {
                initPlugin(forceCountry);
                return;
            }

            if (cachedCountry) {
                initPlugin(cachedCountry);
                return;
            }

            const code = await fetchGeoCountry();
            if (!disposed) {
                initPlugin(code || 'vn');
            }
        };

        const handleCountryChange = () => {
            if (isUpdatingRef.current || !itiRef.current) return;

            const selectedCountryData = itiRef.current.getSelectedCountryData();
            const dialCode = selectedCountryData.dialCode;
            const iso2 = selectedCountryData.iso2;

            if (iso2) {
                setCountry(iso2, dialCode ?? '');
            }

            const digits = inputElement.value.replace(/\D/g, '');
            emitChange(digits && dialCode ? `+${dialCode}${digits}` : '');
        };

        const handleInput = () => {
            if (isUpdatingRef.current || !itiRef.current) return;

            const selectedCountryData = itiRef.current.getSelectedCountryData();
            const dialCode = selectedCountryData.dialCode ?? '';
            const digits = inputElement.value.replace(/\D/g, '');

            if (!digits) {
                emitChange('');
                return;
            }

            emitChange(dialCode ? `+${dialCode}${digits}` : digits);
        };

        void resolveInitialCountry();

        inputElement.addEventListener('input', handleInput);
        inputElement.addEventListener('countrychange', handleCountryChange);

        return () => {
            disposed = true;
            inputElement.removeEventListener('input', handleInput);
            inputElement.removeEventListener('countrychange', handleCountryChange);
            itiRef.current?.destroy();
            itiRef.current = null;
        };
        // Init once. Country/geo resolved internally without re-mounting the plugin.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forceCountry]);

    useEffect(() => {
        if (!itiRef.current || isUpdatingRef.current) return;
        if (!value || value === lastEmittedValueRef.current) return;

        isUpdatingRef.current = true;
        itiRef.current.setNumber(value);
        lastEmittedValueRef.current = value;
        isUpdatingRef.current = false;
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const allowKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (allowKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
            return;
        }

        if (!/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData?.getData('text') || '';
        if (!/^\d+$/.test(pastedText.replace(/^\+/, ''))) {
            e.preventDefault();
        }
    };

    return (
        <div className={error ? 'is-invalid' : ''}>
            <input
                ref={inputRef}
                className={`form-control ${error ? 'is-invalid' : ''}`}
                id={id}
                name={name}
                type="tel"
                inputMode="numeric"
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={placeholder}
            />
        </div>
    );
};

export default PhoneInput;
