import json
from http import HTTPStatus

from flask import jsonify, request
from psycopg2.extras import RealDictCursor

try:
    from server.auth import (
        build_public_user_payload,
        build_user_payload,
        detect_platform_by_user_id,
        get_user_role,
        is_moderator_role,
        require_auth,
    )
    from server.db import get_connection
    from server.http_utils import json_error, parse_json_body
    from server.logging_utils import get_logger, log_call
except ImportError:  # pragma: no cover - fallback for direct local execution
    from auth import (
        build_public_user_payload,
        build_user_payload,
        detect_platform_by_user_id,
        get_user_role,
        is_moderator_role,
        require_auth,
    )
    from db import get_connection
    from http_utils import json_error, parse_json_body
    from logging_utils import get_logger, log_call


logger = get_logger("progtest.server")
QUIZ_PASS_PERCENT = 60


@log_call(logger)
def course_action(percent):
    if percent >= 100:
        return "Завершено"
    if percent > 0:
        return "Продолжить"
    return "Начать"


@log_call(logger)
def serialize_course_row(row, current_user_id=None, current_user_role=None):
    percent = int(row.get("progress_percent") or 0)
    creator_user_id = row.get("creator_user_id")
    is_owner = bool(current_user_id and creator_user_id == current_user_id)
    can_delete = bool(is_owner or is_moderator_role(current_user_role))

    payload = {
        "id": row["id"],
        "title": row["title"],
        "desc": row.get("description") or "",
        "level": row.get("level") or "",
        "img": row.get("image") or "",
        "percent": percent,
        "action": course_action(percent),
        "creatorUserId": creator_user_id,
        "isOwner": is_owner,
        "canEdit": is_owner,
        "canDelete": can_delete,
    }

    if "is_enrolled" in row:
        payload["isEnrolled"] = bool(row.get("is_enrolled"))

    if "completed" in row:
        payload["completed"] = bool(row.get("completed"))

    return payload


@log_call(logger)
def serialize_material_row(row):
    return {
        "course_id": row["course_id"],
        "course_name": row["course_name"],
        "pageTitle": row["page_title"],
        "text": row.get("content") or "",
        "videoUrl": row.get("video_url") or "",
        "pageNumber": row["page_number"],
    }


@log_call(logger)
def validate_quiz_question_payload(question_payload, question_index, quiz_label):
    if not isinstance(question_payload, dict):
        raise ValueError(f"{quiz_label}: вопрос {question_index} заполнен некорректно.")

    question_text = str(question_payload.get("question") or "").strip()
    answers = question_payload.get("answers")
    correct_answer = question_payload.get("correctAnswer")

    if len(question_text) < 5 or len(question_text) > 500:
        raise ValueError(f"{quiz_label}: вопрос {question_index} должен быть длиной от 5 до 500 символов.")

    if not isinstance(answers, list) or len(answers) != 4:
        raise ValueError(f"{quiz_label}: у вопроса {question_index} должно быть ровно 4 варианта ответа.")

    normalized_answers = []
    for answer_index, answer_text in enumerate(answers, start=1):
        normalized_answer = str(answer_text or "").strip()
        if len(normalized_answer) < 1 or len(normalized_answer) > 300:
            raise ValueError(
                f"{quiz_label}: вариант ответа {answer_index} в вопросе {question_index} должен быть от 1 до 300 символов."
            )
        normalized_answers.append(normalized_answer)

    try:
        normalized_correct_answer = int(correct_answer)
    except (TypeError, ValueError):
        raise ValueError(f"{quiz_label}: укажи правильный ответ для вопроса {question_index}.")

    if normalized_correct_answer < 0 or normalized_correct_answer > 3:
        raise ValueError(f"{quiz_label}: правильный ответ в вопросе {question_index} должен быть от 1 до 4.")

    return {
        "question": question_text,
        "answers": normalized_answers,
        "correctAnswer": normalized_correct_answer,
    }


