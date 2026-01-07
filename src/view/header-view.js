import { AbstractComponent } from "../framework/view/abstract-component.js";

function createHeaderTemplate() {
    return (
        `<header class="header">
            <div class="container">
                <a href="#" class="logo">
                    ProgTest
                    <span class="logo-icon"></span>
                </a>
                <nav class="main-nav">
                    <ul>
                        <li><a href="#">Новости</a></li>
                        <li><a href="#">Помощь</a></li>
                        <li><a href="#">Услуги</a></li>
                    </ul>
                </nav>
            </div>
        </header>`
    );
}

export default class HeaderView extends AbstractComponent {
    get template() {
        return createHeaderTemplate();
    }
}