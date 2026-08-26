declare module '*.png' {
    const content: string;
    export default content;
}

declare module '*.jpg' {
    const content: string;
    export default content;
}

declare module '*.jpeg' {
    const content: string;
    export default content;
}

declare module '*.svg' {
    import type { StaticImageData } from 'next/image';
    const content: StaticImageData;
    export default content;
}

declare module '*.webp' {
    const content: string;
    export default content;
}

declare module 'intl-tel-input/build/js/utils.js';
