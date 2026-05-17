import hashlib
import hmac
import json
import os
import random
import smtplib
import ssl
import time
import urllib.parse
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from http import HTTPStatus

import bcrypt
import jwt
from flask import jsonify, request
from psycopg2.extras import RealDictCursor

try:
    from server.db import get_connection
    from server.http_utils import json_error, parse_json_body
    from server.logging_utils import get_logger, log_call
except ImportError:  # pragma: no cover - fallback for direct local execution
    from db import get_connection
    from http_utils import json_error, parse_json_body
    from logging_utils import get_logger, log_call


JWT_ALGORITHM = "HS256"
logger = get_logger("progtest.server")


@log_call(logger)
def get_jwt_secret():
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET is not set")
    return secret


@log_call(logger)
def get_jwt_expires_in_seconds():
    return int(os.environ.get("JWT_EXPIRES_IN_SECONDS", "604800"))


@log_call(logger)
def get_telegram_auth_max_age_seconds():
    return int(os.environ.get("TELEGRAM_AUTH_MAX_AGE_SECONDS", "86400"))


@log_call(logger)
def get_email_verification_code_ttl_seconds():
    return int(os.environ.get("EMAIL_VERIFICATION_CODE_TTL_SECONDS", "900"))


@log_call(logger)
def get_email_verification_resend_interval_seconds():
    return int(os.environ.get("EMAIL_VERIFICATION_RESEND_INTERVAL_SECONDS", "60"))


@log_call(logger)
def is_email_verification_required():
    return os.environ.get("EMAIL_VERIFICATION_REQUIRED", "0") == "1"


@log_call(logger)
def normalize_email(email):
    return (email or "").strip().lower()


@log_call(logger)
def validate_password_strength(password):
    if len(password) < 8:
        return "Password must be at least 8 characters long"
    if password.lower() == password:
        return "Password must contain at least one uppercase letter"
    if password.upper() == password:
        return "Password must contain at least one lowercase letter"
    if not any(char.isdigit() for char in password):
        return "Password must contain at least one digit"
    if password.strip() != password:
        return "Password cannot start or end with whitespace"
    return None


@log_call(logger)
def get_email_sender_address():
    return (os.environ.get("SMTP_FROM_EMAIL") or os.environ.get("SMTP_USERNAME") or "").strip()


@log_call(logger)
def is_email_delivery_configured():
    required_values = (
        os.environ.get("SMTP_HOST", "").strip(),
        os.environ.get("SMTP_USERNAME", "").strip(),
        os.environ.get("SMTP_PASSWORD", "").strip(),
        get_email_sender_address(),
    )
    return all(required_values)


@log_call(logger)
def generate_email_verification_code():
    return f"{random.randint(0, 999999):06d}"


@log_call(logger)
def hash_email_verification_code(email, code):
    normalized_email = normalize_email(email)
    return hashlib.sha256(f"{normalized_email}:{code}".encode("utf-8")).hexdigest()


@log_call(logger)
def send_email_verification_code(email, code):
    if not is_email_delivery_configured():
        raise RuntimeError("SMTP is not configured")

    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_username = os.environ.get("SMTP_USERNAME", "").strip()
    smtp_password = os.environ.get("SMTP_PASSWORD", "").strip()
    smtp_sender = get_email_sender_address()
    smtp_sender_name = (os.environ.get("SMTP_FROM_NAME") or "ProgTest").strip()
    use_ssl = os.environ.get("SMTP_USE_SSL", "0") == "1"

    message = EmailMessage()
    message["Subject"] = "Код подтверждения ProgTest"
    message["From"] = f"{smtp_sender_name} <{smtp_sender}>"
    message["To"] = normalize_email(email)
    message.set_content(
        "\n".join(
            [
                "Код подтверждения для регистрации в ProgTest:",
                "",
                code,
                "",
                f"Код действует {get_email_verification_code_ttl_seconds() // 60} минут.",
                "Если ты не запрашивал регистрацию, просто проигнорируй это письмо.",
            ]
        )
    )

    ssl_context = ssl.create_default_context()
    if use_ssl:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, context=ssl_context, timeout=30) as smtp:
            smtp.login(smtp_username, smtp_password)
            smtp.send_message(message)
        return

    with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as smtp:
        smtp.starttls(context=ssl_context)
        smtp.login(smtp_username, smtp_password)
        smtp.send_message(message)


