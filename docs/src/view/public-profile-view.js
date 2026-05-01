import { AbstractComponent } from "../framework/view/abstract-component.js";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

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

function createCoursesMarkup(courses) {
    if (!courses.length) {
        return '<div class="empty-state public-profile-empty">Пользователь пока не добавил ни одного курса в свой профиль.</div>';
    }

    return courses.map((course) => {
        const imageUrl = normalizeImageUrl(course.img);
        const safeTitle = escapeHtml(course.title);
        const safeDescription = escapeHtml(course.desc || "Описание курса отсутствует.");
        const safeLevel = escapeHtml(course.level || "Без уровня");
        const statusText = course.completed ? "Завершён" : `${course.percent}%`;
        const style = imageUrl ? `style="background-image: url('${imageUrl}');"` : "";

        return `
            <article class="public-course-card">
                <div class="public-course-media" ${style}></div>
                <div class="public-course-body">
                    <div>
                        <h4>${safeTitle}</h4>
                        <p>${safeDescription}</p>
                    </div>
                    <div class="public-course-meta">
                        <span>${safeLevel}</span>
                        <strong>${escapeHtml(statusText)}</strong>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function createPublicProfileTemplate(profile) {
    const user = profile?.user ?? {};
    const stats = profile?.stats ?? {};
    const courses = profile?.courses ?? [];
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || "Пользователь";
    const username = user.username ? `@${user.username}` : "Без логина";
    const avatarUrl = user.avatar_url || "https://via.placeholder.com/96x96?text=User";

    return (
        `<section class="public-profile-card">
            <div class="public-profile-hero">
                <img class="public-profile-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(fullName)}">
                <div class="public-profile-main">
                    <span class="public-profile-platform">${escapeHtml(user.platform || "user")}</span>
                    <h2>${escapeHtml(fullName)}</h2>
                    <p>${escapeHtml(username)}</p>
                </div>
            </div>

            <div class="public-profile-stats">
                <div class="public-stat-box">
                    <span>Всего курсов</span>
                    <strong>${stats.totalCourses ?? 0}</strong>
                </div>
                <div class="public-stat-box">
                    <span>В процессе</span>
                    <strong>${stats.inProgressCourses ?? 0}</strong>
                </div>
                <div class="public-stat-box">
                    <span>Завершено</span>
                    <strong>${stats.completedCourses ?? 0}</strong>
                </div>
            </div>

            <div class="public-profile-courses">
                <div class="public-profile-courses-header">
                    <h3>Курсы пользователя</h3>
                    <span>${courses.length} шт.</span>
                </div>
                <div class="public-profile-course-list">
                    ${createCoursesMarkup(courses)}
                </div>
            </div>
        </section>`
    );
}

export default class PublicProfileView extends AbstractComponent {
    #profile = null;

    constructor(profile) {
        super();
        this.#profile = profile;
    }

    get template() {
        return createPublicProfileTemplate(this.#profile);
    }
}