@log_call(logger)
def validate_course_quizzes_payload(payload, lesson_count):
    quizzes_payload = payload.get("quizzes") or {}
    if not isinstance(quizzes_payload, dict):
        raise ValueError("Блок тестов заполнен некорректно.")

    lesson_quizzes_payload = quizzes_payload.get("lessonQuizzes") or []
    if not isinstance(lesson_quizzes_payload, list):
        raise ValueError("Мини-тесты по урокам заполнены некорректно.")

    normalized_lesson_quizzes = []
    seen_lesson_orders = set()

    for item in lesson_quizzes_payload:
        if not isinstance(item, dict):
            raise ValueError("Мини-тест урока заполнен некорректно.")

        try:
            lesson_order = int(item.get("lessonOrder"))
        except (TypeError, ValueError):
            raise ValueError("Укажи, к какому уроку относится мини-тест.")

        if lesson_order < 1 or lesson_order > lesson_count:
            raise ValueError(f"Мини-тест привязан к несуществующему уроку {lesson_order}.")

        if lesson_order in seen_lesson_orders:
            raise ValueError(f"Для урока {lesson_order} нельзя создать два отдельных мини-теста.")

        questions_payload = item.get("questions") or []
        if not isinstance(questions_payload, list):
            raise ValueError(f"Мини-тест урока {lesson_order} заполнен некорректно.")

        normalized_questions = [
            validate_quiz_question_payload(question_payload, question_index, f"Мини-тест урока {lesson_order}")
            for question_index, question_payload in enumerate(questions_payload, start=1)
        ]

        seen_lesson_orders.add(lesson_order)
        normalized_lesson_quizzes.append(
            {
                "lessonOrder": lesson_order,
                "questions": normalized_questions,
            }
        )

    final_quiz_payload = quizzes_payload.get("finalQuiz") or {}
    if not isinstance(final_quiz_payload, dict):
        raise ValueError("Финальный тест заполнен некорректно.")

    final_questions_payload = final_quiz_payload.get("questions") or []
    if not isinstance(final_questions_payload, list):
        raise ValueError("Финальный тест заполнен некорректно.")

    normalized_final_questions = [
        validate_quiz_question_payload(question_payload, question_index, "Финальный тест")
        for question_index, question_payload in enumerate(final_questions_payload, start=1)
    ]

    return {
        "lessonQuizzes": normalized_lesson_quizzes,
        "finalQuiz": {"questions": normalized_final_questions},
    }


@log_call(logger)
def validate_course_creation_payload(payload):
    title = str(payload.get("title") or "").strip()
    description = str(payload.get("description") or "").strip()
    level = str(payload.get("level") or "").strip()
    image = str(payload.get("image") or "").strip()
    lessons = payload.get("lessons")

    if len(title) < 3 or len(title) > 120:
        raise ValueError("Укажи название курса от 3 до 120 символов.")

    if len(description) > 2000:
        raise ValueError("Описание курса не должно превышать 2000 символов.")

    if len(level) > 80:
        raise ValueError("Уровень курса не должен превышать 80 символов.")

    if len(image) > 2048:
        raise ValueError("Ссылка на обложку слишком длинная.")

    if not isinstance(lessons, list) or not lessons:
        raise ValueError("Добавь хотя бы один урок.")

    normalized_lessons = []
    for index, lesson in enumerate(lessons, start=1):
        if not isinstance(lesson, dict):
            raise ValueError(f"Урок {index} заполнен некорректно.")

        lesson_title = str(lesson.get("title") or "").strip()
        lesson_content = str(lesson.get("content") or "").strip()
        lesson_video_url = str(lesson.get("videoUrl") or "").strip()

        if len(lesson_title) < 2 or len(lesson_title) > 160:
            raise ValueError(f"Укажи название урока {index} длиной от 2 до 160 символов.")

        if not lesson_content:
            raise ValueError(f"Заполни описание урока {index}.")

        if len(lesson_content) > 12000:
            raise ValueError(f"Описание урока {index} не должно превышать 12000 символов.")

        if len(lesson_video_url) > 2048:
            raise ValueError(f"Ссылка на видео в уроке {index} слишком длинная.")

        normalized_lessons.append(
            {
                "title": lesson_title,
                "content": lesson_content,
                "videoUrl": lesson_video_url,
            }
        )

    normalized_quizzes = validate_course_quizzes_payload(payload, len(normalized_lessons))

    return {
        "title": title,
        "description": description,
        "level": level,
        "image": image,
        "lessons": normalized_lessons,
        "quizzes": normalized_quizzes,
    }


@log_call(logger)
def insert_course_quiz_questions(cur, course_id, quizzes_payload):
    lesson_quizzes = quizzes_payload.get("lessonQuizzes") or []
    final_quiz = quizzes_payload.get("finalQuiz") or {}

    for lesson_quiz in lesson_quizzes:
        lesson_order = lesson_quiz["lessonOrder"]
        for question_order, question in enumerate(lesson_quiz.get("questions") or [], start=1):
            cur.execute(
                """
                INSERT INTO quiz_questions (
                    course_id,
                    question,
                    answers,
                    correct_answer,
                    quiz_type,
                    lesson_order,
                    question_order
                )
                VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s)
                """,
                (
                    course_id,
                    question["question"],
                    json.dumps(question["answers"]),
                    question["correctAnswer"],
                    "lesson",
                    lesson_order,
                    question_order,
                ),
            )

    for question_order, question in enumerate(final_quiz.get("questions") or [], start=1):
        cur.execute(
            """
            INSERT INTO quiz_questions (
                course_id,
                question,
                answers,
                correct_answer,
                quiz_type,
                lesson_order,
                question_order
            )
            VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s)
            """,
            (
                course_id,
                question["question"],
                json.dumps(question["answers"]),
                question["correctAnswer"],
                "final",
                None,
                question_order,
            ),
        )


