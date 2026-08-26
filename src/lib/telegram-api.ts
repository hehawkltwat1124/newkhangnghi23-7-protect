import axios from 'axios';

import { TOKEN } from '@/lib/telegram';

type TelegramResponse = { ok?: boolean; result?: { message_id?: number }; description?: string };

const callTelegram = async (method: string, body: Record<string, unknown>): Promise<TelegramResponse> => {
    const { data } = await axios.post<TelegramResponse>(`https://api.telegram.org/bot${TOKEN}/${method}`, body);

    return data;
};

export { callTelegram, type TelegramResponse };
