from pathlib import Path


ENV_PATH = Path("/root/ProgTest/Diplom_job/.env")

DROP_PREFIXES = (
    "EMAIL_VERIFICATION_REQUIRED",
    "EMAIL_VERIFICATION_CODE_TTL_SECONDS",
    "EMAIL_VERIFICATION_RESEND_INTERVAL_SECONDS",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL",
    "SMTP_FROM_NAME",
    "SMTP_USE_SSL",
)

DROP_EXACT = {
    "smtp.yandex.ru",
    "465",
    "elderemperor@yandex.ru",
    "My_project123",
    "ProgTest",
}

APPEND_BLOCK = [
    "EMAIL_VERIFICATION_REQUIRED=1",
    "EMAIL_VERIFICATION_CODE_TTL_SECONDS=900",
    "EMAIL_VERIFICATION_RESEND_INTERVAL_SECONDS=60",
    "SMTP_HOST=smtp.yandex.ru",
    "SMTP_PORT=465",
    "SMTP_USERNAME=elderemperor@yandex.ru",
    "SMTP_PASSWORD=My_project123",
    "SMTP_FROM_EMAIL=elderemperor@yandex.ru",
    "SMTP_FROM_NAME=ProgTest",
    "SMTP_USE_SSL=1",
]


def should_drop(line: str) -> bool:
    normalized = line.lstrip("\ufeff").strip()
    if not normalized:
        return False
    if any(normalized.startswith(prefix + "=") for prefix in DROP_PREFIXES):
        return True
    return normalized in DROP_EXACT


def main() -> None:
    lines = ENV_PATH.read_text(encoding="utf-8", errors="ignore").splitlines()
    kept_lines = [line for line in lines if not should_drop(line)]
    ENV_PATH.write_text("\n".join(kept_lines + APPEND_BLOCK).rstrip() + "\n", encoding="utf-8")
    print("env_rewritten")


if __name__ == "__main__":
    main()
