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

function createAllCourseItemTemplate(course) {
    const imageUrl = normalizeImageUrl(course.img);
    const safeTitle = escapeHtml(course.title);
    const safeDescription = escapeHtml(course.desc || "Описание курса скоро появится.");
    const safeLevel = escapeHtml(course.level || "Без уровня");
    const backgroundStyle = imageUrl ? `style="background-image: url('${imageUrl}');"` : "";
    const badgeLabel = course.isOwner ? "Мой курс" : "Новый курс";
    const editButton = course.canEdit
        ? '<button class="btn btn-secondary btn-owner-edit" type="button">Редактировать</button>'
        : "";
    const deleteButton = course.canDelete
        ? '<button class="btn btn-secondary btn-owner-delete" type="button">Удалить курс</button>'
        : "";

    return (
        `<article class="course-listing">
            <div class="course-listing-media" ${backgroundStyle}></div>
            <div class="course-listing-content">
                <div class="course-listing-info">
                    <span class="course-listing-badge">${badgeLabel}</span>
                    <h3>${safeTitle}</h3>
                    <p>${safeDescription}</p>
                </div>
                <div class="course-listing-actions">
                    <span class="course-level-chip">Уровень: ${safeLevel}</span>
                    ${editButton}
                    ${deleteButton}
                    <button class="btn btn-enroll" type="button">Записаться</button>
                </div>
            </div>
        </article>`
    );
}

export default class AllCourseCardView extends AbstractComponent {
    #course = null;
    _callback = {};

    constructor(course) {
        super();
        this.#course = course;
    }

    get template() {
        return createAllCourseItemTemplate(this.#course);
    }

    setEnrollClickHandler(callback) {
        this._callback.enrollClick = callback;
        this.element.querySelector(".btn-enroll").addEventListener("click", (evt) => {
            evt.preventDefault();
            evt.target.textContent = "Вы уже записаны!";
            evt.target.disabled = true;
            this._callback.enrollClick(this.#course.id);
        });
    }

    setEditClickHandler(callback) {
        const button = this.element.querySelector(".btn-owner-edit");
        if (!button) {
            return;
        }

        this._callback.editClick = callback;
        button.addEventListener("click", (evt) => {
            evt.preventDefault();
            this._callback.editClick(this.#course.id);
        });
    }

    setDeleteCourseClickHandler(callback) {
        const button = this.element.querySelector(".btn-owner-delete");
        if (!button) {
            return;
        }

        this._callback.deleteCourseClick = callback;
        button.addEventListener("click", (evt) => {
            evt.preventDefault();
            this._callback.deleteCourseClick(this.#course.id);
        });
    }
}
