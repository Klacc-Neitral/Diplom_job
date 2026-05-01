BEGIN;

ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS video_url TEXT;

DELETE FROM courses
WHERE title IN (
    'История интерфейсов',
    'React.js с нуля до mini app'
);

INSERT INTO courses (title, description, level, image)
VALUES
    (
        'История интерфейсов',
        'Короткий тестовый курс про эволюцию пользовательских интерфейсов: от командной строки до современных мобильных приложений.',
        'Базовый',
        './img/Rectangle 42.png'
    ),
    (
        'React.js с нуля до mini app',
        'Тестовый курс по React и структуре мини-приложений. В одном из уроков встроено видео из VK.',
        'Средний',
        './img/Rectangle 44.png'
    );

INSERT INTO lessons (course_id, title, content, video_url, "order")
SELECT c.id, lesson_title, lesson_content, lesson_video_url, lesson_order
FROM courses c
JOIN (
    VALUES
        (
            'История интерфейсов',
            'Первые интерфейсы',
            'Первые вычислительные машины работали без привычных нам экранов. Пользователь взаимодействовал с системой через переключатели, перфокарты и печатные терминалы. Это был медленный, но важный старт для всей дальнейшей эволюции UI.',
            '',
            1
        ),
        (
            'История интерфейсов',
            'Появление графических систем',
            'Когда появились оконные интерфейсы, мышь и иконки, взаимодействие с компьютером стало гораздо понятнее для обычного пользователя. Этот этап сильно повлиял на то, как мы проектируем приложения сегодня.',
            '',
            2
        ),
        (
            'История интерфейсов',
            'Интерфейсы в эпоху mobile-first',
            'Современные интерфейсы проектируются с приоритетом мобильных устройств. Отсюда появляются крупные кнопки, адаптивные сетки, короткие сценарии и акцент на скорости выполнения пользовательского действия.',
            '',
            3
        ),
        (
            'React.js с нуля до mini app',
            'Что такое компонентный подход',
            'Компонентный подход помогает разбивать интерфейс на небольшие переиспользуемые части. Это упрощает поддержку, тестирование и масштабирование фронтенда. Именно поэтому React так хорошо подходит для интерфейсов с множеством экранов и состояний.',
            '',
            1
        ),
        (
            'React.js с нуля до mini app',
            'Состояние, данные и API',
            'Во фронтенд-приложении данные обычно приходят с backend API. Компоненты отображают состояние, а пользовательские действия отправляют новые запросы. В мини-приложениях особенно важно держать UI отзывчивым и быстро обновлять локальное состояние.',
            'https://vkvideo.ru/video_ext.php?oid=-226841376&id=456239018&hd=2',
            2
        ),
        (
            'React.js с нуля до mini app',
            'Как устроен mini app',
            'Мини-приложение обычно состоит из фронтенда, backend API и интеграции с платформой. На практике это означает: авторизация пользователя, загрузка его данных, отображение контента и сохранение прогресса внутри единого сценария.',
            '',
            3
        )
) AS seed(course_title, lesson_title, lesson_content, lesson_video_url, lesson_order)
    ON seed.course_title = c.title;

INSERT INTO enrollments (user_id, course_id)
SELECT u.id, c.id
FROM (
    SELECT id
    FROM users
    ORDER BY created_at
    LIMIT 1
) AS u
CROSS JOIN (
    SELECT id
    FROM courses
    WHERE title = 'React.js с нуля до mini app'
    LIMIT 1
) AS c
ON CONFLICT (user_id, course_id) DO NOTHING;

INSERT INTO progress (user_id, course_id, current_lesson, progress_percent, completed)
SELECT u.id, c.id, 1, 33, FALSE
FROM (
    SELECT id
    FROM users
    ORDER BY created_at
    LIMIT 1
) AS u
CROSS JOIN (
    SELECT id
    FROM courses
    WHERE title = 'React.js с нуля до mini app'
    LIMIT 1
) AS c
ON CONFLICT (user_id, course_id) DO UPDATE
SET current_lesson = EXCLUDED.current_lesson,
    progress_percent = EXCLUDED.progress_percent,
    completed = EXCLUDED.completed,
    updated_at = CURRENT_TIMESTAMP;

COMMIT;
