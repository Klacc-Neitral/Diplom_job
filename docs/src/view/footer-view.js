import { AbstractComponent } from "../framework/view/abstract-component.js";

function createFooterTemplate() {
    return (
        `<footer class="footer">
            <div class="container">
                <a href="#my-courses" class="logo" data-action="go-my-courses">ProgTest<span class="logo-icon"></span></a>
                <nav class="footer-nav">
                    <ul>
                        <li><a href="#my-courses" data-action="go-my-courses">Курсы</a></li>
                        <li><a href="#mission" data-page="mission">Миссия</a></li>
                    </ul>
                </nav>
                <div class="social-links">
                    <a href="#"><img src="./img/Vector.png" alt=""></a>
                    <a href="#"><img src="./img/Vectorf.png" alt=""></a>
                </div>
            </div>
        </footer>`
    );
}

export default class FooterView extends AbstractComponent {
    _callback = {};

    get template() {
        return createFooterTemplate();
    }

    setLogoClickHandler(callback) {
        this._callback.logoClick = callback;
        this.element.querySelectorAll('[data-action="go-my-courses"]').forEach((link) => {
            link.addEventListener("click", (evt) => {
                evt.preventDefault();
                this._callback.logoClick();
            });
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
