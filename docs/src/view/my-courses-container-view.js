import { AbstractComponent } from "../framework/view/abstract-component.js";

function createContainerTemplate() {
    return `<section class="courses-grid"></section>`;
}

export default class MyCoursesContainerView extends AbstractComponent {
    get template() {
        return createContainerTemplate();
    }
}