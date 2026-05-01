import { AbstractComponent } from "../framework/view/abstract-component.js";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function createUserSearchResultTemplate(user, isActive) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || "Пользователь";
    const username = user.username ? `@${user.username}` : "Без логина";
    const avatarUrl = user.avatar_url || "https://via.placeholder.com/72x72?text=User";
    const stats = user.stats || {};

    return (
        `<article class="person-result-card ${isActive ? "is-active" : ""}">
            <button class="person-result-trigger" type="button">
                <img class="person-result-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(fullName)}">
                <div class="person-result-body">
                    <div class="person-result-heading">
                        <h3>${escapeHtml(fullName)}</h3>
                        <span>${escapeHtml(username)}</span>
                    </div>
                    <div class="person-result-stats">
                        <span>Пройдено: ${stats.completedCourses ?? 0}</span>
                        <span>В процессе: ${stats.inProgressCourses ?? 0}</span>
                    </div>
                </div>
            </button>
        </article>`
    );
}

export default class UserSearchResultView extends AbstractComponent {
    #user = null;
    #isActive = false;
    _callback = {};

    constructor(user, isActive = false) {
        super();
        this.#user = user;
        this.#isActive = isActive;
    }

    get template() {
        return createUserSearchResultTemplate(this.#user, this.#isActive);
    }

    setOpenClickHandler(callback) {
        this._callback.openClick = callback;
        this.element.querySelector(".person-result-trigger").addEventListener("click", (evt) => {
            evt.preventDefault();
            this._callback.openClick(this.#user.user_id);
        });
    }
}
