import { AbstractComponent } from "../framework/view/abstract-component.js";

function createAllCoursesTemplate() {
    return (
        `<section class="all-courses-view">
            <div class="all-courses-header">
                <div class="motivation-box">
                    <p>Развивай свои навыки программирования. Выбери новые курсы, чтобы углубить свои знания.</p>
                </div>
            </div>
            <div class="all-courses-list"></div>
        </section>`
    );
}

export default class AllCoursesContainerView extends AbstractComponent {
    get template() {
        return createAllCoursesTemplate();
    }

    getListContainer() {
        return this.element.querySelector('.all-courses-list');
    }
}