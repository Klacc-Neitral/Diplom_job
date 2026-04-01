import { AbstractComponent } from "../framework/view/abstract-component.js";

function createAllCourseItemTemplate(course) {
    return (
        `<div class="course-listing">
            <div class="course-listing-info">
                <h3>${course.title}</h3>
                <p>${course.desc}</p>
            </div>
            <div class="course-listing-actions">
                <span>Уровень: ${course.level}</span>
                <button class="btn btn-enroll">Записаться</button>
            </div>
        </div>`
    );
}

export default class AllCourseCardView extends AbstractComponent {
    #course = null;
    _callback = {};

    constructor(course) {
        super();
        this.#course = course;
    }

    get template() {
        return createAllCourseItemTemplate(this.#course);
    }

    setEnrollClickHandler(callback) {
        this._callback.enrollClick = callback;
        this.element.querySelector('.btn-enroll').addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.target.textContent = "Вы уже записаны!";
            evt.target.disabled = true;
            this._callback.enrollClick(this.#course.title);
        });
    }
}