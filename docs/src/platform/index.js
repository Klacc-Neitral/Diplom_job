function createGuestUser() {
  return {
    user_id: `guest_${Date.now()}`,
    first_name: "Guest",
    last_name: "",
    username: null,
    avatar_url: null,
    platform: "guest",
  };
}

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

function tryInitTelegram() {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  if (!user) {
    return null;
  }

  if (typeof tg.ready === "function") {
    tg.ready();
  }

  if (typeof tg.expand === "function") {
    tg.expand();
  }

  return normalizeTelegramUser(user);
}

async function tryInitVk() {
  const bridge = window.vkBridge;
  if (!bridge || typeof bridge.send !== "function") {
    return null;
  }

  try {
    await bridge.send("VKWebAppInit");
    const user = await bridge.send("VKWebAppGetUserInfo");
    if (!user || user.id == null) {
      return null;
    }

    return normalizeVkUser(user);
  } catch {
    return null;
  }
}

export async function initPlatform() {
  try {
    const tg = window.Telegram?.WebApp;
    if (
      tg &&
      tg.initDataUnsafe &&
      tg.initDataUnsafe.user &&
      tg.initDataUnsafe.user.id
    ) {
      return {
        context: "telegram",
        user: {
          user_id: `tg_${tg.initDataUnsafe.user.id}`,
          first_name: tg.initDataUnsafe.user.first_name || "",
          last_name: tg.initDataUnsafe.user.last_name || "",
          username: tg.initDataUnsafe.user.username || "",
        },
      };
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
