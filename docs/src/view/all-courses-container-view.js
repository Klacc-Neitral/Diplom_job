import { AbstractComponent } from "../framework/view/abstract-component.js";

function createAllCoursesTemplate() {
    return (
        `<section class="all-courses-view">
            <div class="all-courses-header">
                <div class="motivation-box">
                    <p>Развивай свои навыки. Выбери новые курсы, чтобы углубить знания и попробовать новые направления.</p>
                </div>
            </div>
            <div class="all-courses-toolbar">
                <div class="all-courses-search-slot"></div>
            </div>
            <div class="all-courses-list"></div>
        </section>`
    );
}

export default class AllCoursesContainerView extends AbstractComponent {
    get template() {
        return createAllCoursesTemplate();
    }

    getSearchSlot() {
        return this.element.querySelector(".all-courses-search-slot");
    }

    getListContainer() {
        return this.element.querySelector(".all-courses-list");
    }
}
