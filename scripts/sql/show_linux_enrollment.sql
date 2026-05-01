SELECT c.title, e.user_id, e.course_id
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id
WHERE c.title ILIKE '%linux%';
