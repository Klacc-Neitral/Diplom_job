const runtimeConfig = window.APP_CONFIG ?? {};
const serverUrl = (runtimeConfig.serverUrl || window.location.origin).replace(/\/$/, "");
const apiBaseUrl = (runtimeConfig.apiBaseUrl || `${serverUrl}/api`).replace(/\/$/, "");

export const APP_CONFIG = {
    serverUrl,
    apiBaseUrl,
};
