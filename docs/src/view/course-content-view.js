import { AbstractComponent } from "../framework/view/abstract-component.js";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function extractEmbedUrl(rawValue) {
    const source = String(rawValue ?? "").trim();
    if (!source) {
        return null;
    }

    const iframeSrcMatch = source.match(/src=["']([^"']+)["']/i);
    const candidate = iframeSrcMatch ? iframeSrcMatch[1] : source;

    try {
        const url = new URL(candidate);
        const normalizedHost = url.hostname.toLowerCase();
        const normalizedPath = url.pathname.replace(/\/+$/, "");

        const vkHosts = new Set(["vk.com", "www.vk.com", "vk.ru", "www.vk.ru", "vkvideo.ru", "www.vkvideo.ru"]);
        if (vkHosts.has(normalizedHost)) {
            if (normalizedPath === "/video_ext.php") {
                return url.toString();
            }

            const directVideoMatch = normalizedPath.match(/\/video(-?\d+)_(\d+)$/i);
            if (directVideoMatch) {
                const [, ownerId, videoId] = directVideoMatch;
                return `https://vkvideo.ru/video_ext.php?oid=${ownerId}&id=${videoId}`;
            }

            return null;
        }

        const rutubeHosts = new Set(["rutube.ru", "www.rutube.ru"]);
        if (rutubeHosts.has(normalizedHost)) {
            const embedMatch = normalizedPath.match(/^\/play\/embed\/([a-z0-9-]+)$/i);
            if (embedMatch) {
                return url.toString();
            }

            const directVideoMatch = normalizedPath.match(/^\/video\/([a-z0-9-]+)$/i);
            if (directVideoMatch) {
                const [, videoId] = directVideoMatch;
                return `https://rutube.ru/play/embed/${videoId}`;
            }

            return null;
        }

        return null;
    } catch {
        return null;
    }
}

function createVideoBlock(videoUrl) {
    const embedUrl = extractEmbedUrl(videoUrl);
    if (!embedUrl) {
        return "";
    }

    return `
        <section class="lesson-video-block">
            <h3>Видео</h3>
            <div class="lesson-video-frame">
                <iframe
                    src="${escapeHtml(embedUrl)}"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;"
                    allowfullscreen
                    referrerpolicy="strict-origin-when-cross-origin"
                    loading="lazy"
                    title="Видео урока"
                ></iframe>
            </div>
        </section>
    `;
}

function createQuizResultMarkup(result) {
    if (!result) {
        return "";
    }

    const statusClass = result.passed ? "is-passed" : "is-failed";
    const statusText = result.passed ? "Тест пройден" : "Тест пока не пройден";

    return `
        <div class="quiz-result-banner ${statusClass}">
            <strong>${statusText}</strong>
            <span>${result.score} из ${result.total} правильных ответов (${result.percent}%)</span>
        </div>
    `;
}

function createQuizQuestionsMarkup(quiz) {
    return quiz.questions.map((question, questionIndex) => `
        <fieldset class="quiz-question" data-question-id="${question.id}">
            <legend>${questionIndex + 1}. ${escapeHtml(question.question)}</legend>
            <div class="quiz-options">
                ${question.answers.map((answer, answerIndex) => `
                    <label class="quiz-option">
                        <input type="radio" name="quiz-question-${question.id}" value="${answerIndex}">
                        <span>${escapeHtml(answer)}</span>
                    </label>
                `).join("")}
            </div>
        </fieldset>
    `).join("");
}

