try:
    from server.db import get_connection
    from server.logging_utils import get_logger, log_call
except ImportError:  # pragma: no cover - fallback for direct local execution
    from db import get_connection
    from logging_utils import get_logger, log_call


logger = get_logger("progtest.server")


SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT,
        platform TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT
    """,
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    """,
    """
    UPDATE users
    SET role = 'user'
    WHERE role IS NULL OR BTRIM(role) = ''
    """,
    """
    CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        level TEXT,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS creator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
    """,
    """
    CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT,
        "order" INTEGER NOT NULL
    )
    """,
    """
    ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS video_url TEXT
    """,
    """
    CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT enrollments_user_course_unique UNIQUE (user_id, course_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        current_lesson INTEGER,
        progress_percent INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT progress_user_course_unique UNIQUE (user_id, course_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS quiz_questions (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answers JSONB NOT NULL,
        correct_answer INTEGER NOT NULL
    )
    """,
    """
    ALTER TABLE quiz_questions
    ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'lesson'
    """,
    """
    ALTER TABLE quiz_questions
    ADD COLUMN IF NOT EXISTS lesson_order INTEGER
    """,
    """
    ALTER TABLE quiz_questions
    ADD COLUMN IF NOT EXISTS question_order INTEGER DEFAULT 1
    """,
    """
    CREATE TABLE IF NOT EXISTS quiz_results (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        score INTEGER,
        total INTEGER,
        passed BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    ALTER TABLE quiz_results
    ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'lesson'
    """,
    """
    ALTER TABLE quiz_results
    ADD COLUMN IF NOT EXISTS lesson_order INTEGER
    """,
    """
    ALTER TABLE quiz_results
    ADD COLUMN IF NOT EXISTS answers JSONB
    """,
    """
    CREATE TABLE IF NOT EXISTS auth_credentials (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT auth_credentials_user_unique UNIQUE (user_id),
        CONSTRAINT auth_credentials_email_unique UNIQUE (email)
    )
    """,
    """
    ALTER TABLE auth_credentials
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
    """,
    """
    UPDATE auth_credentials
    SET email_verified = TRUE
    WHERE email_verified = FALSE
    """,
    """
    CREATE TABLE IF NOT EXISTS email_verification_codes (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        consumed_at TIMESTAMP
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_lessons_course_id_order
        ON lessons (course_id, "order")
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_enrollments_user_id
        ON enrollments (user_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_courses_creator_user_id
        ON courses (creator_user_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_enrollments_course_id
        ON enrollments (course_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_progress_user_id
        ON progress (user_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_progress_course_id
        ON progress (course_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_quiz_questions_course_id
        ON quiz_questions (course_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_quiz_questions_scope
        ON quiz_questions (course_id, quiz_type, lesson_order, question_order)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id
        ON quiz_results (user_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_quiz_results_course_id
        ON quiz_results (course_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_quiz_results_scope
        ON quiz_results (user_id, course_id, quiz_type, lesson_order, created_at DESC)
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_credentials_email_lower_unique
        ON auth_credentials (LOWER(email))
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_auth_credentials_user_id
        ON auth_credentials (user_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email
        ON email_verification_codes (LOWER(email), created_at DESC)
    """,
]


@log_call(logger)
def ensure_schema():
    with get_connection() as conn:
        with conn.cursor() as cur:
            for statement in SCHEMA_STATEMENTS:
                cur.execute(statement)
        conn.commit()
