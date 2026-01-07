import { AbstractComponent } from "../framework/view/abstract-component.js";


function createCourseContentTemplate(courseTitle, pageData, totalPages) {
    const { pageTitle, text, pageNumber } = pageData;

    const isFirstPage = pageNumber === 1;
    const isLastPage = pageNumber === totalPages;

    return (
        `<div class="course-content-view" style="padding: 40px; background: #222; min-height: 80vh; color: white;">
            <div style="margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 20px;">
                <h1 style="color: #64b5f6; margin: 0;">${courseTitle}</h1>
                <span style="color: #888; font-size: 0.9em;">Страница ${pageNumber} из ${totalPages}</span>
            </div>
            
            <div class="course-material" style="padding: 30px; background: #333; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                <h2 style="margin-top: 0; color: #fff;">${pageTitle}</h2>
                <p style="font-size: 1.1em; line-height: 1.8; color: #ddd; white-space: pre-line;">
                    ${text}
                </p>
            </div>

            <div class="course-navigation" style="display: flex; justify-content: space-between; margin-top: 40px;">
                <button class="btn btn-prev" ${isFirstPage ? 'disabled' : ''} 
                    style="padding: 10px 20px; background: #444; border: none; color: white; border-radius: 5px; cursor: pointer; opacity: ${isFirstPage ? 0.5 : 1}">
                    ← Назад
                </button>
                
                <button class="btn btn-next" ${isLastPage ? 'disabled' : ''}
                    style="padding: 10px 20px; background: #64b5f6; border: none; color: black; border-radius: 5px; cursor: pointer;">
                    ${isLastPage ? 'Завершить урок' : 'Далее →'}
                </button>
            </div>

            <button class="btn btn-back" style="margin-top: 30px; background: none; color: #64b5f6; border: none; cursor: pointer; font-size: 14px;">
                Вернуться к списку курсов
            </button>
        </div>`
    );
}

export default class CourseContentView extends AbstractComponent {
    _callback = {};
    #courseTitle = null;
    #pageData = null;
    #totalPages = 0;

    constructor(courseTitle, pageData, totalPages) {
        super();
        this.#courseTitle = courseTitle;
        this.#pageData = pageData; 
        this.#totalPages = totalPages;
    }

    get template() {
        return createCourseContentTemplate(this.#courseTitle, this.#pageData, this.#totalPages);
    }

    setPrevClickHandler(callback) {
        this._callback.prevClick = callback;
        this.element.querySelector('.btn-prev').addEventListener('click', this._callback.prevClick);
    }

    setNextClickHandler(callback) {
        this._callback.nextClick = callback;
        this.element.querySelector('.btn-next').addEventListener('click', this._callback.nextClick);
    }
    
    setBackClickHandler(callback) {
        this._callback.backClick = callback;
        this.element.querySelector('.btn-back').addEventListener('click', this._callback.backClick);
    }
}