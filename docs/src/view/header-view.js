import { AbstractComponent } from "../framework/view/abstract-component.js";

function createHeaderTemplate() {
    return (
        `<header class="header">
            <div class="container">
                <a href="#my-courses" class="logo" data-action="go-my-courses" aria-label="Перейти в Мои курсы">
                    ProgTest
                    <span class="logo-icon"></span>
                </a>
                <nav class="main-nav">
                    <ul>
                        <li><a href="#news" data-page="news">Новости</a></li>
                        <li><a href="#help" data-page="help">Помощь</a></li>
                        <li><a href="#services" data-page="services">Услуги</a></li>
                    </ul>
                </nav>
            </div>
        </header>`
    );
}

export default class HeaderView extends AbstractComponent {
    _callback = {};

    get template() {
        return createHeaderTemplate();
    }

    setLogoClickHandler(callback) {
        this._callback.logoClick = callback;
        this.element.querySelector('[data-action="go-my-courses"]').addEventListener("click", (evt) => {
            evt.preventDefault();
            this._callback.logoClick();
        });
    }

    setPageClickHandler(callback) {
        this._callback.pageClick = callback;
        this.element.querySelectorAll("[data-page]").forEach((link) => {
            link.addEventListener("click", (evt) => {
                evt.preventDefault();
                this._callback.pageClick(link.dataset.page);
            });
        });
    }
}
