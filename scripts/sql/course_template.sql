-- Шаблон: создай копию этого файла и меняй значения под новый курс.
-- Запуск:
-- ./scripts/run-sql.sh ./scripts/sql/course_template.sql

INSERT INTO courses (title, description, level, image)
VALUES (
    'Новый курс',
    'Короткое описание курса',
    'Базовый',
    '/img/new-course.jpg'
)
ON CONFLICT DO NOTHING;

INSERT INTO lessons (course_id, title, content, video_url, "order")
VALUES
    (
        (SELECT id FROM courses WHERE title = 'Новый курс'),
        'Урок 1. Введение',
        'Текст первой страницы курса.',
        '',
        1
    ),
    (
        (SELECT id FROM courses WHERE title = 'Новый курс'),
        'Урок 2. Видео',
        'Текст страницы с видео.',
        'https://rutube.ru/play/embed/REPLACE_WITH_RUTUBE_ID',
        2
    )
ON CONFLICT DO NOTHING;
