import { AbstractComponent } from "../framework/view/abstract-component.js";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function createSectionsMarkup(sections) {
    return sections.map(({ title, text }) => (
        `<article class="info-page-section">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(text)}</p>
        </article>`
    )).join("");
}

function createInfoPageTemplate(page) {
    return (
        `<section class="info-page">
            <div class="info-page-hero">
                <span class="info-page-badge">${escapeHtml(page.badge)}</span>
                <h2>${escapeHtml(page.title)}</h2>
                <p>${escapeHtml(page.description)}</p>
            </div>
            <div class="info-page-sections">
                ${createSectionsMarkup(page.sections)}
            </div>
            <button class="btn info-page-back" type="button">Вернуться к курсам</button>
        </section>`
    );
}

export default class InfoPageView extends AbstractComponent {
    #page = null;
    _callback = {};

    constructor(page) {
        super();
        this.#page = page;
    }

    get template() {
        return createInfoPageTemplate(this.#page);
    }

    setBackClickHandler(callback) {
        this._callback.backClick = callback;
        this.element.querySelector(".info-page-back").addEventListener("click", (evt) => {
            evt.preventDefault();
            this._callback.backClick();
        });
    }
}
