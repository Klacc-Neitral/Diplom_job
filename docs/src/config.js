// Для ngrok замените значение на ваш публичный URL, например:
// const SERVER_URL = "https://abc123.ngrok-free.app";
const SERVER_URL = "http://127.0.0.1:8000";

export const APP_CONFIG = {
    serverUrl: SERVER_URL,
    apiBaseUrl: `${SERVER_URL}/api`,
};
