SELECT c.title, l.id, l.title, l.video_url, l.order FROM lessons l JOIN courses c ON c.id = l.course_id ORDER BY c.id, l.order;
