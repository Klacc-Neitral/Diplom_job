BEGIN;

DELETE FROM quiz_questions
WHERE course_id = (
    SELECT id
    FROM courses
    WHERE title = 'React.js с нуля до mini app'
    LIMIT 1
);

-- Урок 1: компонентный подход
INSERT INTO quiz_questions (
    course_id, quiz_type, lesson_order, question_order, question, answers, correct_answer
)
SELECT
    c.id,
    'lesson',
    1,
    seed.question_order,
    seed.question,
    seed.answers::jsonb,
    seed.correct_answer
FROM courses c
JOIN (
    VALUES
        (1, 'Зачем React делит интерфейс на компоненты?', '["Чтобы скрыть код от пользователя","Чтобы переиспользовать части интерфейса","Чтобы убрать стили","Чтобы не работать с данными"]', 1),
        (2, 'Что обычно описывает компонент?', '["Только SQL-запросы","Отдельную часть UI и её поведение","Только роуты сервера","Только настройки Docker"]', 1),
        (3, 'Почему компонентный подход упрощает поддержку?', '["Код становится длиннее","Интерфейс делится на понятные части","Не нужно тестирование","Можно не использовать API"]', 1),
        (4, 'Что удобно переиспользовать между экранами?', '["Случайные переменные","Готовые компоненты","Только CSS reset","Только package-lock"]', 1),
        (5, 'Для каких интерфейсов React особенно удобен?', '["Для систем с множеством состояний и экранов","Только для CLI","Только для баз данных","Только для cron-задач"]', 0)
) AS seed(question_order, question, answers, correct_answer)
ON TRUE
WHERE c.title = 'React.js с нуля до mini app';

-- Урок 2: состояние, данные и API
INSERT INTO quiz_questions (
    course_id, quiz_type, lesson_order, question_order, question, answers, correct_answer
)
SELECT
    c.id,
    'lesson',
    2,
    seed.question_order,
    seed.question,
    seed.answers::jsonb,
    seed.correct_answer
FROM courses c
JOIN (
    VALUES
        (1, 'Откуда фронтенд чаще всего получает данные?', '["Из backend API","Только из CSS","Из .gitignore","Из favicon"]', 0),
        (2, 'Что делают пользовательские действия в приложении?', '["Удаляют Docker","Отправляют новые запросы и меняют состояние","Меняют ОС","Останавливают браузер"]', 1),
        (3, 'Почему важно быстро обновлять локальное состояние?', '["Чтобы UI оставался отзывчивым","Чтобы не было интернета","Чтобы не писать backend","Чтобы убрать авторизацию"]', 0),
        (4, 'Что обычно отображают компоненты?', '["Сырые TCP-пакеты","Текущее состояние приложения","Только env-файлы","Только логи nginx"]', 1),
        (5, 'Какой подход полезен для mini app?', '["Игнорировать ответы сервера","Держать интерфейс быстрым и синхронным с данными","Не использовать события","Хранить всё в одной функции"]', 1)
 ) AS seed(question_order, question, answers, correct_answer)
ON TRUE
WHERE c.title = 'React.js с нуля до mini app';

-- Урок 3: устройство mini app
INSERT INTO quiz_questions (
    course_id, quiz_type, lesson_order, question_order, question, answers, correct_answer
)
SELECT
    c.id,
    'lesson',
    3,
    seed.question_order,
    seed.question,
    seed.answers::jsonb,
    seed.correct_answer
FROM courses c
JOIN (
    VALUES
        (1, 'Из чего обычно состоит mini app?', '["Только из картинки и текста","Из фронтенда, backend API и интеграции с платформой","Только из PostgreSQL","Только из одного HTML-файла"]', 1),
        (2, 'Что нужно для авторизации пользователя в mini app?', '["Только favicon","Интеграция с платформой и backend","Только CSS","Только localStorage без сервера"]', 1),
        (3, 'Что делает backend в mini app?', '["Хранит и отдаёт данные, принимает запросы","Только рисует кнопки","Заменяет браузер","Работает как видеофайл"]', 0),
        (4, 'Что такое единый пользовательский сценарий?', '["Когда вход, загрузка данных и прогресс связаны между собой","Когда нет маршрутов","Когда приложение без API","Когда уроки не сохраняются"]', 0),
        (5, 'Что важно сохранять в образовательном mini app?', '["Только цвет кнопки","Прогресс пользователя","Только favicon","Только user-agent"]', 1)
 ) AS seed(question_order, question, answers, correct_answer)
ON TRUE
WHERE c.title = 'React.js с нуля до mini app';

-- Финальный экзамен по курсу
INSERT INTO quiz_questions (
    course_id, quiz_type, lesson_order, question_order, question, answers, correct_answer
)
SELECT
    c.id,
    'final',
    NULL,
    seed.question_order,
    seed.question,
    seed.answers::jsonb,
    seed.correct_answer
FROM courses c
JOIN (
    VALUES
        (1, 'Главная польза компонентного подхода?', '["Переиспользование и упрощение поддержки UI","Отказ от API","Удаление состояния","Замена базы данных"]', 0),
        (2, 'Что обычно приходит с backend в React-приложение?', '["Данные для интерфейса","Сигнал BIOS","Конфиг SSH-сервера","Случайный бинарный поток"]', 0),
        (3, 'Зачем mini app нужен backend?', '["Для хранения данных, авторизации и API","Только для favicon","Только для CSS-анимаций","Он не нужен"]', 0),
        (4, 'Что помогает удерживать UI быстрым?', '["Быстрое обновление локального состояния","Запрет на события","Отключение API","Только reload страницы"]', 0),
        (5, 'Что связывает фронтенд mini app с платформой?', '["Интеграция платформы и сценарий авторизации","Только Docker volume","Только SQL seed","Только nginx error log"]', 0),
        (6, 'Что обычно отображает компонент?', '["Часть интерфейса на основе состояния","Только бинарные файлы","Только системные процессы","Только env переменные"]', 0),
        (7, 'Какая связка ближе всего к реальному mini app?', '["Frontend + Backend API + платформа","Только frontend","Только база","Только бот без сайта"]', 0),
        (8, 'Почему React подходит для нескольких экранов?', '["Из-за компонентной структуры и управления состоянием","Потому что не использует JS","Потому что не нужен backend","Из-за встроенной БД"]', 0)
 ) AS seed(question_order, question, answers, correct_answer)
ON TRUE
WHERE c.title = 'React.js с нуля до mini app';

COMMIT;
