function normalizeTelegramUser(user) {
  return {
    user_id: `tg_${user.id}`,
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    username: user.username || null,
    avatar_url: user.photo_url || null,
    platform: "tg",
  };
}

function normalizeVkUser(user) {
  return {
    user_id: `vk_${user.id}`,
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    username: user.screen_name || null,
    avatar_url: user.photo_200 || user.photo_100 || user.photo_max_orig || null,
    platform: "vk",
  };
}

function hasVkLaunchParams() {
  const rawQuery = `${window.location.search || ""}&${window.location.hash || ""}`;
  return /vk_(app_id|platform|user_id)=|(^|[?&#])sign=/.test(rawQuery);
}

function withTimeout(promise, timeoutMs = 1500) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("VK init timeout")), timeoutMs);
    }),
  ]);
}

function tryInitTelegram() {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  if (!tg || !user || !user.id) {
    return null;
  }

  if (typeof tg.ready === "function") {
    tg.ready();
  }

  if (typeof tg.expand === "function") {
    tg.expand();
  }

  return {
    context: "telegram",
    user: {
      ...normalizeTelegramUser(user),
      init_data: tg.initData || "",
    },
  };
}

async function tryInitVk() {
  const bridge = window.vkBridge;
  if (!bridge || typeof bridge.send !== "function" || !hasVkLaunchParams()) {
    return null;
  }

  try {
    await withTimeout(bridge.send("VKWebAppInit"));
    const user = await withTimeout(bridge.send("VKWebAppGetUserInfo"));

    if (!user || user.id == null) {
      return null;
    }

    return {
      context: "vk",
      user: normalizeVkUser(user),
    };
  } catch {
    return null;
  }
}

export async function initPlatform() {
  try {
    const telegramState = tryInitTelegram();
    if (telegramState) {
      return telegramState;
    }

    const vkState = await tryInitVk();
    if (vkState) {
      return vkState;
    }

    return {
      context: "guest",
    };
  } catch (e) {
    console.error("initPlatform error:", e);

    return {
      context: "guest",
    };
  }
}
