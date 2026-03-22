let initPromise = null;
let platformUser = null;

function hasVkAppIdParam() {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("vk_app_id")) return true;

    const rawHash = typeof window.location.hash === "string" ? window.location.hash : "";
    const hashWithoutPound = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
    const hashQuery = hashWithoutPound.includes("?")
      ? hashWithoutPound.slice(hashWithoutPound.indexOf("?") + 1)
      : hashWithoutPound;
    const hashParams = new URLSearchParams(hashQuery);

    return hashParams.has("vk_app_id");
  } catch {
    return false;
  }
}

function applyDefaultTheme() {
  try {
    document.documentElement.style.colorScheme = "light";
    document.documentElement.style.setProperty("--app-bg", "#f0f2f5");
    document.documentElement.style.setProperty("--app-text", "#333333");
    document.documentElement.style.setProperty("--app-surface", "#ffffff");
  } catch {
    // no-op
  }
}

function applyVkThemeTokens(tokens) {
  if (!tokens || typeof tokens !== "object") return;

  try {
    if (typeof tokens.scheme === "string") {
      document.documentElement.setAttribute("data-vk-scheme", tokens.scheme);
    }
    if (typeof tokens.appearance === "string") {
      document.documentElement.setAttribute("data-vk-appearance", tokens.appearance);
      if (tokens.appearance === "dark" || tokens.appearance === "light") {
        document.documentElement.style.colorScheme = tokens.appearance;
      }
    }

    if (tokens.theme && typeof tokens.theme === "object") {
      for (const [key, value] of Object.entries(tokens.theme)) {
        if (typeof value !== "string") continue;
        const cssVarName = key.startsWith("--") ? key : `--${key}`;
        document.documentElement.style.setProperty(cssVarName, value);
      }
    }
  } catch {
    // no-op
  }
}

export function detectEnv() {
  if (typeof window === "undefined") return "browser";

  if (window.vkBridge?.send || window.vk || hasVkAppIdParam()) return "vk";
  if (window.Telegram?.WebApp) return "telegram";
  return "browser";
}

export function getPlatformUser() {
  return platformUser;
}

export function initPlatform() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const env = detectEnv();

    if (env === "telegram") {
      const tg = window.Telegram?.WebApp;
      if (tg?.ready) tg.ready();
      if (tg?.expand) tg.expand();

      const tgUser = tg?.initDataUnsafe?.user;
      if (tgUser?.id != null) {
        const firstName = tgUser.first_name ?? "";
        const lastName = tgUser.last_name ?? "";
        const fullName = `${firstName} ${lastName}`.trim();
        const name = fullName || tgUser.username || String(tgUser.id);
        platformUser = { id: String(tgUser.id), name };
      } else {
        platformUser = null;
      }

      return;
    }

    if (env === "vk") {
      const bridge = window.vkBridge;

      if (!bridge?.send) {
        applyDefaultTheme();
        platformUser = null;
        return;
      }

      if (bridge.subscribe) {
        bridge.subscribe((event) => {
          if (event?.detail?.type !== "VKWebAppUpdateConfig") return;
          applyVkThemeTokens(event.detail.data);
        });
      }

      try {
        await bridge.send("VKWebAppInit");
      } catch {
        applyDefaultTheme();
      }

      platformUser = null;
      return;
    }

    applyDefaultTheme();
    platformUser = null;
  })();

  return initPromise;
}
