import { AbstractComponent } from "../framework/view/abstract-component.js";

function createFooterTemplate() {
    return (
        `<footer class="footer">
            <div class="container">
                <a href="#" class="logo">ProgTest<span class="logo-icon"></span></a>
                <nav class="footer-nav">
                    <ul>
                        <li><a href="#">Курсы</a></li>
                        <li><a href="#">Миссия</a></li>
                        <li><a href="#">Эффективность</a></li>
                        <li><a href="#">Вакансии</a></li>
                        <li><a href="#">Отзывы</a></li>
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
    get template() {
        return createFooterTemplate();
    }
}