@log_call(logger)
def issue_email_verification_code(email):
    normalized_email = normalize_email(email)
    code = generate_email_verification_code()
    code_hash = hash_email_verification_code(normalized_email, code)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE email_verification_codes
                SET consumed_at = CURRENT_TIMESTAMP
                WHERE LOWER(email) = LOWER(%s)
                  AND consumed_at IS NULL
                """,
                (normalized_email,),
            )
            cur.execute(
                """
                INSERT INTO email_verification_codes (email, code_hash, expires_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP + (%s * INTERVAL '1 second'))
                """,
                (normalized_email, code_hash, get_email_verification_code_ttl_seconds()),
            )
        conn.commit()

    send_email_verification_code(normalized_email, code)


@log_call(logger)
def get_email_verification_retry_after_seconds(email):
    normalized_email = normalize_email(email)
    resend_interval = get_email_verification_resend_interval_seconds()

    if resend_interval <= 0:
        return 0

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT created_at
                FROM email_verification_codes
                WHERE LOWER(email) = LOWER(%s)
                ORDER BY created_at DESC, id DESC
                LIMIT 1
                """,
                (normalized_email,),
            )
            row = cur.fetchone()

    if not row:
        return 0

    created_at = row["created_at"]
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    elapsed_seconds = int((datetime.now(timezone.utc) - created_at).total_seconds())
    retry_after_seconds = resend_interval - max(elapsed_seconds, 0)
    return max(retry_after_seconds, 0)


@log_call(logger)
def verify_email_verification_code(email, code):
    normalized_email = normalize_email(email)
    normalized_code = (code or "").strip()
    expected_hash = hash_email_verification_code(normalized_email, normalized_code)

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, code_hash, expires_at
                FROM email_verification_codes
                WHERE LOWER(email) = LOWER(%s)
                  AND consumed_at IS NULL
                ORDER BY created_at DESC, id DESC
                LIMIT 1
                """,
                (normalized_email,),
            )
            row = cur.fetchone()

            if not row:
                return False, "Verification code not found"

            expires_at = row["expires_at"]
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            if expires_at <= datetime.now(timezone.utc):
                return False, "Verification code expired"

            if not hmac.compare_digest(row["code_hash"], expected_hash):
                return False, "Invalid verification code"

            cur.execute(
                """
                UPDATE email_verification_codes
                SET consumed_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (row["id"],),
            )
        conn.commit()

    return True, None


@log_call(logger)
def validate_telegram_init_data(init_data: str):
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if not token or not init_data:
        return None

    try:
        params = dict(urllib.parse.parse_qsl(init_data, strict_parsing=True))
    except ValueError:
        return None

    provided_hash = params.pop("hash", None)
    if not provided_hash:
        return None

    auth_date_raw = params.get("auth_date")
    if auth_date_raw:
        try:
            auth_date = int(auth_date_raw)
        except ValueError:
            return None

        if auth_date < int(time.time()) - get_telegram_auth_max_age_seconds():
            return None

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(params.items()))
    secret_key = hmac.new(b"WebAppData", token.encode("utf-8"), hashlib.sha256).digest()
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, provided_hash):
        return None

    user_payload = params.get("user")
    if not user_payload:
        return None

    try:
        return json.loads(user_payload)
    except json.JSONDecodeError:
        return None


@log_call(logger)
def detect_platform_by_user_id(user_id):
    if user_id.startswith("tg_"):
        return "tg"
    if user_id.startswith("vk_"):
        return "vk"
    if user_id.startswith("local_"):
        return "local"
    return "guest"


@log_call(logger)
def normalize_user_role(role):
    normalized_role = str(role or "user").strip().lower()
    if normalized_role in {"moder", "moderator", "mod"}:
        return "moderator"
    return "user"


@log_call(logger)
def is_moderator_role(role):
    return normalize_user_role(role) == "moderator"


@log_call(logger)
def build_user_payload(user_row):
    name = (user_row.get("name") or "").strip()
    parts = name.split(" ", 1) if name else []
    first_name = parts[0] if parts else "Guest"
    last_name = parts[1] if len(parts) > 1 else ""

    user_id = user_row["id"]
    platform = user_row.get("platform") or detect_platform_by_user_id(user_id)
    role = normalize_user_role(user_row.get("role"))

    return {
        "user_id": user_id,
        "first_name": first_name,
        "last_name": last_name,
        "username": user_row.get("username"),
        "avatar_url": user_row.get("avatar_url"),
        "platform": platform,
        "email": user_row.get("email"),
        "role": role,
    }


