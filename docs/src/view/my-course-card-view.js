import { AbstractComponent } from "../framework/view/abstract-component.js";

function normalizeImageUrl(value) {
    const source = String(value ?? "").trim();

    if (!source) {
        return "";
    }

    if (
        source.startsWith("http://") ||
        source.startsWith("https://") ||
        source.startsWith("data:") ||
        source.startsWith("/")
    ) {
        return source;
    }

    if (source.startsWith("./")) {
        return `/${source.slice(2)}`;
    }

    return `/${source}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function createCourseCardTemplate(course) {
    const { title, percent, img, action, isOwner } = course;
    const btnClass = percent === 0 ? "btn-start" : "";
    const imageUrl = normalizeImageUrl(img);
    const ownerBadge = isOwner ? '<span class="course-card-badge">Мой курс</span>' : "";
    const editButton = isOwner
        ? '<button class="btn btn-course btn-edit-course" type="button">Редактировать</button>'
        : "";

    return (
        `<div class="course-card" style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.7) 100%), url('${imageUrl}');">
            <div class="course-card-category">
                ${ownerBadge}
                <span>${escapeHtml(title)}</span>
            </div>
            <div class="course-card-footer">
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-bar-inner" style="width: ${percent}%;"></div>
                    </div>
                    <div class="course-card-actions">
                        <button class="btn btn-course btn-course-action ${btnClass}" type="button">${escapeHtml(action)}</button>
                        ${editButton}
                        <button class="btn btn-course btn-delete" type="button" aria-label="Удалить курс">✕</button>
                    </div>
                </div>
                <span class="course-card-percent">${percent}%</span>
            </div>
        </div>`
    );
}

export default class MyCourseCardView extends AbstractComponent {
    #course = null;
    _callback = {};

    constructor(course) {
        super();
        this.#course = course;
    }

    get template() {
        return createCourseCardTemplate(this.#course);
    }

    setDeleteClickHandler(callback) {
        this._callback.deleteClick = callback;

        this.element.querySelector(".btn-delete").addEventListener("click", (evt) => {
            evt.preventDefault();
            this._callback.deleteClick(this.#course.id);
        });
    }

    setEditClickHandler(callback) {
        const button = this.element.querySelector(".btn-edit-course");
        if (!button) {
            return;
        }

        this._callback.editClick = callback;
        button.addEventListener("click", (evt) => {
            evt.preventDefault();
            this._callback.editClick(this.#course.id);
        });
    }

    setCourseActionClickHandler(callback) {
        this._callback.actionClick = callback;
        this.element.querySelector(".btn-course-action").addEventListener("click", (evt) => {
            evt.preventDefault();
            this._callback.actionClick(this.#course);
        });
    }
}
