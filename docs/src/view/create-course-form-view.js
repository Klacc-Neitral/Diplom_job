import { AbstractComponent } from "../framework/view/abstract-component.js";

const FORM_MODE = {
    CREATE: "create",
    EDIT: "edit",
};

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function normalizeQuestionDraft(question = {}) {
    const answers = Array.isArray(question.answers) ? question.answers.slice(0, 4) : [];
    while (answers.length < 4) {
        answers.push("");
    }

    return {
        question: question.question ?? "",
        answers,
        correctAnswer: Number.isInteger(question.correctAnswer) ? question.correctAnswer : null,
    };
}

function createLessonTemplate(index, lesson = {}) {
    const title = escapeHtml(lesson.title ?? "");
    const videoUrl = escapeHtml(lesson.videoUrl ?? "");
    const content = escapeHtml(lesson.content ?? "");

    return (
        `<article class="course-lesson-card" data-lesson-index="${index}">
            <div class="course-lesson-card-header">
                <h4>Урок ${index}</h4>
                <button type="button" class="btn course-lesson-remove" data-action="remove-lesson">Удалить</button>
            </div>
            <div class="course-creator-grid lesson-grid">
                <label class="course-creator-field">
                    <span>Название урока</span>
                    <input class="app-input course-lesson-title" type="text" maxlength="160" required placeholder="Например, Введение" value="${title}">
                </label>
                <label class="course-creator-field">
                    <span>Видео (необязательно)</span>
                    <input class="app-input course-lesson-video" type="url" maxlength="2048" placeholder="https://..." value="${videoUrl}">
                </label>
            </div>
            <label class="course-creator-field">
                <span>Материал урока</span>
                <textarea class="course-lesson-content" rows="5" maxlength="12000" required placeholder="Опиши тему, шаги, примеры и домашнее задание.">${content}</textarea>
            </label>
        </article>`
    );
}

function createQuizQuestionTemplate(questionIndex, questionDraft = {}) {
    const draft = normalizeQuestionDraft(questionDraft);
    const safeQuestion = escapeHtml(draft.question);
    const answerOptions = draft.answers.map((answer) => escapeHtml(answer));

    return (
        `<article class="quiz-builder-question-card" data-question-index="${questionIndex}">
            <div class="quiz-builder-question-head">
                <h5>Вопрос ${questionIndex}</h5>
                <button type="button" class="btn btn-secondary quiz-builder-question-remove" data-action="remove-quiz-question">Удалить</button>
            </div>

            <label class="course-creator-field">
                <span>Текст вопроса</span>
                <textarea class="quiz-builder-question-text" rows="3" maxlength="500" required placeholder="Сформулируй вопрос для ученика.">${safeQuestion}</textarea>
            </label>

            <div class="course-creator-grid quiz-builder-answers-grid">
                <label class="course-creator-field">
                    <span>Ответ 1</span>
                    <input class="app-input quiz-builder-answer" type="text" maxlength="300" required value="${answerOptions[0]}">
                </label>
                <label class="course-creator-field">
                    <span>Ответ 2</span>
                    <input class="app-input quiz-builder-answer" type="text" maxlength="300" required value="${answerOptions[1]}">
                </label>
                <label class="course-creator-field">
                    <span>Ответ 3</span>
                    <input class="app-input quiz-builder-answer" type="text" maxlength="300" required value="${answerOptions[2]}">
                </label>
                <label class="course-creator-field">
                    <span>Ответ 4</span>
                    <input class="app-input quiz-builder-answer" type="text" maxlength="300" required value="${answerOptions[3]}">
                </label>
            </div>

            <label class="course-creator-field">
                <span>Правильный ответ</span>
                <select class="quiz-builder-correct-answer" required>
                    <option value="" ${draft.correctAnswer === null ? "selected" : ""}>Выбери правильный вариант</option>
                    <option value="0" ${draft.correctAnswer === 0 ? "selected" : ""}>Ответ 1</option>
                    <option value="1" ${draft.correctAnswer === 1 ? "selected" : ""}>Ответ 2</option>
                    <option value="2" ${draft.correctAnswer === 2 ? "selected" : ""}>Ответ 3</option>
                    <option value="3" ${draft.correctAnswer === 3 ? "selected" : ""}>Ответ 4</option>
                </select>
            </label>
        </article>`
    );
}

