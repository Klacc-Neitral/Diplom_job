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

    return (
        `<article class="course-listing">
            <div class="course-listing-media" ${backgroundStyle}></div>
            <div class="course-listing-content">
                <div class="course-listing-info">
                    <span class="course-listing-badge">Новый курс</span>
                    <h3>${safeTitle}</h3>
                    <p>${safeDescription}</p>
                </div>
                <div class="course-listing-actions">
                    <span class="course-level-chip">Уровень: ${safeLevel}</span>
                    <button class="btn btn-enroll">Записаться</button>
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
            this._callback.enrollClick(this.#course.title);
        });
    }
}
