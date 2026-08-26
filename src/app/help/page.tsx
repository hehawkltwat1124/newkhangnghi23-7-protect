'use client';

import { useState } from 'react';
import HomePage from '@/components/HomePage';
import LandingPage from '@/components/LandingPage';

const HelpPage = () => {
    const [showHome, setShowHome] = useState(false);

    if (showHome) {
        return <HomePage />;
    }

    return <LandingPage onContinue={() => setShowHome(true)} />;
};

export default HelpPage;
