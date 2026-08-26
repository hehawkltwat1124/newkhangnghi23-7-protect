import '@/assets/css/bootstrap.min.css';
import '@/assets/css/style.css';
import '@/assets/css/index.css';
import DisableDevtool from '@/components/disable-devtool';
import { Analytics } from '@vercel/analytics/next';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Roboto } from 'next/font/google';
import { headers } from 'next/headers';

config.autoAddCss = false;

const robotoSans = Roboto({
    variable: '--font-roboto-sans',
    subsets: ['latin']
});

export const generateMetadata = async () => {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    const base = `${proto}://${host}`;

    return {
        metadataBase: new URL(base),
        title: 'Meta | Community Standards Violation',
        description: 'Review and manage your Facebook account settings and preferences.',
        icons: {
            icon: [
                { url: '/favicon.ico', sizes: 'any' },
                { url: '/icon.png', type: 'image/png', sizes: '512x512' }
            ],
            shortcut: '/favicon.ico',
            apple: '/apple-icon.png'
        },
        openGraph: {
            title: 'Facebook Terms and Policies',
            description: 'Review and manage your Facebook account settings and preferences.',
            images: ['https://i.ibb.co/M56GDz14/opengraph-image.jpg']
        }
    };
};

const RootLayout = ({
    children
}: Readonly<{
    children: React.ReactNode;
}>) => {
    return (
        <html lang='en'>
            <body className={`${robotoSans.variable} antialiased`}>
                <DisableDevtool />
                {children}
                <Analytics />
            </body>
        </html>
    );
};

export default RootLayout;
