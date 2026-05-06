import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

from server.db import get_connection
from server.logging_utils import get_logger, log_call


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

logger = get_logger("progtest.max_bot")

GREEN_API_URL = (os.environ.get("GREEN_API_URL") or "https://api.green-api.com").rstrip("/")
GREEN_API_ID_INSTANCE = (os.environ.get("GREEN_API_ID_INSTANCE") or "").strip()
GREEN_API_TOKEN = (os.environ.get("GREEN_API_TOKEN") or "").strip()
MAX_WEBAPP_URL = (
    os.environ.get("MAX_WEBAPP_URL")
    or os.environ.get("PUBLIC_WEB_URL")
    or os.environ.get("MINI_APP_URL")
    or ""
).strip()
MAX_BROADCAST_INTERVAL_SECONDS = int(os.environ.get("MAX_BROADCAST_INTERVAL_SECONDS", "0"))
MAX_BROADCAST_TEXT = (os.environ.get("MAX_BROADCAST_TEXT") or "").strip()
MAX_POLL_IDLE_SECONDS = float(os.environ.get("MAX_POLL_IDLE_SECONDS", "1"))


@log_call(logger)
def build_api_url(method: str, *parts: object) -> str:
    encoded_parts = "/".join(urllib.parse.quote(str(part), safe="") for part in parts)
    suffix = f"/{encoded_parts}" if encoded_parts else ""
    return f"{GREEN_API_URL}/v3/waInstance{GREEN_API_ID_INSTANCE}/{method}/{GREEN_API_TOKEN}{suffix}"


@log_call(logger)
def green_api_request(method: str, path: str, payload: dict | None = None, *parts: object):
    data = None
    headers = {}

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(
        build_api_url(path, *parts),
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = response.read().decode("utf-8")
            if not body:
                return None
            return json.loads(body)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Green API {path} failed: {error.code} {body}") from error


@log_call(logger)
def ensure_schema() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS max_subscribers (
                    chat_id TEXT PRIMARY KEY,
                    sender_id TEXT,
                    sender_name TEXT,
                    chat_name TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    subscribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    last_broadcast_at TIMESTAMP
                )
                """
            )
        conn.commit()


@log_call(logger)
def validate_configuration() -> None:
    missing = []
    if not GREEN_API_ID_INSTANCE:
        missing.append("GREEN_API_ID_INSTANCE")
    if not GREEN_API_TOKEN:
        missing.append("GREEN_API_TOKEN")
    if not MAX_WEBAPP_URL:
        missing.append("MAX_WEBAPP_URL or PUBLIC_WEB_URL or MINI_APP_URL")

    if missing:
        raise RuntimeError(f"Missing MAX bot configuration: {', '.join(missing)}")


@log_call(logger)
def configure_instance() -> None:
    green_api_request(
        "POST",
        "setSettings",
        {
            "webhookUrl": "",
            "incomingWebhook": "no",
            "outgoingWebhook": "no",
            "outgoingMessageWebhook": "no",
            "outgoingAPIMessageWebhook": "no",
            "stateWebhook": "no",
        },
    )


@log_call(logger)
def receive_notification():
    return green_api_request("GET", "receiveNotification")


@log_call(logger)
def delete_notification(receipt_id: int) -> None:
    green_api_request("DELETE", "deleteNotification", None, receipt_id)


@log_call(logger)
def send_text_message(chat_id: str, message: str):
    return green_api_request(
        "POST",
        "sendMessage",
        {
            "chatId": str(chat_id),
            "message": message,
            "linkPreview": True,
        },
    )


@log_call(logger)
def upsert_subscriber(chat_id: str, sender_id: str | None, sender_name: str, chat_name: str | None) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO max_subscribers (
                    chat_id,
                    sender_id,
                    sender_name,
                    chat_name,
                    is_active,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
                ON CONFLICT (chat_id) DO UPDATE
                SET sender_id = EXCLUDED.sender_id,
                    sender_name = EXCLUDED.sender_name,
                    chat_name = EXCLUDED.chat_name,
                    is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (chat_id, sender_id, sender_name, chat_name),
            )
        conn.commit()


@log_call(logger)
def deactivate_subscriber(chat_id: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE max_subscribers
                SET is_active = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE chat_id = %s
                """,
                (chat_id,),
            )
        conn.commit()