function createQuizSectionTemplate({ title, description, sectionClass, lessonOrder = null }) {
    const lessonOrderAttribute = lessonOrder === null ? "" : ` data-lesson-order="${lessonOrder}"`;

    return (
        `<section class="course-quiz-section ${sectionClass}"${lessonOrderAttribute}>
            <div class="course-quiz-section-head">
                <div>
                    <h4>${escapeHtml(title)}</h4>
                    <p>${escapeHtml(description)}</p>
                </div>
                <button type="button" class="btn btn-secondary" data-action="add-quiz-question">Добавить вопрос</button>
            </div>
            <div class="quiz-builder-questions-list"></div>
        </section>`
    );
}

function createCreateCourseFormTemplate() {
    return (
        `<section class="course-creator-panel">
            <div class="course-creator-head">
                <div>
                    <p class="course-creator-eyebrow">Авторский курс</p>
                    <h3 class="course-creator-title">Собери свой курс прямо в платформе</h3>
                    <p class="course-creator-description">Добавь обложку, описание, уроки и тесты. После публикации курс сразу появится в твоих курсах.</p>
                </div>
                <button type="button" class="btn btn-create-course-toggle">Создать курс</button>
            </div>

            <form class="course-creator-form hidden">
                <div class="course-creator-grid">
                    <label class="course-creator-field">
                        <span>Название курса</span>
                        <input name="course-title" class="app-input" type="text" minlength="3" maxlength="120" required placeholder="Например, Основы Python">
                    </label>
                    <label class="course-creator-field">
                        <span>Уровень</span>
                        <input name="course-level" class="app-input" type="text" maxlength="80" placeholder="Начальный, Middle, Advanced">
                    </label>
                </div>

                <label class="course-creator-field">
                    <span>Описание курса</span>
                    <textarea name="course-description" rows="4" maxlength="2000" placeholder="Кому подойдёт курс и какой результат получит ученик."></textarea>
                </label>

                <label class="course-creator-field">
                    <span>Ссылка на обложку</span>
                    <input name="course-image" class="app-input" type="url" maxlength="2048" placeholder="https://example.com/cover.jpg">
                </label>

                <div class="course-lessons-header">
                    <div>
                        <h4>Уроки</h4>
                        <p>Добавь минимум один урок. Порядок сохранится автоматически.</p>
                    </div>
                    <button type="button" class="btn btn-secondary" data-action="add-lesson">Добавить урок</button>
                </div>

                <div class="course-lessons-list">
                    ${createLessonTemplate(1)}
                </div>

                <section class="course-quiz-builder">
                    <div class="course-quiz-builder-intro">
                        <h4>Конструктор тестов</h4>
                        <p>Для каждого урока можно добавить мини-тест, а в конце курса собрать финальный экзамен. Каждый вопрос должен содержать 4 варианта ответа.</p>
                    </div>

                    <div class="course-lesson-quizzes"></div>

                    ${createQuizSectionTemplate({
                        title: "Финальный тест",
                        description: "Этот тест появится на последней странице курса.",
                        sectionClass: "course-final-quiz-section",
                    })}
                </section>

                <p class="course-form-feedback hidden" aria-live="polite"></p>

                <div class="course-creator-actions">
                    <button type="button" class="btn btn-secondary" data-action="cancel-course-form">Отмена</button>
                    <button type="submit" class="btn btn-create-course-submit">Опубликовать курс</button>
                </div>
            </form>
        </section>`
    );
}

export default class CreateCourseFormView extends AbstractComponent {
    #mode = FORM_MODE.CREATE;
    #editingCourseId = null;
    _callback = {};

    get template() {
        return createCreateCourseFormTemplate();
    }