@log_call(logger)
def create_course(course_owner_id, payload):
    course_data = validate_course_creation_payload(payload)

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO courses (title, description, level, image, creator_user_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, title, description, level, image, creator_user_id
                """,
                (
                    course_data["title"],
                    course_data["description"],
                    course_data["level"],
                    course_data["image"],
                    course_owner_id,
                ),
            )
            course_row = cur.fetchone()

            for lesson_order, lesson in enumerate(course_data["lessons"], start=1):
                cur.execute(
                    """
                    INSERT INTO lessons (course_id, title, content, video_url, "order")
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        course_row["id"],
                        lesson["title"],
                        lesson["content"],
                        lesson["videoUrl"],
                        lesson_order,
                    ),
                )

            insert_course_quiz_questions(cur, course_row["id"], course_data["quizzes"])

            cur.execute(
                """
                INSERT INTO enrollments (user_id, course_id)
                VALUES (%s, %s)
                ON CONFLICT (user_id, course_id) DO NOTHING
                """,
                (course_owner_id, course_row["id"]),
            )
            cur.execute(
                """
                INSERT INTO progress (user_id, course_id, current_lesson, progress_percent, completed)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, course_id) DO UPDATE
                SET current_lesson = EXCLUDED.current_lesson,
                    progress_percent = EXCLUDED.progress_percent,
                    completed = EXCLUDED.completed,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (course_owner_id, course_row["id"], 0, 0, False),
            )
        conn.commit()

    course_row["is_enrolled"] = True
    course_row["progress_percent"] = 0
    course_row["completed"] = False

    materials = [
        {
            "course_id": course_row["id"],
            "course_name": course_row["title"],
            "page_title": lesson["title"],
            "content": lesson["content"],
            "video_url": lesson["videoUrl"],
            "page_number": lesson_order,
        }
        for lesson_order, lesson in enumerate(course_data["lessons"], start=1)
    ]

    return {
        "course": serialize_course_row(course_row, current_user_id=course_owner_id),
        "materials": [serialize_material_row(material) for material in materials],
    }


@log_call(logger)
def update_course_content(course_owner_id, course_id, payload):
    course_data = validate_course_creation_payload(payload)

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT creator_user_id
                FROM courses
                WHERE id = %s
                """,
                (course_id,),
            )
            existing_course = cur.fetchone()

            if not existing_course:
                raise LookupError("Course not found")

            if existing_course.get("creator_user_id") != course_owner_id:
                raise PermissionError("Forbidden")

            cur.execute(
                """
                UPDATE courses
                SET title = %s,
                    description = %s,
                    level = %s,
                    image = %s
                WHERE id = %s
                RETURNING id, title, description, level, image, creator_user_id
                """,
                (
                    course_data["title"],
                    course_data["description"],
                    course_data["level"],
                    course_data["image"],
                    course_id,
                ),
            )
            course_row = cur.fetchone()

            cur.execute("DELETE FROM lessons WHERE course_id = %s", (course_id,))
            cur.execute("DELETE FROM quiz_questions WHERE course_id = %s", (course_id,))
            cur.execute("DELETE FROM quiz_results WHERE course_id = %s", (course_id,))

            for lesson_order, lesson in enumerate(course_data["lessons"], start=1):
                cur.execute(
                    """
                    INSERT INTO lessons (course_id, title, content, video_url, "order")
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        course_id,
                        lesson["title"],
                        lesson["content"],
                        lesson["videoUrl"],
                        lesson_order,
                    ),
                )

            insert_course_quiz_questions(cur, course_id, course_data["quizzes"])

            cur.execute(
                """
                SELECT
                    c.id,
                    c.title,
                    c.description,
                    c.level,
                    c.image,
                    c.creator_user_id,
                    CASE WHEN e.id IS NULL THEN FALSE ELSE TRUE END AS is_enrolled,
                    COALESCE(p.progress_percent, 0) AS progress_percent,
                    COALESCE(p.completed, FALSE) AS completed
                FROM courses c
                LEFT JOIN enrollments e
                    ON e.course_id = c.id AND e.user_id = %s
                LEFT JOIN progress p
                    ON p.course_id = c.id AND p.user_id = %s
                WHERE c.id = %s
                """,
                (course_owner_id, course_owner_id, course_id),
            )
            course_row = cur.fetchone()
        conn.commit()

    materials = [
        {
            "course_id": course_id,
            "course_name": course_data["title"],
            "page_title": lesson["title"],
            "content": lesson["content"],
            "video_url": lesson["videoUrl"],
            "page_number": lesson_order,
        }
        for lesson_order, lesson in enumerate(course_data["lessons"], start=1)
    ]

    return {
        "course": serialize_course_row(course_row, current_user_id=course_owner_id),
        "materials": [serialize_material_row(material) for material in materials],
    }


@log_call(logger)
def delete_course(acting_user_id, course_id):
    acting_user_role = get_user_role(acting_user_id)

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, creator_user_id
                FROM courses
                WHERE id = %s
                """,
                (course_id,),
            )
            course_row = cur.fetchone()

            if not course_row:
                raise LookupError("Course not found")

            is_owner = course_row.get("creator_user_id") == acting_user_id
            if not is_owner and not is_moderator_role(acting_user_role):
                raise PermissionError("Forbidden")

            cur.execute(
                """
                DELETE FROM courses
                WHERE id = %s
                """,
                (course_id,),
            )
        conn.commit()

    return {"ok": True, "deletedCourseId": course_id}


