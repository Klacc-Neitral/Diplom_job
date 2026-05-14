# Настройка подтверждения почты

Подтверждение почты включается через переменные окружения в файле `.env`.

## Что нужно заполнить

Обязательные переменные:

```env
EMAIL_VERIFICATION_REQUIRED=1
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_USERNAME=your-mailbox@example.com
SMTP_PASSWORD=replace_me
SMTP_FROM_EMAIL=your-mailbox@example.com
SMTP_FROM_NAME=ProgTest
SMTP_USE_SSL=0
```

Дополнительные:

```env
EMAIL_VERIFICATION_CODE_TTL_SECONDS=900
EMAIL_VERIFICATION_RESEND_INTERVAL_SECONDS=60
```

## Что означает каждая переменная

- `EMAIL_VERIFICATION_REQUIRED=1` включает обязательный код из письма при регистрации.
- `EMAIL_VERIFICATION_CODE_TTL_SECONDS` задаёт срок жизни кода в секундах.
- `EMAIL_VERIFICATION_RESEND_INTERVAL_SECONDS` задаёт минимальный интервал между повторными отправками.
- `SMTP_HOST` адрес SMTP-сервера.
- `SMTP_PORT` порт SMTP.
- `SMTP_USERNAME` логин почтового ящика.
- `SMTP_PASSWORD` пароль приложения или пароль SMTP.
- `SMTP_FROM_EMAIL` адрес отправителя, который увидит пользователь.
- `SMTP_FROM_NAME` имя отправителя в письме.
- `SMTP_USE_SSL=1` нужно, если провайдер требует SMTPS сразу при подключении.

## Куда вносить данные

Локально:

- файл [`.env`](C:/Users/vfhct/Desktop/Diplom_job/.env)

На VPS:

- файл `/root/ProgTest/Diplom_job/.env`

Если на сервере проект лежит в другом каталоге, вносить нужно в тот `.env`, который используется `docker compose`.

## Что перезапустить после изменения `.env`

```bash
docker compose up -d flask_app
docker compose restart flask_app
```

Если менялся Telegram-бот или MAX-бот, их можно перезапустить отдельно:

```bash
docker compose restart telegram_bot
docker compose restart max_bot
```

## Частый сценарий для Яндекс 360 / Mail / Gmail

Обычно нужен не обычный пароль от почты, а пароль приложения или отдельный SMTP-пароль.

Типовой пример для TLS:

```env
SMTP_PORT=587
SMTP_USE_SSL=0
```

Типовой пример для SSL:

```env
SMTP_PORT=465
SMTP_USE_SSL=1
```