@log_call(logger)
def build_public_user_payload(user_row):
    user = build_user_payload(user_row)
    return {
        "user_id": user["user_id"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "username": user["username"],
        "avatar_url": user["avatar_url"],
        "platform": user["platform"],
    }


@log_call(logger)
def create_auth_response(user_row):
    user = build_user_payload(user_row)
    token = jwt.encode(
        {
            "sub": user["user_id"],
            "platform": user["platform"],
            "role": user["role"],
            "exp": int(time.time()) + get_jwt_expires_in_seconds(),
        },
        get_jwt_secret(),
        algorithm=JWT_ALGORITHM,
    )
    return {"token": token, "user": user}


@log_call(logger)
def get_user_role(user_id):
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT role
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )
            user_row = cur.fetchone()

    if not user_row:
        raise LookupError("User not found")

    return normalize_user_role(user_row.get("role"))


@log_call(logger)
def require_auth(expected_user_id=None):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, json_error("Missing auth token", HTTPStatus.UNAUTHORIZED)

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return None, json_error("Missing auth token", HTTPStatus.UNAUTHORIZED)

    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None, json_error("Token expired", HTTPStatus.UNAUTHORIZED)
    except jwt.InvalidTokenError:
        return None, json_error("Invalid auth token", HTTPStatus.UNAUTHORIZED)

    if expected_user_id and payload.get("sub") != expected_user_id:
        return None, json_error("Forbidden", HTTPStatus.FORBIDDEN)

    return payload, None