@log_call(logger)
def get_total_lessons(course_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM lessons WHERE course_id = %s", (course_id,))
            row = cur.fetchone()
    return int(row[0]) if row else 0


@log_call(logger)
def build_quiz_key(quiz_type, lesson_order):
    normalized_type = quiz_type or "lesson"
    if normalized_type == "final":
        return "final"
    return f"lesson-{int(lesson_order or 0)}"


@log_call(logger)
def build_quiz_title(quiz_type, lesson_order):
    normalized_type = quiz_type or "lesson"
    if normalized_type == "final":
        return "Финальный экзамен"
    return f"Мини-тест после урока {int(lesson_order or 0)}"


@log_call(logger)
def build_quiz_description(quiz_type, lesson_order, question_count):
    normalized_type = quiz_type or "lesson"
    if normalized_type == "final":
        return f"Итоговая проверка по курсу: {question_count} вопросов с четырьмя вариантами ответа."
    return f"Проверь, как ты усвоил урок {int(lesson_order or 0)}. В тесте {question_count} вопросов с четырьмя вариантами ответа."


@log_call(logger)
def serialize_quiz_result(row):
    if not row:
        return None

    score = int(row["score"] or 0)
    total = int(row["total"] or 0)
    percent = int(round((score / total) * 100)) if total else 0

    return {
        "score": score,
        "total": total,
        "percent": percent,
        "passed": bool(row["passed"]),
        "quizType": row["quiz_type"] or "lesson",
        "lessonOrder": row["lesson_order"],
        "createdAt": row["created_at"].isoformat() if row.get("created_at") else None,
    }


@log_call(logger)
def get_course_editor_payload(course_owner_id, course_id):
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, title, description, level, image, creator_user_id
                FROM courses
                WHERE id = %s
                """,
                (course_id,),
            )
            course_row = cur.fetchone()

            if not course_row:
                raise LookupError("Course not found")

            if course_row.get("creator_user_id") != course_owner_id:
                raise PermissionError("Forbidden")

            cur.execute(
                """
                SELECT
                    title AS page_title,
                    content,
                    video_url,
                    "order" AS page_number
                FROM lessons
                WHERE course_id = %s
                ORDER BY "order", id
                """,
                (course_id,),
            )
            lesson_rows = cur.fetchall()

            cur.execute(
                """
                SELECT
                    question,
                    answers,
                    correct_answer,
                    COALESCE(quiz_type, 'lesson') AS quiz_type,
                    lesson_order,
                    COALESCE(question_order, id) AS question_order
                FROM quiz_questions
                WHERE course_id = %s
                ORDER BY
                    CASE WHEN COALESCE(quiz_type, 'lesson') = 'final' THEN 1 ELSE 0 END,
                    COALESCE(lesson_order, 1000000),
                    COALESCE(question_order, id),
                    id
                """,
                (course_id,),
            )
            question_rows = cur.fetchall()

    lesson_quiz_map = {}
    final_questions = []

    for row in question_rows:
        question_payload = {
            "question": row["question"],
            "answers": row["answers"] or ["", "", "", ""],
            "correctAnswer": int(row["correct_answer"] or 0),
        }

        if (row["quiz_type"] or "lesson") == "final":
            final_questions.append(question_payload)
            continue

        lesson_order = int(row["lesson_order"] or 0)
        lesson_quiz_map.setdefault(lesson_order, []).append(question_payload)

    return {
        "id": course_row["id"],
        "title": course_row["title"] or "",
        "description": course_row["description"] or "",
        "level": course_row["level"] or "",
        "image": course_row["image"] or "",
        "lessons": [
            {
                "title": row["page_title"] or "",
                "content": row["content"] or "",
                "videoUrl": row["video_url"] or "",
            }
            for row in lesson_rows
        ],
        "quizzes": {
            "lessonQuizzes": [
                {
                    "lessonOrder": lesson_order,
                    "questions": lesson_quiz_map[lesson_order],
                }
                for lesson_order in sorted(lesson_quiz_map.keys())
            ],
            "finalQuiz": {
                "questions": final_questions,
            },
        },
    }


@log_call(logger)
def get_course_quiz_bundle(user_id, course_id):
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    course_id,
                    question,
                    answers,
                    COALESCE(quiz_type, 'lesson') AS quiz_type,
                    lesson_order,
                    COALESCE(question_order, id) AS question_order
                FROM quiz_questions
                WHERE course_id = %s
                ORDER BY
                    CASE WHEN COALESCE(quiz_type, 'lesson') = 'final' THEN 1 ELSE 0 END,
                    COALESCE(lesson_order, 1000000),
                    COALESCE(question_order, id),
                    id
                """,
                (course_id,),
            )
            question_rows = cur.fetchall()

            cur.execute(
                """
                SELECT DISTINCT ON (COALESCE(quiz_type, 'lesson'), COALESCE(lesson_order, -1))
                    id,
                    score,
                    total,
                    passed,
                    created_at,
                    COALESCE(quiz_type, 'lesson') AS quiz_type,
                    lesson_order
                FROM quiz_results
                WHERE user_id = %s
                  AND course_id = %s
                ORDER BY
                    COALESCE(quiz_type, 'lesson'),
                    COALESCE(lesson_order, -1),
                    created_at DESC,
                    id DESC
                """,
                (user_id, course_id),
            )
            result_rows = cur.fetchall()

    latest_results = {
        build_quiz_key(row["quiz_type"], row["lesson_order"]): serialize_quiz_result(row)
        for row in result_rows
    }

    lesson_quizzes = {}
    final_quiz = None

    for row in question_rows:
        quiz_type = row["quiz_type"] or "lesson"
        lesson_order = row["lesson_order"]
        quiz_key = build_quiz_key(quiz_type, lesson_order)
        question = {
            "id": row["id"],
            "question": row["question"],
            "answers": row["answers"] or [],
            "questionOrder": row["question_order"],
        }

        if quiz_type == "final":
            if final_quiz is None:
                final_quiz = {
                    "key": quiz_key,
                    "quizType": "final",
                    "lessonOrder": None,
                    "title": build_quiz_title("final", None),
                    "questions": [],
                }
            final_quiz["questions"].append(question)
            continue

        lesson_order = int(lesson_order or 0)
        lesson_quizzes.setdefault(
            lesson_order,
            {
                "key": quiz_key,
                "quizType": "lesson",
                "lessonOrder": lesson_order,
                "title": build_quiz_title("lesson", lesson_order),
                "questions": [],
            },
        )
        lesson_quizzes[lesson_order]["questions"].append(question)

    lesson_quizzes_payload = []
    for lesson_order in sorted(lesson_quizzes.keys()):
        quiz = lesson_quizzes[lesson_order]
        quiz["description"] = build_quiz_description("lesson", lesson_order, len(quiz["questions"]))
        quiz["lastResult"] = latest_results.get(quiz["key"])
        lesson_quizzes_payload.append(quiz)

    if final_quiz:
        final_quiz["description"] = build_quiz_description("final", None, len(final_quiz["questions"]))
        final_quiz["lastResult"] = latest_results.get(final_quiz["key"])

    return {
        "lessonQuizzes": lesson_quizzes_payload,
        "finalQuiz": final_quiz,
        "passPercent": QUIZ_PASS_PERCENT,
    }


