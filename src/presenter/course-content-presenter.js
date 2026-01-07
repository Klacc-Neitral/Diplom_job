import { render, RenderPosition, remove } from "../framework/render.js";
import CourseContentView from "../view/course-content-view.js";

export default class CourseContentPresenter {
    #container = null;
    #coursesModel = null;
    #courseData = null;
    #courseContentComponent = null;

    #currentPageIndex = 0;
    #coursePages = []; 

    constructor(container, coursesModel, courseData) {
        this.#container = container;
        this.#coursesModel = coursesModel;
        this.#courseData = courseData;
        
      
        this.#coursePages = this.#coursesModel.getCourseContent(courseData.title);

        const totalPages = this.#coursePages.length;
        
        if (courseData.percent === 100) {
            this.#currentPageIndex = totalPages - 1;
        } else if (courseData.percent > 0) {
            this.#currentPageIndex = Math.floor((courseData.percent / 100) * totalPages);
            if(this.#currentPageIndex >= totalPages) this.#currentPageIndex = totalPages - 1;
        } else {
            this.#currentPageIndex = 0;
        }
    }

    init(onBackToProfile) {
        this.onBackToProfile = onBackToProfile;
        this.#renderCoursePage();
    }
    
    #calculateProgress(index) {
        const totalSteps = this.#coursePages.length;
        const currentStep = index + 1;
        return Math.round((currentStep / totalSteps) * 100);
    }

    #renderCoursePage() {
        const totalPages = this.#coursePages.length;
        const currentPageData = this.#coursePages[this.#currentPageIndex];

        if (this.#courseContentComponent) {
            remove(this.#courseContentComponent);
        }

        this.#courseContentComponent = new CourseContentView(
            this.#courseData.title, 
            currentPageData, 
            totalPages
        );
        
        this.#courseContentComponent.setPrevClickHandler(this.#handlePrevClick);
        this.#courseContentComponent.setNextClickHandler(this.#handleNextClick);
        this.#courseContentComponent.setBackClickHandler(this.#handleBackClick);
        
        render(this.#courseContentComponent, this.#container, RenderPosition.BEFOREEND);
    }

    #handlePrevClick = () => {
        if (this.#currentPageIndex > 0) {
            this.#currentPageIndex--;
            this.#updateProgressAndRender();
        }
    };

    #handleNextClick = () => {
        if (this.#currentPageIndex === this.#coursePages.length - 1) {
            this.#coursesModel.updateCourseProgress(this.#courseData.title, 100);
            this.#handleBackClick();
            return;
        }

        this.#currentPageIndex++;
        this.#updateProgressAndRender();
    };
    
    #handleBackClick = () => {
        remove(this.#courseContentComponent);
        this.onBackToProfile();
    };
    async #updateProgressAndRender() {
        let newProgress = this.#calculateProgress(this.#currentPageIndex);
        if (newProgress > 100) newProgress = 100;

        await this.#coursesModel.updateCourseProgress(this.#courseData.title, newProgress);
        this.#renderCoursePage();
    }
}