@log_call(logger)
def upsert_platform_user(user_id, platform, first_name, last_name, username, avatar_url=None):
    full_name = " ".join(part for part in [first_name, last_name] if part).strip() or "Guest"

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO users (id, name, username, platform, avatar_url)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE
                SET name = EXCLUDED.name,
                    username = EXCLUDED.username,
                    platform = EXCLUDED.platform,
                    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url)
                RETURNING id, name, username, platform, role, created_at
                """,
                (user_id, full_name, username, platform, avatar_url),
            )
            cur.execute(
                """
                SELECT u.id, u.name, u.username, u.platform, u.avatar_url, u.role, u.created_at, a.email
                FROM users u
                LEFT JOIN auth_credentials a ON a.user_id = u.id
                WHERE u.id = %s
                """,
                (user_id,),
            )
            user_row = cur.fetchone()
        conn.commit()

    return create_auth_response(user_row)


def register_auth_routes(app):
    @app.post("/api/auth/register")
    @log_call(logger)
    def register():
        payload = parse_json_body()
        name = (payload.get("name") or "").strip()
        email = normalize_email(payload.get("email"))
        password = payload.get("password") or ""
        verification_code = (payload.get("verificationCode") or "").strip()

        if not name or not email or not password:
            return json_error("name, email and password are required", HTTPStatus.BAD_REQUEST)

        password_error = validate_password_strength(password)
        if password_error:
            return json_error(password_error, HTTPStatus.BAD_REQUEST)

        if is_email_verification_required() and not verification_code:
            return json_error("verificationCode is required", HTTPStatus.BAD_REQUEST)

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT 1
                    FROM auth_credentials
                    WHERE LOWER(email) = LOWER(%s)
                    """,
                    (email,),
                )
                if cur.fetchone():
                    return json_error("User with this email already exists", HTTPStatus.CONFLICT)
            conn.commit()

        if is_email_verification_required():
            is_code_valid, verification_error = verify_email_verification_code(email, verification_code)
            if not is_code_valid:
                return json_error(verification_error or "Invalid verification code", HTTPStatus.BAD_REQUEST)

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                user_id = f"local_{uuid.uuid4().hex}"
                password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

                cur.execute(
                    """
                    INSERT INTO users (id, name, username, platform)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, name, username, platform, role, created_at
                    """,
                    (user_id, name, email, "local"),
                )

                cur.execute(
                    """
                    INSERT INTO auth_credentials (user_id, email, password_hash, email_verified)
                    VALUES (%s, %s, %s, TRUE)
                    """,
                    (user_id, email, password_hash),
                )

                cur.execute(
                    """
                    SELECT u.id, u.name, u.username, u.platform, u.avatar_url, u.role, u.created_at, a.email
                    FROM users u
                    LEFT JOIN auth_credentials a ON a.user_id = u.id
                    WHERE u.id = %s
                    """,
                    (user_id,),
                )
                user_row = cur.fetchone()
            conn.commit()

        return jsonify(create_auth_response(user_row)), HTTPStatus.CREATED

    @app.post("/api/auth/send-verification-code")
    @log_call(logger)
    def send_verification_code():
        payload = parse_json_body()
        email = normalize_email(payload.get("email"))

        if not email:
            return json_error("email is required", HTTPStatus.BAD_REQUEST)

        if not is_email_delivery_configured():
            return json_error("Email delivery is not configured", HTTPStatus.SERVICE_UNAVAILABLE)

        retry_after_seconds = get_email_verification_retry_after_seconds(email)
        if retry_after_seconds > 0:
            return json_error(
                f"Please wait {retry_after_seconds} seconds before requesting a new code",
                HTTPStatus.TOO_MANY_REQUESTS,
            )

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 1
                    FROM auth_credentials
                    WHERE LOWER(email) = LOWER(%s)
                    """,
                    (email,),
                )
                if cur.fetchone():
                    return json_error("User with this email already exists", HTTPStatus.CONFLICT)

        issue_email_verification_code(email)
        return jsonify(
            {
                "ok": True,
                "ttlSeconds": get_email_verification_code_ttl_seconds(),
                "resendIntervalSeconds": get_email_verification_resend_interval_seconds(),
                "message": "Verification code sent",
            }
        )

    @app.get("/api/auth/settings")
    @log_call(logger)
    def auth_settings():
        return jsonify(
            {
                "emailVerificationRequired": is_email_verification_required(),
                "emailDeliveryConfigured": is_email_delivery_configured(),
                "emailVerificationCodeTtlSeconds": get_email_verification_code_ttl_seconds(),
                "emailVerificationResendIntervalSeconds": get_email_verification_resend_interval_seconds(),
            }
        )

    @app.get("/api/auth/check-email")
    @log_call(logger)
    def check_email():
        email = normalize_email(request.args.get("email"))
        if not email:
            return json_error("email is required", HTTPStatus.BAD_REQUEST)

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 1
                    FROM auth_credentials
                    WHERE LOWER(email) = LOWER(%s)
                    """,
                    (email,),
                )
                exists = cur.fetchone() is not None

        return jsonify({"available": not exists})

    @app.post("/api/auth/login")
    @log_call(logger)
    def login():
        payload = parse_json_body()
        email = normalize_email(payload.get("email"))
        password = payload.get("password") or ""

        if not email or not password:
            return json_error("email and password are required", HTTPStatus.BAD_REQUEST)

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT
                        u.id,
                        u.name,
                        u.username,
                        u.platform,
                        u.avatar_url,
                        u.role,
                        u.created_at,
                        a.email,
                        a.password_hash,
                        a.email_verified
                    FROM auth_credentials a
                    JOIN users u ON u.id = a.user_id
                    WHERE LOWER(a.email) = LOWER(%s)
                    """,
                    (email,),
                )
                user_row = cur.fetchone()

        if not user_row or not bcrypt.checkpw(password.encode("utf-8"), user_row["password_hash"].encode("utf-8")):
            return json_error("Invalid email or password", HTTPStatus.UNAUTHORIZED)
        if not user_row["email_verified"]:
            return json_error("Email is not verified", HTTPStatus.FORBIDDEN)

        return jsonify(create_auth_response(user_row))

    @app.post("/api/auth/telegram")
    @log_call(logger)
    def auth_telegram():
        payload = parse_json_body()
        init_data = (payload.get("init_data") or "").strip()
        telegram_user = validate_telegram_init_data(init_data)

        if not telegram_user:
            return json_error("Invalid Telegram init data", HTTPStatus.FORBIDDEN)

        user_id = f"tg_{telegram_user['id']}"
        first_name = (telegram_user.get("first_name") or "").strip()
        last_name = (telegram_user.get("last_name") or "").strip()
        username = telegram_user.get("username")
        avatar_url = telegram_user.get("photo_url")

        return jsonify(upsert_platform_user(user_id, "tg", first_name, last_name, username, avatar_url))

    @app.post("/api/auth/platform")
    @log_call(logger)
    def auth_platform():
        payload = parse_json_body()
        user_id = payload.get("user_id")
        platform = payload.get("platform") or detect_platform_by_user_id(str(user_id or ""))
        first_name = (payload.get("first_name") or "").strip()
        last_name = (payload.get("last_name") or "").strip()
        username = payload.get("username")
        avatar_url = payload.get("avatar_url")

        if not user_id or not platform:
            return json_error("user_id and platform are required", HTTPStatus.BAD_REQUEST)

        return jsonify(upsert_platform_user(str(user_id), platform, first_name, last_name, username, avatar_url))

    @app.get("/api/auth/me")
    @log_call(logger)
    def auth_me():
        claims, error_response = require_auth()
        if error_response:
            return error_response

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT u.id, u.name, u.username, u.platform, u.avatar_url, u.role, u.created_at, a.email
                    FROM users u
                    LEFT JOIN auth_credentials a ON a.user_id = u.id
                    WHERE u.id = %s
                    """,
                    (claims["sub"],),
                )
                user_row = cur.fetchone()

        if not user_row:
            return json_error("User not found", HTTPStatus.NOT_FOUND)

        return jsonify(build_user_payload(user_row))