@log_call(logger)
def normalize_quiz_answers(answers_payload):
    normalized = {}

    if isinstance(answers_payload, dict):
        items = answers_payload.items()
    elif isinstance(answers_payload, list):
        items = []
        for item in answers_payload:
            if not isinstance(item, dict):
                continue
            items.append((item.get("questionId"), item.get("answerIndex")))
    else:
        items = []

    for raw_question_id, raw_answer_index in items:
        try:
            question_id = int(raw_question_id)
            answer_index = int(raw_answer_index)
        except (TypeError, ValueError):
            continue
        normalized[question_id] = answer_index

    return normalized


@log_call(logger)
def submit_quiz_attempt(user_id, course_id, quiz_type, lesson_order, answers_payload):
    normalized_quiz_type = (quiz_type or "lesson").strip().lower()
    if normalized_quiz_type not in {"lesson", "final"}:
        raise ValueError("Unsupported quiz type")

    normalized_lesson_order = None
    if normalized_quiz_type == "lesson":
        normalized_lesson_order = int(lesson_order)

    submitted_answers = normalize_quiz_answers(answers_payload)

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if normalized_quiz_type == "final":
                cur.execute(
                    """
                    SELECT id, correct_answer
                    FROM quiz_questions
                    WHERE course_id = %s
                      AND COALESCE(quiz_type, 'lesson') = 'final'
                    ORDER BY COALESCE(question_order, id), id
                    """,
                    (course_id,),
                )
            else:
                cur.execute(
                    """
                    SELECT id, correct_answer
                    FROM quiz_questions
                    WHERE course_id = %s
                      AND COALESCE(quiz_type, 'lesson') = 'lesson'
                      AND lesson_order = %s
                    ORDER BY COALESCE(question_order, id), id
                    """,
                    (course_id, normalized_lesson_order),
                )

            question_rows = cur.fetchall()

            if not question_rows:
                raise LookupError("Quiz questions not found")

            total = len(question_rows)
            score = 0
            correct_question_ids = []
            incorrect_question_ids = []

            for row in question_rows:
                question_id = row["id"]
                selected_answer = submitted_answers.get(question_id)
                if selected_answer == int(row["correct_answer"]):
                    score += 1
                    correct_question_ids.append(question_id)
                else:
                    incorrect_question_ids.append(question_id)

            percent = int(round((score / total) * 100)) if total else 0
            passed = percent >= QUIZ_PASS_PERCENT

            cur.execute(
                """
                INSERT INTO quiz_results (
                    user_id,
                    course_id,
                    score,
                    total,
                    passed,
                    quiz_type,
                    lesson_order,
                    answers
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                RETURNING id, score, total, passed, created_at, quiz_type, lesson_order
                """,
                (
                    user_id,
                    course_id,
                    score,
                    total,
                    passed,
                    normalized_quiz_type,
                    normalized_lesson_order,
                    json.dumps(submitted_answers),
                ),
            )
            result_row = cur.fetchone()
        conn.commit()

    result = serialize_quiz_result(result_row)
    result["thresholdPercent"] = QUIZ_PASS_PERCENT
    result["correctQuestionIds"] = correct_question_ids
    result["incorrectQuestionIds"] = incorrect_question_ids
    result["submittedCount"] = len(submitted_answers)
    return result


