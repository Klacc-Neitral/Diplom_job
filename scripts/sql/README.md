# SQL workflow

Пиши SQL в отдельных `.sql`-файлах и запускай их из Git Bash:

```bash
./scripts/run-sql.sh ./scripts/sql/course_template.sql
```

Если хочешь просто посмотреть данные:

```bash
./scripts/run-sql.sh ./scripts/sql/show_courses.sql
```

Для примера наполнения викторин:

```bash
./scripts/run-sql.sh ./scripts/sql/quiz_examples.sql
```

Второй пример для React-курса:

```bash
./scripts/run-sql.sh ./scripts/sql/quiz_examples_react.sql
```

Пример для Photoshop-курса:

```bash
./scripts/run-sql.sh ./scripts/sql/quiz_examples_photoshop.sql
```

Для запросов на чтение удобно делать отдельные файлы рядом в этой папке.

Пример файла:

```sql
SELECT id, title, level
FROM courses
ORDER BY id;
```