@log_call(logger)
def mark_broadcast_sent(chat_id: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE max_subscribers
                SET last_broadcast_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE chat_id = %s
                """,
                (chat_id,),
            )
        conn.commit()


@log_call(logger)
def get_due_broadcast_recipients():
    if MAX_BROADCAST_INTERVAL_SECONDS <= 0 or not MAX_BROADCAST_TEXT:
        return []

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT chat_id, sender_name
                FROM max_subscribers
                WHERE is_active = TRUE
                  AND (
                    last_broadcast_at IS NULL
                    OR last_broadcast_at <= CURRENT_TIMESTAMP - (%s * INTERVAL '1 second')
                  )
                ORDER BY COALESCE(last_broadcast_at, subscribed_at) ASC
                """,
                (MAX_BROADCAST_INTERVAL_SECONDS,),
            )
            return cur.fetchall()


@log_call(logger)
def build_start_message(sender_name: str) -> str:
    normalized_name = sender_name.strip() or "друг"
    return (
        f"Привет, {normalized_name}!\n\n"
        f"Открой WebApp ProgTest по ссылке:\n{MAX_WEBAPP_URL}\n\n"
        "Если захочешь перестать получать сообщения, отправь /stop."
    )


@log_call(logger)
def build_broadcast_message(sender_name: str) -> str:
    normalized_name = sender_name.strip() or "друг"
    return MAX_BROADCAST_TEXT.replace("{name}", normalized_name).replace("{url}", MAX_WEBAPP_URL)


@log_call(logger)
def extract_text_message(body: dict) -> str:
    message_data = body.get("messageData") or {}
    text_data = message_data.get("textMessageData") or {}
    extended_data = message_data.get("extendedTextMessageData") or {}

    return (
        text_data.get("textMessage")
        or extended_data.get("text")
        or body.get("message")
        or ""
    ).strip()


@log_call(logger)
def handle_incoming_notification(notification: dict) -> None:
    if not notification:
        return

    receipt_id = notification.get("receiptId")
    body = notification.get("body") or {}
    type_webhook = body.get("typeWebhook")

    try:
        if type_webhook != "incomingMessageReceived":
            return

        sender_data = body.get("senderData") or {}
        chat_id = str(sender_data.get("chatId") or "").strip()
        sender_id = str(sender_data.get("sender") or "").strip() or None
        sender_name = (sender_data.get("senderName") or "").strip() or "друг"
        chat_name = (sender_data.get("chatName") or "").strip() or None
        text = extract_text_message(body)
        normalized_text = text.lower()

        if not chat_id or not text:
            return

        if normalized_text in {"/start", "./start", "/app", "./app"}:
            upsert_subscriber(chat_id, sender_id, sender_name, chat_name)
            send_text_message(chat_id, build_start_message(sender_name))
            return

        if normalized_text in {"/stop", "./stop"}:
            deactivate_subscriber(chat_id)
            send_text_message(chat_id, "Остановил автоматические сообщения. Чтобы включить их снова, отправь /start.")
            return
    finally:
        if receipt_id is not None:
            delete_notification(int(receipt_id))


@log_call(logger)
def process_broadcasts() -> None:
    for row in get_due_broadcast_recipients():
        chat_id = row["chat_id"]
        sender_name = row.get("sender_name") or "друг"
        send_text_message(chat_id, build_broadcast_message(sender_name))
        mark_broadcast_sent(chat_id)
        time.sleep(1)


@log_call(logger)
def main() -> None:
    validate_configuration()
    ensure_schema()
    configure_instance()

    while True:
        try:
            process_broadcasts()
            notification = receive_notification()
            if notification:
                handle_incoming_notification(notification)
                continue
        except Exception as error:
            logger.exception("MAX bot loop failed: %s", error)

        time.sleep(MAX_POLL_IDLE_SECONDS)


if __name__ == "__main__":
    main()
