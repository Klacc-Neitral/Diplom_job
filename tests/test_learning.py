import unittest
from unittest.mock import patch

from tests.support import install_dependency_stubs


install_dependency_stubs()

from server import learning  # noqa: E402


class FakeCursor:
    def __init__(self, fetchone_values=None):
        self.fetchone_values = list(fetchone_values or [])
        self.executed = []

    def execute(self, query, params=None):
        self.executed.append((query, params))

    def fetchone(self):
        if self.fetchone_values:
            return self.fetchone_values.pop(0)
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor
        self.committed = False

    def cursor(self, cursor_factory=None):
        return self._cursor

    def commit(self):
        self.committed = True

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class LearningHelpersTest(unittest.TestCase):
    def test_validate_quiz_question_payload_normalizes_valid_question(self):
        result = learning.validate_quiz_question_payload(
            {
                "question": "What is Python?",
                "answers": ["Language", "Animal", "Framework", "Database"],
                "correctAnswer": "0",
            },
            1,
            "Quiz",
        )

        self.assertEqual(result["question"], "What is Python?")
        self.assertEqual(result["answers"][0], "Language")
        self.assertEqual(result["correctAnswer"], 0)

    def test_validate_course_creation_payload_returns_normalized_structure(self):
        payload = {
            "title": "Python Basics",
            "description": "Intro course",
            "level": "Beginner",
            "image": "/img/python.png",
            "lessons": [
                {
                    "title": "Lesson 1",
                    "content": "Variables and types",
                    "videoUrl": "https://example.com/video",
                }
            ],
            "quizzes": {
                "lessonQuizzes": [
                    {
                        "lessonOrder": 1,
                        "questions": [
                            {
                                "question": "Choose a type",
                                "answers": ["int", "while", "if", "for"],
                                "correctAnswer": 0,
                            }
                        ],
                    }
                ],
                "finalQuiz": {"questions": []},
            },
        }

        result = learning.validate_course_creation_payload(payload)

        self.assertEqual(result["title"], "Python Basics")
        self.assertEqual(len(result["lessons"]), 1)
        self.assertEqual(result["quizzes"]["lessonQuizzes"][0]["lessonOrder"], 1)

    def test_validate_course_creation_payload_rejects_empty_lessons(self):
        with self.assertRaises(ValueError):
            learning.validate_course_creation_payload(
                {
                    "title": "Python Basics",
                    "description": "",
                    "level": "",
                    "image": "",
                    "lessons": [],
                }
            )

    def test_normalize_quiz_answers_supports_mapping_and_list_payloads(self):
        mapping_result = learning.normalize_quiz_answers({"1": "2", "bad": "x"})
        list_result = learning.normalize_quiz_answers(
            [
                {"questionId": "5", "answerIndex": "1"},
                {"questionId": "oops", "answerIndex": "2"},
            ]
        )

        self.assertEqual(mapping_result, {1: 2})
        self.assertEqual(list_result, {5: 1})

    def test_serialize_course_row_grants_delete_to_moderator(self):
        payload = learning.serialize_course_row(
            {
                "id": 7,
                "title": "Course",
                "description": "Desc",
                "level": "Middle",
                "image": "/img.png",
                "progress_percent": 30,
                "creator_user_id": "author_1",
                "is_enrolled": False,
                "completed": False,
            },
            current_user_id="moder_1",
            current_user_role="moderator",
        )

        self.assertFalse(payload["isOwner"])
        self.assertFalse(payload["canEdit"])
        self.assertTrue(payload["canDelete"])

    def test_delete_course_allows_moderator(self):
        cursor = FakeCursor(fetchone_values=[{"id": 10, "creator_user_id": "author_1"}])
        connection = FakeConnection(cursor)

        with patch.object(learning, "get_user_role", return_value="moderator"), patch.object(
            learning,
            "get_connection",
            return_value=connection,
        ):
            result = learning.delete_course("moder_1", 10)

        self.assertEqual(result["deletedCourseId"], 10)
        self.assertTrue(connection.committed)
        self.assertIn("DELETE FROM courses", cursor.executed[-1][0])

    def test_delete_course_rejects_regular_user_for_foreign_course(self):
        cursor = FakeCursor(fetchone_values=[{"id": 10, "creator_user_id": "author_1"}])
        connection = FakeConnection(cursor)

        with patch.object(learning, "get_user_role", return_value="user"), patch.object(
            learning,
            "get_connection",
            return_value=connection,
        ):
            with self.assertRaises(PermissionError):
                learning.delete_course("user_1", 10)

        self.assertFalse(connection.committed)
