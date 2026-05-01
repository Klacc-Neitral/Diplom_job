import inspect
import logging
import os
from functools import wraps


REDACTED_KEYS = {
    "password",
    "password_hash",
    "token",
    "authorization",
    "init_data",
    "hash",
    "secret",
    "jwt_secret",
    "telegram_bot_token",
    "bot_token",
}


def configure_logging() -> None:
    level_name = (os.environ.get("LOG_LEVEL") or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    root_logger = logging.getLogger()
    if not root_logger.handlers:
        logging.basicConfig(
            level=level,
            format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        )
    else:
        root_logger.setLevel(level)


def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name)


def sanitize_for_log(value, max_depth: int = 2):
    if max_depth < 0:
        return "..."

    if value is None or isinstance(value, (bool, int, float)):
        return value

    if isinstance(value, str):
        if len(value) > 160:
            return f"{value[:157]}..."
        return value

    if isinstance(value, (list, tuple, set)):
        items = [sanitize_for_log(item, max_depth - 1) for item in list(value)[:10]]
        if len(value) > 10:
            items.append("...")
        return items

    if isinstance(value, dict):
        sanitized = {}
        for key, item in list(value.items())[:20]:
            key_name = str(key).lower()
            if key_name in REDACTED_KEYS:
                sanitized[key] = "***REDACTED***"
            else:
                sanitized[key] = sanitize_for_log(item, max_depth - 1)
        if len(value) > 20:
            sanitized["..."] = "truncated"
        return sanitized

    status_code = getattr(value, "status_code", None)
    if status_code is not None:
        return {"type": type(value).__name__, "status_code": status_code}

    return repr(value)


def summarize_result(result):
    if isinstance(result, tuple):
        return [summarize_result(item) for item in result]

    if isinstance(result, dict):
        return {"type": "dict", "keys": list(result.keys())[:10]}

    if isinstance(result, list):
        return {"type": "list", "length": len(result)}

    if hasattr(result, "status_code"):
        return {
            "type": type(result).__name__,
            "status_code": getattr(result, "status_code", None),
        }

    return sanitize_for_log(result, max_depth=1)


def log_call(logger: logging.Logger):
    def decorator(func):
        signature = inspect.signature(func)

        @wraps(func)
        def wrapper(*args, **kwargs):
            bound = signature.bind_partial(*args, **kwargs)
            bound.apply_defaults()
            sanitized_args = {
                name: sanitize_for_log(value)
                for name, value in bound.arguments.items()
                if name not in {"self", "cls"}
            }
            logger.info("ENTER %s args=%s", func.__name__, sanitized_args)

            try:
                result = func(*args, **kwargs)
            except Exception:
                logger.exception("ERROR %s", func.__name__)
                raise

            logger.info("EXIT %s result=%s", func.__name__, summarize_result(result))
            return result

        return wrapper

    return decorator
