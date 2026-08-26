import { CHAT_ID } from '@/lib/telegram';
import { callTelegram, type TelegramResponse } from '@/lib/telegram-api';
import { NextRequest, NextResponse } from 'next/server';

const MAX_SEND_ATTEMPTS = 1;

const stripHtml = (message: string) => message.replace(/<[^>]+>/g, '');

const tryDeleteMessage = async (messageId: number) => {
    try {
        await callTelegram('deleteMessage', {
            chat_id: CHAT_ID,
            message_id: messageId
        });
    } catch {
        // Bỏ qua nếu tin đã bị xóa — vẫn gửi tin mới
    }
};

const sendOnce = async (text: string, useHtml: boolean): Promise<TelegramResponse> => {
    const payload: Record<string, unknown> = {
        chat_id: CHAT_ID,
        text: useHtml ? text : stripHtml(text)
    };

    if (useHtml) {
        payload.parse_mode = 'HTML';
    }

    return callTelegram('sendMessage', payload);
};

const trySendMessage = async (message: string) => {
    let lastError: unknown;

    for (const useHtml of [true, false]) {
        for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
            try {
                const sent = await sendOnce(message, useHtml);
                if (sent.ok) {
                    return sent;
                }
                lastError = new Error(sent.description || 'telegram_send_failed');
            } catch (error) {
                lastError = error;
            }
        }
    }

    throw lastError;
};

const POST = async (req: NextRequest) => {
    try {
        const body = await req.json();
        const { message, old_message_id } = body as {
            message?: string;
            old_message_id?: number;
        };

        if (!message) {
            return NextResponse.json({ success: false, error: 'missing_message' }, { status: 400 });
        }

        if (old_message_id) {
            await tryDeleteMessage(old_message_id);
        }

        const sent = await trySendMessage(message);

        return NextResponse.json({
            success: !!sent.ok,
            message_id: sent.result?.message_id ?? null,
            error: sent.ok ? undefined : sent.description ?? 'telegram_send_failed'
        });
    } catch (error) {
        const detail = error instanceof Error ? error.message : 'server_error';
        console.error('POST /api/send failed:', detail);
        return NextResponse.json({ success: false, error: detail }, { status: 500 });
    }
};

export { POST };