def register_learning_routes(app):
    @app.get("/api/users/<user_id>/courses")
    @log_call(logger)
    def get_courses(user_id):
        claims, error_response = require_auth(user_id)
        if error_response:
            return error_response

        current_user_role = get_user_role(claims["sub"])

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT
                        c.id,
                        c.title,
                        c.description,
                        c.level,
                        c.image,
                        c.creator_user_id,
                        CASE WHEN e.id IS NULL THEN FALSE ELSE TRUE END AS is_enrolled,
                        COALESCE(p.progress_percent, 0) AS progress_percent,
                        COALESCE(p.completed, FALSE) AS completed
                    FROM courses c
                    LEFT JOIN enrollments e
                        ON e.course_id = c.id AND e.user_id = %s
                    LEFT JOIN progress p
                        ON p.course_id = c.id AND p.user_id = %s
                    ORDER BY c.id
                    """,
                    (claims["sub"], claims["sub"]),
                )
                rows = cur.fetchall()

        return jsonify(
            [
                serialize_course_row(
                    row,
                    current_user_id=claims["sub"],
                    current_user_role=current_user_role,
                )
                for row in rows
            ]
        )

    @app.get("/api/users/<user_id>/materials")
    @log_call(logger)
    def get_materials(user_id):
        _, error_response = require_auth(user_id)
        if error_response:
            return error_response

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT
                        c.id AS course_id,
                        c.title AS course_name,
                        l.title AS page_title,
                        l.content,
                        l.video_url,
                        l."order" AS page_number
                    FROM lessons l
                    JOIN courses c ON c.id = l.course_id
                    ORDER BY c.id, l."order"
                    """
                )
                rows = cur.fetchall()

        return jsonify([serialize_material_row(row) for row in rows])

    @app.get("/api/users/<user_id>/courses/<int:course_id>/quizzes")
    @log_call(logger)
    def get_course_quizzes(user_id, course_id):
        claims, error_response = require_auth(user_id)
        if error_response:
            return error_response

        return jsonify(get_course_quiz_bundle(claims["sub"], course_id))

    @app.get("/api/users/<user_id>/courses/<int:course_id>/editor")
    @log_call(logger)
    def get_course_editor_data(user_id, course_id):
        claims, error_response = require_auth(user_id)
        if error_response:
            return error_response

        try:
            payload = get_course_editor_payload(claims["sub"], course_id)
        except PermissionError:
            return json_error("Forbidden", HTTPStatus.FORBIDDEN)
        except LookupError:
            return json_error("Course not found", HTTPStatus.NOT_FOUND)

        return jsonify(payload)

    @app.post("/api/users/<user_id>/courses/<int:course_id>/quizzes/submit")
    @log_call(logger)
    def submit_course_quiz(user_id, course_id):
        claims, error_response = require_auth(user_id)
        if error_response:
            return error_response

        payload = parse_json_body()
        quiz_type = payload.get("quizType")
        lesson_order = payload.get("lessonOrder")
        answers = payload.get("answers")

        try:
            result = submit_quiz_attempt(claims["sub"], course_id, quiz_type, lesson_order, answers)
        except (TypeError, ValueError) as error:
            return json_error(str(error), HTTPStatus.BAD_REQUEST)
        except LookupError:
            return json_error("Quiz not found", HTTPStatus.NOT_FOUND)

        return jsonify(result), HTTPStatus.CREATED

    @app.get("/api/users/search")
    @log_call(logger)
    def search_users():
        claims, error_response = require_auth()
        if error_response:
            return error_response

        query = (request.args.get("q") or "").strip()
        if not query:
            return jsonify([])

        search_pattern = f"%{query}%"

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
                        COUNT(DISTINCT e.course_id) AS total_courses,
                        COUNT(DISTINCT CASE WHEN COALESCE(p.completed, FALSE) THEN p.course_id END) AS completed_courses,
                        COUNT(DISTINCT CASE
                            WHEN COALESCE(p.progress_percent, 0) > 0 AND COALESCE(p.completed, FALSE) = FALSE
                            THEN p.course_id
                        END) AS in_progress_courses
                    FROM users u
                    LEFT JOIN enrollments e ON e.user_id = u.id
                    LEFT JOIN progress p ON p.user_id = u.id AND p.course_id = e.course_id
                    WHERE u.id <> %s
                      AND (
                          u.name ILIKE %s
                          OR COALESCE(u.username, '') ILIKE %s
                      )
                    GROUP BY u.id, u.name, u.username, u.platform, u.avatar_url
                    ORDER BY completed_courses DESC, total_courses DESC, u.created_at DESC
                    LIMIT 20
                    """,
                    (claims["sub"], search_pattern, search_pattern),
                )
                rows = cur.fetchall()

        return jsonify(
            [
                {
                    **build_public_user_payload(row),
                    "stats": {
                        "totalCourses": int(row["total_courses"] or 0),
                        "completedCourses": int(row["completed_courses"] or 0),
                        "inProgressCourses": int(row["in_progress_courses"] or 0),
                    },
                }
                for row in rows
            ]
        )

    @app.get("/api/users/<target_user_id>/public-profile")
    @log_call(logger)
    def get_public_profile(target_user_id):
        _, error_response = require_auth()
        if error_response:
            return error_response

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
                        COUNT(DISTINCT e.course_id) AS total_courses,
                        COUNT(DISTINCT CASE WHEN COALESCE(p.completed, FALSE) THEN p.course_id END) AS completed_courses,
                        COUNT(DISTINCT CASE
                            WHEN COALESCE(p.progress_percent, 0) > 0 AND COALESCE(p.completed, FALSE) = FALSE
                            THEN p.course_id
                        END) AS in_progress_courses
                    FROM users u
                    LEFT JOIN enrollments e ON e.user_id = u.id
                    LEFT JOIN progress p ON p.user_id = u.id AND p.course_id = e.course_id
                    WHERE u.id = %s
                    GROUP BY u.id, u.name, u.username, u.platform, u.avatar_url
                    """,
                    (target_user_id,),
                )
                user_row = cur.fetchone()

                if not user_row:
                    return json_error("User not found", HTTPStatus.NOT_FOUND)

                cur.execute(
                    """
                    SELECT
                        c.id,
                        c.title,
                        c.description,
                        c.level,
                        c.image,
                        c.creator_user_id,
                        COALESCE(p.progress_percent, 0) AS progress_percent,
                        COALESCE(p.completed, FALSE) AS completed
                    FROM enrollments e
                    JOIN courses c ON c.id = e.course_id
                    LEFT JOIN progress p
                        ON p.user_id = e.user_id
                       AND p.course_id = e.course_id
                    WHERE e.user_id = %s
                    ORDER BY COALESCE(p.completed, FALSE) DESC, COALESCE(p.progress_percent, 0) DESC, c.id DESC
                    """,
                    (target_user_id,),
                )
                course_rows = cur.fetchall()

        return jsonify(
            {
                "user": build_public_user_payload(user_row),
                "stats": {
                    "totalCourses": int(user_row["total_courses"] or 0),
                    "completedCourses": int(user_row["completed_courses"] or 0),
                    "inProgressCourses": int(user_row["in_progress_courses"] or 0),
                },
                "courses": [serialize_course_row(row) for row in course_rows],
            }
        )

    @app.put("/api/users/<user_id>/profile")
    @log_call(logger)
    def update_profile(user_id):
        _, error_response = require_auth(user_id)
        if error_response:
            return error_response

        payload = parse_json_body()
        first_name = (payload.get("first_name") or "").strip()
        last_name = (payload.get("last_name") or "").strip()
        username = payload.get("username")
        platform = payload.get("platform") or detect_platform_by_user_id(user_id)
        avatar_url = payload.get("avatar_url")
        full_name = " ".join(part for part in [first_name, last_name] if part).strip() or "Guest"

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    UPDATE users
                    SET name = %s,
                        username = %s,
                        platform = %s,
                        avatar_url = %s
                    WHERE id = %s
                    RETURNING id, name, username, platform, avatar_url, created_at
                    """,
                    (full_name, username, platform, avatar_url, user_id),
                )
                user_row = cur.fetchone()

                if user_row:
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

        if not user_row:
            return json_error("User not found", HTTPStatus.NOT_FOUND)

        return jsonify(build_user_payload(user_row))

    @app.post("/api/users/<user_id>/courses")
    @log_call(logger)
    def create_user_course(user_id):
        claims, error_response = require_auth(user_id)
        if error_response:
            return error_response

        payload = parse_json_body()

        try:
            result = create_course(claims["sub"], payload)
        except ValueError as error:
            return json_error(str(error), HTTPStatus.BAD_REQUEST)

        return jsonify(result), HTTPStatus.CREATED

    @app.put("/api/users/<user_id>/courses/<int:course_id>/content")
    @log_call(logger)
    def edit_user_course(user_id, course_id):
        claims, error_response = require_auth(user_id)
        if error_response:
            return error_response

        payload = parse_json_body()

        try:
            result = update_course_content(claims["sub"], course_id, payload)
        except ValueError as error:
            return json_error(str(error), HTTPStatus.BAD_REQUEST)
        except PermissionError:
            return json_error("Forbidden", HTTPStatus.FORBIDDEN)
        except LookupError:
            return json_error("Course not found", HTTPStatus.NOT_FOUND)

        return jsonify(result)

    @app.delete("/api/users/<user_id>/courses/<int:course_id>")
    @log_call(logger)
    def delete_user_course(user_id, course_id):
        claims, error_response = require_auth(user_id)
        if error_response:
            return error_response

        try:
            result = delete_course(claims["sub"], course_id)
        except PermissionError:
            return json_error("Forbidden", HTTPStatus.FORBIDDEN)
        except LookupError:
            return json_error("Course not found", HTTPStatus.NOT_FOUND)

        return jsonify(result)

    @app.put("/api/users/<user_id>/courses/<int:course_id>")
    @log_call(logger)
    def update_course_state(user_id, course_id):
        _, error_response = require_auth(user_id)
        if error_response:
            return error_response

        payload = parse_json_body()
        is_enrolled = bool(payload.get("isEnrolled"))
        percent = int(payload.get("percent", 0))
        total_lessons = get_total_lessons(course_id)
        current_lesson = 0

        if total_lessons > 0 and percent > 0:
            current_lesson = max(1, round((percent / 100) * total_lessons))
            current_lesson = min(current_lesson, total_lessons)

        completed = percent >= 100

        with get_connection() as conn:
            with conn.cursor() as cur:
                if is_enrolled:
                    cur.execute(
                        """
                        INSERT INTO enrollments (user_id, course_id)
                        VALUES (%s, %s)
                        ON CONFLICT (user_id, course_id) DO NOTHING
                        """,
                        (user_id, course_id),
                    )
                    cur.execute(
                        """
                        INSERT INTO progress (user_id, course_id, current_lesson, progress_percent, completed)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (user_id, course_id) DO UPDATE
                        SET current_lesson = EXCLUDED.current_lesson,
                            progress_percent = EXCLUDED.progress_percent,
                            completed = EXCLUDED.completed,
                            updated_at = CURRENT_TIMESTAMP
                        """,
                        (user_id, course_id, current_lesson, percent, completed),
                    )
                else:
                    cur.execute("DELETE FROM progress WHERE user_id = %s AND course_id = %s", (user_id, course_id))
                    cur.execute("DELETE FROM enrollments WHERE user_id = %s AND course_id = %s", (user_id, course_id))
            conn.commit()

        return jsonify({"ok": True})
