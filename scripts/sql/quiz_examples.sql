BEGIN;

-- Удаляем старые вопросы
DELETE FROM quiz_questions
WHERE course_id = (
    SELECT id
    FROM courses
    WHERE title = 'Linux с нуля до DevOps / DevNet инженера'
    LIMIT 1
);

-- =========================
-- Урок 1
-- =========================
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
        (1,'Для чего используется команда sudo?','["Удаление файлов","Выполнение команд от root","Смена пользователя","Перезагрузка"]',1),
        (2,'Что делает su?','["Удаляет пользователя","Переключает пользователя","Создает файл","Показывает процессы"]',1),
        (3,'Почему опасно работать под root?','["Медленно","Можно сломать систему","Нет сети","Не поддерживается"]',1),
        (4,'Как узнать текущего пользователя?','["whoami","user","check","id-user"]',0),
        (5,'Что безопаснее использовать?','["root","sudo","chmod","su"]',1)
) AS seed(question_order, question, answers, correct_answer)
ON TRUE
WHERE c.title = 'Linux с нуля до DevOps / DevNet инженера';

-- =========================
-- Урок 2
-- =========================
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
        (1,'Что означает r?','["run","read","root","rename"]',1),
        (2,'Команда для изменения прав?','["chmod","chown","ls","mv"]',0),
        (3,'Execute для папки?','["Удаление","Просмотр","Вход внутрь","Создание"]',2),
        (4,'Кто owner?','["Любой","Создатель","Группа","root"]',1),
        (5,'Как посмотреть права?','["ls -l","chmod","cat","pwd"]',0)
) AS seed(question_order, question, answers, correct_answer)
ON TRUE
WHERE c.title = 'Linux с нуля до DevOps / DevNet инженера';

-- =========================
-- Урок 3
-- =========================
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
        (1,'cp делает?','["Удаляет","Копирует","Перемещает","Открывает"]',1),
        (2,'mv используется для?','["Удаления","Копирования","Перемещения","Чтения"]',2),
        (3,'rm делает?','["Создает","Удаляет","Читает","Копирует"]',1),
        (4,'cat делает?','["Удаляет","Показывает содержимое","Меняет права","Создает"]',1),
        (5,'head показывает?','["Начало файла","Конец файла","Все","Ничего"]',0)
) AS seed(question_order, question, answers, correct_answer)
ON TRUE
WHERE c.title = 'Linux с нуля до DevOps / DevNet инженера';

-- =========================
-- Урок 4
-- =========================
INSERT INTO quiz_questions (
    course_id, quiz_type, lesson_order, question_order, question, answers, correct_answer
)
SELECT 
    c.id,
    'lesson',
    4,
    seed.question_order,
    seed.question,
    seed.answers::jsonb,
    seed.correct_answer
FROM courses c
JOIN (
    VALUES
        (1,'grep нужен для?','["Удаления","Поиска текста","Копирования","Сжатия"]',1),
        (2,'"." в regex?','["Точка","Любой символ","Пробел","Ошибка"]',1),
        (3,'"*"?','["Один","Много повторений","Удаление","Начало"]',1),
        (4,'^ означает?','["Конец","Начало строки","Ошибка","Любой"]',1),
        (5,'Как исключить строки?','["grep -v","grep -r","grep -x","grep -l"]',0)
) AS seed(question_order, question, answers, correct_answer)
ON TRUE
WHERE c.title = 'Linux с нуля до DevOps / DevNet инженера';

-- =========================
-- Урок 5
-- =========================
INSERT INTO quiz_questions (
    course_id, quiz_type, lesson_order, question_order, question, answers, correct_answer
)
SELECT 
    c.id,
    'lesson',
    5,
    seed.question_order,
    seed.question,
    seed.answers::jsonb,
    seed.correct_answer
FROM courses c
JOIN (
    VALUES
        (1,'shutdown делает?','["Удаляет","Выключает","Обновляет","Создает"]',1),
        (2,'Перезагрузка?','["-h","-r","-x","-z"]',1),
        (3,'ping делает?','["Удаляет","Проверяет сеть","Настраивает","Создает"]',1),
        (4,'Замена ifconfig?','["ip a","net","route","ping"]',0),
        (5,'ps показывает?','["Файлы","Процессы","Сеть","Права"]',1)
) AS seed(question_order, question, answers, correct_answer)
ON TRUE
WHERE c.title = 'Linux с нуля до DevOps / DevNet инженера';

-- =========================
-- Урок 6
-- =========================
INSERT INTO quiz_questions (
    course_id, quiz_type, lesson_order, question_order, question, answers, correct_answer
)
SELECT 
    c.id,
    'lesson',
    6,
    seed.question_order,
    seed.question,
    seed.answers::jsonb,
    seed.correct_answer
FROM courses c
JOIN (
    VALUES
        (1,'apt update делает?','["Удаляет","Обновляет список","Устанавливает","Чистит"]',1),
        (2,'Установка пакета?','["apt add","apt install","apt run","apt push"]',1),
        (3,'echo делает?','["Удаляет","Выводит текст","Копирует","Меняет права"]',1),
        (4,'">" делает?','["Добавляет","Перезаписывает","Удаляет","Читает"]',1),
        (5,'Выход из vi без сохранения?','[":wq",":q!",":exit","save"]',1)
) AS seed(question_order, question, answers, correct_answer)
ON TRUE
WHERE c.title = 'Linux с нуля до DevOps / DevNet инженера';

-- =========================
-- Финальный тест
-- =========================
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
        (1,'chmod делает?','["Меняет права","Удаляет","Создает","Копирует"]',0),
        (2,'grep?','["Поиск","Удаление","Копирование","Сжатие"]',0),
        (3,'sudo?','["root команда","Удаление","Сеть","IP"]',0),
        (4,'apt install?','["Установка","Удаление","Обновление","Очистка"]',0),
        (5,'ps?','["Процессы","Файлы","Сеть","Память"]',0),
        (6,'mv?','["Удаляет","Копирует","Перемещает","Читает"]',2),
        (7,'ping?','["Сеть","Удаляет","Создает","Обновляет"]',0),
        (8,'cat?','["Показывает","Удаляет","Создает","Меняет"]',0),
        (9,'rm?','["Удаляет","Копирует","Читает","Запускает"]',0),
        (10,'apt update?','["Удаляет","Обновляет список","Устанавливает","Чистит"]',1)
) AS seed(question_order, question, answers, correct_answer)
ON TRUE
WHERE c.title = 'Linux с нуля до DevOps / DevNet инженера';

COMMIT;