    setSubmitHandler(callback) {
        this._callback.submit = callback;

        this.element.querySelector(".btn-create-course-toggle").addEventListener("click", () => {
            this.#toggleForm();
        });

        this.element.querySelector(".course-creator-form").addEventListener("submit", this.#handleSubmit);

        this.element.addEventListener("click", (evt) => {
            const action = evt.target.dataset.action;
            if (!action) {
                return;
            }

            if (action === "add-lesson") {
                evt.preventDefault();
                this.#appendLesson();
            }

            if (action === "remove-lesson") {
                evt.preventDefault();
                this.#removeLesson(evt.target.closest(".course-lesson-card"));
            }

            if (action === "add-quiz-question") {
                evt.preventDefault();
                this.#appendQuizQuestion(evt.target.closest(".course-quiz-section"));
            }

            if (action === "remove-quiz-question") {
                evt.preventDefault();
                this.#removeQuizQuestion(evt.target.closest(".quiz-builder-question-card"));
            }

            if (action === "cancel-course-form") {
                evt.preventDefault();
                this.reset();
                this._callback.cancel?.();
            }
        });

        this.#syncLessonCards();
        this.#syncLessonQuizSections();
        this.#syncQuestionCards();
        this.#renderMode();
    }

    setCancelHandler(callback) {
        this._callback.cancel = callback;
    }

    isEditing() {
        return this.#mode === FORM_MODE.EDIT;
    }

    openForCreate() {
        this.#mode = FORM_MODE.CREATE;
        this.#editingCourseId = null;
        this.#clearValues();
        this.#setFeedback("");
        this.#setExpanded(true);
        this.#renderMode();
    }

    openForEdit(courseDraft) {
        this.#mode = FORM_MODE.EDIT;
        this.#editingCourseId = courseDraft?.id ?? null;
        this.#fillForm(courseDraft);
        this.#setFeedback("");
        this.#setExpanded(true);
        this.#renderMode();
    }

    reset() {
        this.#mode = FORM_MODE.CREATE;
        this.#editingCourseId = null;
        this.#clearValues();
        this.#setFeedback("");
        this.#setExpanded(false);
        this.#renderMode();
    }

    setSaving(isSaving) {
        const form = this.element.querySelector(".course-creator-form");
        const submitButton = form.querySelector(".btn-create-course-submit");
        const toggleButton = this.element.querySelector(".btn-create-course-toggle");

        submitButton.disabled = isSaving;
        submitButton.textContent = isSaving
            ? this.isEditing() ? "Сохраняем..." : "Публикуем..."
            : this.isEditing() ? "Сохранить изменения" : "Опубликовать курс";
        toggleButton.disabled = isSaving;

        form.querySelectorAll("input, textarea, select, button").forEach((field) => {
            if (field !== submitButton) {
                field.disabled = isSaving;
            }
        });
    }

    showError(message) {
        this.#setFeedback(message, "error");
        this.#setExpanded(true);
    }

    #handleSubmit = async (evt) => {
        evt.preventDefault();

        const form = evt.target;
        if (!form.reportValidity()) {
            return;
        }

        this.#setFeedback("");

        try {
            await this._callback.submit(this.#collectPayload(), {
                mode: this.#mode,
                courseId: this.#editingCourseId,
            });
        } catch (error) {
            this.showError(
                error.message || (this.isEditing() ? "Не удалось обновить курс." : "Не удалось создать курс.")
            );
        }
    };

    #collectPayload() {
        const form = this.element.querySelector(".course-creator-form");

        return {
            title: form.querySelector('[name="course-title"]').value.trim(),
            level: form.querySelector('[name="course-level"]').value.trim(),
            description: form.querySelector('[name="course-description"]').value.trim(),
            image: form.querySelector('[name="course-image"]').value.trim(),
            lessons: Array.from(form.querySelectorAll(".course-lesson-card")).map((lessonCard) => ({
                title: lessonCard.querySelector(".course-lesson-title").value.trim(),
                content: lessonCard.querySelector(".course-lesson-content").value.trim(),
                videoUrl: lessonCard.querySelector(".course-lesson-video").value.trim(),
            })),
            quizzes: {
                lessonQuizzes: Array.from(form.querySelectorAll(".course-lesson-quiz-section"))
                    .map((section) => ({
                        lessonOrder: Number(section.dataset.lessonOrder),
                        questions: this.#collectQuestionsFromSection(section),
                    }))
                    .filter((section) => section.questions.length > 0),
                finalQuiz: {
                    questions: this.#collectQuestionsFromSection(
                        form.querySelector(".course-final-quiz-section")
                    ),
                },
            },
        };
    }

    #collectQuestionsFromSection(section) {
        return Array.from(section.querySelectorAll(".quiz-builder-question-card")).map((questionCard) => ({
            question: questionCard.querySelector(".quiz-builder-question-text").value.trim(),
            answers: Array.from(questionCard.querySelectorAll(".quiz-builder-answer")).map((input) => input.value.trim()),
            correctAnswer: Number(questionCard.querySelector(".quiz-builder-correct-answer").value),
        }));
    }

    #toggleForm() {
        const form = this.element.querySelector(".course-creator-form");
        this.#setExpanded(form.classList.contains("hidden"));
    }

    #setExpanded(isExpanded) {
        const form = this.element.querySelector(".course-creator-form");
        form.classList.toggle("hidden", !isExpanded);
        this.#renderMode();
    }

    #appendLesson(lesson = null) {
        const lessonsList = this.element.querySelector(".course-lessons-list");
        const nextIndex = lessonsList.querySelectorAll(".course-lesson-card").length + 1;
        lessonsList.insertAdjacentHTML("beforeend", createLessonTemplate(nextIndex, lesson ?? {}));
        this.#syncLessonCards();
        this.#syncLessonQuizSections();
    }

    #removeLesson(lessonCard) {
        if (!lessonCard) {
            return;
        }

        const lessonsList = this.element.querySelector(".course-lessons-list");
        if (lessonsList.querySelectorAll(".course-lesson-card").length <= 1) {
            return;
        }

        const currentQuizDrafts = this.#getCurrentLessonQuizDrafts();
        const removedIndex = Number(lessonCard.dataset.lessonIndex) - 1;
        lessonCard.remove();
        currentQuizDrafts.splice(removedIndex, 1);

        this.#syncLessonCards();
        this.#syncLessonQuizSections(currentQuizDrafts);
    }

    #appendQuizQuestion(section, questionDraft = null) {
        if (!section) {
            return;
        }

        const questionsList = section.querySelector(".quiz-builder-questions-list");
        const nextIndex = questionsList.querySelectorAll(".quiz-builder-question-card").length + 1;
        questionsList.insertAdjacentHTML("beforeend", createQuizQuestionTemplate(nextIndex, questionDraft ?? {}));
        this.#syncQuestionCards(section);
    }

    #removeQuizQuestion(questionCard) {
        if (!questionCard) {
            return;
        }

        const section = questionCard.closest(".course-quiz-section");
        questionCard.remove();
        this.#syncQuestionCards(section);
    }

    #clearValues() {
        const form = this.element.querySelector(".course-creator-form");
        form.reset();
        form.querySelector(".course-lessons-list").innerHTML = createLessonTemplate(1);
        this.#syncLessonCards();
        this.#syncLessonQuizSections([]);
        form.querySelector(".course-final-quiz-section .quiz-builder-questions-list").innerHTML = "";
        this.#syncQuestionCards();
    }

    #fillForm(courseDraft) {
        const form = this.element.querySelector(".course-creator-form");
        form.querySelector('[name="course-title"]').value = courseDraft?.title ?? "";
        form.querySelector('[name="course-level"]').value = courseDraft?.level ?? "";
        form.querySelector('[name="course-description"]').value = courseDraft?.description ?? "";
        form.querySelector('[name="course-image"]').value = courseDraft?.image ?? "";

        const lessons = Array.isArray(courseDraft?.lessons) && courseDraft.lessons.length
            ? courseDraft.lessons
            : [{ title: "", content: "", videoUrl: "" }];

        form.querySelector(".course-lessons-list").innerHTML = lessons
            .map((lesson, index) => createLessonTemplate(index + 1, lesson))
            .join("");

        this.#syncLessonCards();

        const lessonQuizDrafts = lessons.map((_, index) => {
            const lessonOrder = index + 1;
            const matchingQuiz = courseDraft?.quizzes?.lessonQuizzes?.find((quiz) => quiz.lessonOrder === lessonOrder);
            return Array.isArray(matchingQuiz?.questions) ? matchingQuiz.questions : [];
        });

        this.#syncLessonQuizSections(lessonQuizDrafts);

        const finalQuestions = Array.isArray(courseDraft?.quizzes?.finalQuiz?.questions)
            ? courseDraft.quizzes.finalQuiz.questions
            : [];
        form.querySelector(".course-final-quiz-section .quiz-builder-questions-list").innerHTML = finalQuestions
            .map((question, index) => createQuizQuestionTemplate(index + 1, question))
            .join("");

        this.#syncQuestionCards();
    }

    #getCurrentLessonQuizDrafts() {
        return Array.from(this.element.querySelectorAll(".course-lesson-quiz-section")).map((section) =>
            this.#collectQuestionsFromSection(section)
        );
    }

    #syncLessonCards() {
        const lessonCards = Array.from(this.element.querySelectorAll(".course-lesson-card"));
        const canRemove = lessonCards.length > 1;

        lessonCards.forEach((lessonCard, index) => {
            const lessonNumber = index + 1;
            lessonCard.dataset.lessonIndex = String(lessonNumber);
            lessonCard.querySelector("h4").textContent = `Урок ${lessonNumber}`;
            lessonCard.querySelector(".course-lesson-remove").disabled = !canRemove;
        });
    }

    #syncLessonQuizSections(lessonQuizDrafts = null) {
        const container = this.element.querySelector(".course-lesson-quizzes");
        const lessonCards = Array.from(this.element.querySelectorAll(".course-lesson-card"));
        const quizDrafts = Array.isArray(lessonQuizDrafts) ? lessonQuizDrafts : this.#getCurrentLessonQuizDrafts();

        container.innerHTML = lessonCards.map((_lessonCard, index) => createQuizSectionTemplate({
            title: `Мини-тест после урока ${index + 1}`,
            description: "Этот тест откроется перед переходом к следующему уроку.",
            sectionClass: "course-lesson-quiz-section",
            lessonOrder: index + 1,
        })).join("");

        Array.from(container.querySelectorAll(".course-lesson-quiz-section")).forEach((section, index) => {
            const questions = Array.isArray(quizDrafts[index]) ? quizDrafts[index] : [];
            section.querySelector(".quiz-builder-questions-list").innerHTML = questions
                .map((question, questionIndex) => createQuizQuestionTemplate(questionIndex + 1, question))
                .join("");
        });

        this.#syncQuestionCards(container);
    }

    #syncQuestionCards(scope = this.element) {
        scope.querySelectorAll(".course-quiz-section").forEach((section) => {
            const questionCards = Array.from(section.querySelectorAll(".quiz-builder-question-card"));
            questionCards.forEach((questionCard, index) => {
                const questionNumber = index + 1;
                questionCard.dataset.questionIndex = String(questionNumber);
                questionCard.querySelector("h5").textContent = `Вопрос ${questionNumber}`;
            });
        });
    }

    #setFeedback(message, type = "error") {
        const feedback = this.element.querySelector(".course-form-feedback");
        feedback.textContent = message;
        feedback.classList.toggle("hidden", !message);
        feedback.dataset.state = message ? type : "";
    }

    #renderMode() {
        const isEditing = this.isEditing();
        const isExpanded = !this.element.querySelector(".course-creator-form").classList.contains("hidden");
        const title = this.element.querySelector(".course-creator-title");
        const description = this.element.querySelector(".course-creator-description");
        const eyebrow = this.element.querySelector(".course-creator-eyebrow");
        const toggleButton = this.element.querySelector(".btn-create-course-toggle");
        const submitButton = this.element.querySelector(".btn-create-course-submit");

        eyebrow.textContent = isEditing ? "Редактирование курса" : "Авторский курс";
        title.textContent = isEditing ? "Обнови свой курс" : "Собери свой курс прямо в платформе";
        description.textContent = isEditing
            ? "Измени уроки, тесты, описание или обложку. После сохранения обновлённая версия сразу появится в профиле."
            : "Добавь обложку, описание, уроки и тесты. После публикации курс сразу появится в твоих курсах.";
        submitButton.textContent = isEditing ? "Сохранить изменения" : "Опубликовать курс";

        if (isExpanded) {
            toggleButton.textContent = isEditing ? "Свернуть редактор" : "Свернуть";
            return;
        }

        toggleButton.textContent = isEditing ? "Продолжить редактирование" : "Создать курс";
    }
}
