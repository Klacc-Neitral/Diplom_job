# Деплой проекта на VPS Beget

Инструкция ниже рассчитана на Ubuntu/Debian VPS в Beget и текущую структуру этого репозитория.

## 1. Что будет на сервере

- `nginx` на хосте для HTTPS и reverse proxy
- `flask_app` в Docker
- `postgres` в Docker
- код проекта в `/opt/myapp`

Схема:

`Telegram / VK / браузер -> nginx -> Flask -> PostgreSQL`

## 2. Подготовка VPS

Подключись по SSH:

```bash
ssh root@<IP_СЕРВЕРА>
```

Обнови систему и поставь базовые пакеты:

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg git nginx certbot python3-certbot-nginx
```

Установи Docker Engine и Compose plugin:

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
systemctl enable --now nginx
docker version
docker compose version
```

## 3. Клонирование проекта

Создай директорию и склонируй репозиторий:

```bash
mkdir -p /opt/myapp
git clone <URL_ТВОЕГО_GIT_РЕПОЗИТОРИЯ> /opt/myapp
cd /opt/myapp
```

Если нужен конкретный branch:

```bash
git checkout <НАЗВАНИЕ_ВЕТКИ>
```

## 4. Подготовка `.env`

Создай файл окружения:

```bash
cp .env.example .env
nano .env
```

Минимально заполни так:

```env
POSTGRES_DB=progtest
POSTGRES_USER=progtest
POSTGRES_PASSWORD=<СЛОЖНЫЙ_ПАРОЛЬ_ДЛЯ_POSTGRES>

JWT_SECRET=<СЛОЖНЫЙ_СЕКРЕТ_ДЛЯ_JWT>
JWT_EXPIRES_IN_SECONDS=604800

AUTO_INIT_SCHEMA=1
CORS_ALLOW_ORIGIN=https://<ТВОЙ_ДОМЕН>

PUBLIC_WEB_URL=https://<ТВОЙ_ДОМЕН>
PUBLIC_API_URL=https://<ТВОЙ_ДОМЕН>/api

TELEGRAM_BOT_TOKEN=<ТОКЕН_БОТА_ОТ_BOTFATHER>
MINI_APP_URL=https://<ТВОЙ_ДОМЕН>/
TELEGRAM_AUTH_MAX_AGE_SECONDS=86400
```

Важно:

- `TELEGRAM_BOT_TOKEN` теперь обязателен для корректной Telegram WebApp авторизации
- домен должен быть с HTTPS
- `CORS_ALLOW_ORIGIN` на проде лучше не оставлять `*`

## 5. DNS

В панели домена направь `A`-запись на IP VPS.

Проверь на сервере:

```bash
getent hosts <ТВОЙ_ДОМЕН>
```

## 6. Запуск Docker

Подними контейнеры:

```bash
cd /opt/myapp
docker compose up -d --build
docker compose ps
docker compose logs --tail=50 flask_app
docker compose logs --tail=50 postgres
```

Проверь backend:

```bash
curl http://127.0.0.1:8000/healthz
```

Ожидаемый ответ:

```json
{"ok":true}
```

## 7. Настройка nginx

Скопируй шаблон конфига:

```bash
cp deploy/nginx/myapp.conf /etc/nginx/sites-available/myapp.conf
sed -i 's/__APP_DOMAIN__/<ТВОЙ_ДОМЕН>/g' /etc/nginx/sites-available/myapp.conf
ln -sf /etc/nginx/sites-available/myapp.conf /etc/nginx/sites-enabled/myapp.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Проверь HTTP:

```bash
curl -I http://<ТВОЙ_ДОМЕН>
curl -I http://<ТВОЙ_ДОМЕН>/healthz
```

## 8. Выпуск HTTPS

Выпусти сертификат:

```bash
certbot --nginx -d <ТВОЙ_ДОМЕН> -m <EMAIL_ДЛЯ_LETSENCRYPT> --agree-tos --redirect --no-eff-email
```

Проверь автопродление:

```bash
certbot renew --dry-run
```

Проверь HTTPS:

```bash
curl -I https://<ТВОЙ_ДОМЕН>
curl -I https://<ТВОЙ_ДОМЕН>/healthz
```

## 9. Telegram Mini App

Для Telegram после деплоя:

1. Открой `@BotFather`
2. Укажи WebApp URL или Menu Button URL:

```text
https://<ТВОЙ_ДОМЕН>/
```

3. Убедись, что `TELEGRAM_BOT_TOKEN` в `.env` совпадает с ботом
4. Перезапусти backend:

```bash
docker compose restart flask_app
```

Теперь backend валидирует `initData` Telegram на сервере.

Если токен в `.env` неверный, Telegram-вход будет падать с `403 Invalid Telegram init data`.

## 10. VK Mini App

Для VK сейчас логика такая:

- фронт умеет получать пользователя через `vkBridge`
- backend создаёт/обновляет пользователя по данным VK

Что нужно:

1. Открывать приложение именно внутри контейнера VK Mini Apps
2. Использовать тот же HTTPS-домен

Если приложение открыть просто в обычном браузере, VK bridge не инициализируется и пользователь уйдёт в обычный auth-screen.

## 11. Обновление проекта

Если уже настроен git origin:

```bash
cd /opt/myapp
git pull --ff-only
docker compose up -d --build
```

Или через готовый скрипт:

```bash
chmod +x deploy/deploy.sh
APP_DIR=/opt/myapp BRANCH=<НАЗВАНИЕ_ВЕТКИ> ./deploy/deploy.sh
```

## 12. Полезные команды

Логи:

```bash
docker compose logs -f flask_app
docker compose logs -f postgres
journalctl -u nginx -f
```

Перезапуск:

```bash
docker compose restart flask_app
docker compose restart postgres
systemctl reload nginx
```

Подключение к Postgres:

```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Проверка доступности картинки/статики:

```bash
curl -I https://<ТВОЙ_ДОМЕН>/img/Photodhop_course.png
```

Проверка API:

```bash
curl https://<ТВОЙ_ДОМЕН>/healthz
```

## 13. Что важно помнить

- любые изменения Python-кода требуют хотя бы `docker compose restart flask_app`, а если менялись зависимости или Dockerfile, то `docker compose up -d --build`
- если менялся только контент в БД, пересборка не нужна
- если Telegram Mini App не логинит пользователя, первым делом проверь `TELEGRAM_BOT_TOKEN`, `MINI_APP_URL` и HTTPS
- если сайт открывается, а API нет, смотри `docker compose logs -f flask_app` и `nginx -t`
