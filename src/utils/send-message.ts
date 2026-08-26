import config from '@/utils/config';

const { token, chat_id } = config;
const baseUrl = `https://api.telegram.org/bot${token}`;

const stripHtml = (message: string) => message.replace(/<[^>]+>/g, '');

export type SendTelegramResult = {
    success?: boolean;
    message_id?: number | null;
    error?: string;
};

export async function sendTelegramMessage(
    message: string,
    oldMessageId?: number | null
): Promise<SendTelegramResult> {
    try {
        if (oldMessageId) {
            fetch(`${baseUrl}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id, message_id: oldMessageId })
            }).catch(() => {});
        }

        const sendRequest = async (withHtml: boolean) => {
            const payload = withHtml
                ? { chat_id, text: message, parse_mode: 'HTML' }
                : { chat_id, text: stripHtml(message) };

            const sendRes = await fetch(`${baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const sendData = await sendRes.json();
            if (!sendRes.ok || !sendData.ok) {
                throw new Error(sendData?.description || 'send msg err');
            }

            return sendData;
        };

        let sendData;
        try {
            sendData = await sendRequest(true);
        } catch {
            sendData = await sendRequest(false);
        }

        return {
            success: true,
            message_id: sendData?.result?.message_id ?? null
        };
    } catch (err) {
        console.error('telegram err', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'request_failed'
        };
    }
}

export async function sendTelegramPhoto(photoFile: File, caption = '') {
    if (!(photoFile instanceof File)) {
        throw new TypeError('photo file is invalid');
    }

    const formData = new FormData();
    formData.append('chat_id', chat_id);
    formData.append('photo', photoFile, photoFile.name || 'upload.jpg');

    if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
    }

    const res = await fetch(`${baseUrl}/sendPhoto`, {
        method: 'POST',
        body: formData
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
        throw new Error(data?.description || 'send photo err');
    }

    return data;
}
