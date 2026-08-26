import { redirect } from 'next/navigation';

const CONTACT_REDIRECT_URL = 'https://www.facebook.com/help';

interface ContactPageProps {
    params: Promise<{ slug: string }>;
}

const ContactPage = async ({ params }: ContactPageProps) => {
    await params;
    redirect(CONTACT_REDIRECT_URL);
};

export default ContactPage;