function createQuizBlockMarkup(quiz) {
    const questionCount = quiz.questions.length;
    const actionText = quiz.type === "final" ? "Открыть экзамен" : "Пройти мини-тест";
    const retryText = quiz.type === "final" ? "Пересдать экзамен" : "Пройти тест заново";

    return `
        <section class="quiz-card ${quiz.type === "final" ? "quiz-card-final" : ""}">
            <div class="quiz-card-header">
                <div>
                    <span class="quiz-card-badge">${quiz.type === "final" ? "Экзамен" : "Мини-тест"}</span>
                    <h3>${escapeHtml(quiz.title)}</h3>
                    <p>${escapeHtml(quiz.description)}</p>
                </div>
                <div class="quiz-card-meta">
                    <span>${questionCount} вопросов</span>
                    <span>4 варианта ответа</span>
                </div>
            </div>

            ${createQuizResultMarkup(quiz.lastResult)}

            ${quiz.isVisible ? `
                <form class="quiz-form" data-quiz-key="${quiz.key}">
                    <div class="quiz-questions">
                        ${createQuizQuestionsMarkup(quiz)}
                    </div>
                    <div class="quiz-actions">
                        <button class="btn quiz-submit-button" type="submit">Проверить ответы</button>
                    </div>
                </form>
            ` : `
                <div class="quiz-collapsed">
                    <button class="btn quiz-open-button" type="button" data-action="open-quiz" data-quiz-key="${quiz.key}">
                        ${quiz.lastResult ? retryText : actionText}
                    </button>
                </div>
            `}
        </section>
    `;
}

function createCourseContentTemplate({ courseTitle, pageData, totalPages, quizBlocks, nextButton }) {
    const { pageTitle, text, pageNumber, videoUrl } = pageData;
    const isFirstPage = pageNumber === 1;

    return (
        `<div class="course-content-view">
            <div class="course-content-shell">
                <div class="course-content-header">
                    <div>
                        <span class="course-content-caption">Курс</span>
                        <h1>${escapeHtml(courseTitle)}</h1>
                    </div>
                    <span class="course-content-progress">Страница ${pageNumber} из ${totalPages}</span>
                </div>

                <article class="course-material-card">
                    <h2>${escapeHtml(pageTitle)}</h2>
                    <p class="course-material-text">${escapeHtml(text)}</p>
                    ${createVideoBlock(videoUrl)}
                </article>

                ${quizBlocks.length ? `
                    <div class="course-quiz-list">
                        ${quizBlocks.map(createQuizBlockMarkup).join("")}
                    </div>
                ` : ""}

                <div class="course-navigation">
                    <button class="btn btn-prev" ${isFirstPage ? "disabled" : ""}>← Назад</button>
                    <button class="btn btn-next" ${nextButton.disabled ? "disabled" : ""}>${escapeHtml(nextButton.label)}</button>
                </div>

                <button class="btn btn-back" type="button">Вернуться к списку курсов</button>
            </div>
        </div>`
    );
}

export default class CourseContentView extends AbstractComponent {
    _callback = {};
    #state = null;

    constructor(state) {
        super();
        this.#state = state;
    }

    get template() {
        return createCourseContentTemplate(this.#state);
    }

    setPrevClickHandler(callback) {
        this._callback.prevClick = callback;
        this.element.querySelector(".btn-prev").addEventListener("click", this._callback.prevClick);
    }

    setNextClickHandler(callback) {
        this._callback.nextClick = callback;
        this.element.querySelector(".btn-next").addEventListener("click", this._callback.nextClick);
    }

    setBackClickHandler(callback) {
        this._callback.backClick = callback;
        this.element.querySelector(".btn-back").addEventListener("click", this._callback.backClick);
    }

    setQuizOpenHandler(callback) {
        this._callback.quizOpen = callback;
        this.element.querySelectorAll('[data-action="open-quiz"]').forEach((button) => {
            button.addEventListener("click", (evt) => {
                evt.preventDefault();
                this._callback.quizOpen(button.dataset.quizKey);
            });
        });
    }

    setQuizSubmitHandler(callback) {
        this._callback.quizSubmit = callback;
        this.element.querySelectorAll(".quiz-form").forEach((form) => {
            form.addEventListener("submit", (evt) => {
                evt.preventDefault();

                const answers = Array.from(form.querySelectorAll(".quiz-question")).map((questionNode) => {
                    const selectedOption = questionNode.querySelector("input[type='radio']:checked");
                    return {
                        questionId: Number(questionNode.dataset.questionId),
                        answerIndex: selectedOption ? Number(selectedOption.value) : null,
                    };
                });

                this._callback.quizSubmit(form.dataset.quizKey, answers);
            });
        });
    }
}
