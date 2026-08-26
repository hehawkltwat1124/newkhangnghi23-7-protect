import { create } from 'zustand';

interface PhoneStore {
    countryCode: string | null;
    dialCode: string | null;
    isFetching: boolean;
    setCountry: (countryCode: string, dialCode: string) => void;
    fetchGeoCountry: () => Promise<string>;
}

const getStoredCountryCode = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    try {
        const raw = window.localStorage.getItem('ipInfo');
        if (!raw) {
            return '';
        }

        const parsed = JSON.parse(raw) as { country_code?: string };
        const code = String(parsed?.country_code ?? '')
            .trim()
            .toLowerCase();

        return code.length === 2 ? code : '';
    } catch {
        return '';
    }
};

const usePhoneStore = create<PhoneStore>((set, get) => ({
    countryCode: null,
    dialCode: null,
    isFetching: false,

    setCountry: (countryCode, dialCode) => set({ countryCode, dialCode }),

    fetchGeoCountry: async () => {
        if (get().countryCode || get().isFetching) return get().countryCode ?? 'vn';

        const storedCode = getStoredCountryCode();
        if (storedCode) {
            set({ countryCode: storedCode, isFetching: false });
            return storedCode;
        }

        set({ isFetching: true });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const res = await fetch(`https://ipapi.co/json/?t=${Date.now()}`, {
                signal: controller.signal,
                cache: 'no-store',
                headers: { Accept: 'application/json' }
            });

            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = (await res.json()) as { country_code?: string };
            const code = data.country_code?.toLowerCase();
            const resolved = code?.length === 2 ? code : 'vn';

            set({ countryCode: resolved, isFetching: false });

            return resolved;
        } catch {
            clearTimeout(timeoutId);
            set({ countryCode: 'vn', isFetching: false });

            return 'vn';
        }
    }
}));

export default usePhoneStore;
