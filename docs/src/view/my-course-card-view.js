import { AbstractComponent } from "../framework/view/abstract-component.js";

function createCourseCardTemplate(course) {
    const { title, percent, img, action } = course;
    const btnClass = percent === 0 ? "btn-start" : "";
    

    return (
        `<div class="course-card" style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.7) 100%), url('${img}');">
            <div class="course-card-category">${title}</div>
            <div class="course-card-footer">
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-bar-inner" style="width: ${percent}%;"></div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-course ${btnClass}">${action}</button>
                        <button class="btn btn-course btn-delete" style="background: rgba(255, 77, 77, 0.8); min-width: 40px;">✕</button>
                    </div>
                </div>
                <span class="course-card-percent">${percent}%</span>
            </div>
        </div>`
    );
}

export default class MyCourseCardView extends AbstractComponent {
    #course = null;
    _callback = {};

    constructor(course) {
        super();
        this.#course = course;
    }

    get template() {
        return createCourseCardTemplate(this.#course);
    }

    setDeleteClickHandler(callback) {
        this._callback.deleteClick = callback;

        this.element.querySelector('.btn-delete').addEventListener('click', (evt) => {
            evt.preventDefault();
            this._callback.deleteClick(this.#course.title); 
        });
    }
    setCourseActionClickHandler(callback) {
        this._callback.actionClick = callback;
        this.element.querySelector('.btn-course').addEventListener('click', (evt) => {
            evt.preventDefault();
            this._callback.actionClick(this.#course); 
        });
    }
}