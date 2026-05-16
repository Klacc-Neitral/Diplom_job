import { AbstractComponent } from "../framework/view/abstract-component.js";

function createAuthorCoursesTemplate() {
    return (
        `<section class="author-courses-view">
            <div class="author-courses-hero">
                <div class="author-courses-hero-text">
                    <span class="author-courses-badge">Авторская зона</span>
                    <h2>Создавай и развивай свои курсы</h2>
                    <p>Здесь живёт конструктор курсов и список всего контента, который ты создал внутри платформы.</p>
                </div>
            </div>

            <div class="author-courses-form-slot"></div>

            <div class="author-courses-list-block">
                <div class="author-courses-list-header">
                    <h3>Мои созданные курсы</h3>
                    <span class="author-courses-list-caption">Здесь отображаются все курсы, где ты автор.</span>
                </div>
                <section class="courses-grid author-courses-grid"></section>
            </div>
        </section>`
    );
}

export default class AuthorCoursesContainerView extends AbstractComponent {
    get template() {
        return createAuthorCoursesTemplate();
    }

    getFormSlot() {
        return this.element.querySelector(".author-courses-form-slot");
    }

    getListContainer() {
        return this.element.querySelector(".author-courses-grid");
    }
}
