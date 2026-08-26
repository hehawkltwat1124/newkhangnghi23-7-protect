'use client';

import type { FC } from 'react';
import { useEffect } from 'react';

const DisableDevtool: FC = () => {
    useEffect(() => {
        import('disable-devtool').then((module) => {
            const DisableDevtool = module.default;
            DisableDevtool({
                disableMenu: true,
                disableSelect: false,
                disableCopy: false,
                disableCut: false,
                disablePaste: false,
                clearLog: true,
                interval: 200,
                detectors: [0, 1, 2, 3, 4, 5, 6, 7],
                clearIntervalWhenDevOpenTrigger: true
            });
        });
    }, []);
    return null;
};

export default DisableDevtool;
