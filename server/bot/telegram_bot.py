import json
import os
import time
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

from server.logging_utils import get_logger, log_call


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

logger = get_logger("progtest.telegram_bot")

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
MINI_APP_URL = (os.environ.get("MINI_APP_URL") or os.environ.get("PUBLIC_WEB_URL") or "").strip()
API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"


@log_call(logger)
def tg(method: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload or {}).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}/{method}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8")
    result = json.loads(body)
    if not result.get("ok"):
        raise RuntimeError(result.get("description", "Telegram API error"))
    return result["result"]


@log_call(logger)
def send_mini_app_button(chat_id: int) -> None:
    tg(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": "Нажмите кнопку, чтобы открыть мини-приложение:",
            "reply_markup": {
                "inline_keyboard": [
                    [
                        {
                            "text": "Открыть мини-приложение",
                            "web_app": {"url": MINI_APP_URL},
                        }
                    ]
                ]
            },
        },
    )


@log_call(logger)
def main() -> None:
    if not BOT_TOKEN or not MINI_APP_URL:
        print("Ошибка: заполните TELEGRAM_BOT_TOKEN и MINI_APP_URL в .env")
        return

    tg("getMe")

    offset = 0
    while True:
        try:
            updates = tg(
                "getUpdates",
                {"offset": offset, "timeout": 30, "allowed_updates": ["message"]},
            )
            for upd in updates:
                offset = upd["update_id"] + 1
                msg = upd.get("message") or {}
                text = msg.get("text") or ""
                chat = msg.get("chat") or {}
                chat_id = chat.get("id")

                if isinstance(text, str) and (text.startswith("/start") or text.startswith("/app")):
                    if isinstance(chat_id, int):
                        send_mini_app_button(chat_id)
        except Exception:
            time.sleep(1)


if __name__ == "__main__":
    main()
