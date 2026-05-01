SELECT id, title, image
FROM courses
WHERE title ILIKE '%linux%'
ORDER BY id;
