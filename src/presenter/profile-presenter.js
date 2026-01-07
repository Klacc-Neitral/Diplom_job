import { render, RenderPosition } from "../framework/render.js";
import HeaderView from "../view/header-view.js";
import FooterView from "../view/footer-view.js";
import ProfileContainerView from "../view/profile-container-view.js";
import TabNavigationView from "../view/tab-navigation-view.js";
import UserInfoView from "../view/user-info-view.js";
import MyCoursesContainerView from "../view/my-courses-container-view.js";
import MyCourseCardView from "../view/my-course-card-view.js";
import AllCoursesContainerView from "../view/all-courses-container-view.js";
import AllCourseCardView from "../view/all-course-card-view.js";
import EditModalView from "../view/edit-modal-view.js";
import FilterView from "../view/filter-view.js";
import SearchInputView from "../view/search-input-view.js";
import CourseContentPresenter from "./course-content-presenter.js";

export default class ProfilePresenter {
    #bodyContainer = null;
    #coursesModel = null;
    #userModel = null;

    #profileContainerComponent = new ProfileContainerView();
    #tabNavigationComponent = new TabNavigationView();
    #courseContentPresenter = null;
    

    #myCoursesContainerComponent = new MyCoursesContainerView();
    #filterComponent = null;


    #allCoursesContainerComponent = new AllCoursesContainerView();
    #allCoursesSearchComponent = null; 
    
    #userInfoComponent = null;
    #modalComponent = null;


    #currentSearchQuery = ''; 
    #allCoursesSearchQuery = ''; 
    
    #currentFilters = {
        started: false,
        notStarted: false
    };

    constructor(bodyContainer, coursesModel, userModel) {
        this.#bodyContainer = bodyContainer;
        this.#coursesModel = coursesModel;
        this.#userModel = userModel;
    }

    init() {
        this.#renderHeader();
        this.#renderProfileLayout();
        this.#renderFooter();
    }

    #renderHeader() {
        render(new HeaderView(), this.#bodyContainer, RenderPosition.AFTERBEGIN);
    }

    #renderFooter() {
        render(new FooterView(), this.#bodyContainer, RenderPosition.BEFOREEND);
    }

    #renderProfileLayout() {
        render(this.#profileContainerComponent, this.#bodyContainer);

        const cardContainer = this.#profileContainerComponent.cardContainer;
        render(this.#tabNavigationComponent, cardContainer, RenderPosition.AFTERBEGIN);

        this.#tabNavigationComponent.setTabClickHandler((tabName) => {
            this.#switchTab(tabName);
        });

       
        this.#filterComponent = new FilterView();
        this.#filterComponent.setSearchInputHandler((query) => {
            this.#currentSearchQuery = query.toLowerCase();
            this.#renderMyCoursesList();
        });
        this.#filterComponent.setFilterChangeHandler((filters) => {
            this.#currentFilters = filters;
            this.#renderMyCoursesList();
        });

      
        this.#allCoursesSearchComponent = new SearchInputView();
        this.#allCoursesSearchComponent.setSearchHandler((query) => {
            this.#allCoursesSearchQuery = query.toLowerCase();
            this.#renderAllCoursesList();
        });

        this.#renderMyCoursesTab();
    }

    #clearContent() {
        this.#profileContainerComponent.contentContainer.innerHTML = '';
        this.#myCoursesContainerComponent.element.innerHTML = '';
        
        const allCoursesList = this.#allCoursesContainerComponent.getListContainer();
        if(allCoursesList) allCoursesList.innerHTML = '';
    }



  #renderMyCoursesTab() {
    this.#clearContent();
    const contentContainer = this.#profileContainerComponent.contentContainer;
    const user = this.#userModel.getUser();

    this.#userInfoComponent = new UserInfoView(user);
    
    this.#userInfoComponent.setEditClickHandler(() => this.#openModal());

 
    this.#userInfoComponent.setAvatarClickHandler((base64Image) => {
        this.#userModel.updateUser({ avatar: base64Image });
        this.#renderMyCoursesTab(); 
    });

    render(this.#userInfoComponent, contentContainer);
    render(this.#filterComponent, contentContainer);
    render(this.#myCoursesContainerComponent, contentContainer);
    
    this.#renderMyCoursesList();
}
#renderMyCoursesList() {
    this.#myCoursesContainerComponent.element.innerHTML = '';
    let courses = this.#coursesModel.getMyCourses();

    if (this.#currentSearchQuery) {
        courses = courses.filter(course => 
            course.title.toLowerCase().includes(this.#currentSearchQuery)
        );
    }

    const { started, notStarted } = this.#currentFilters;
    if (started || notStarted) {
        courses = courses.filter(course => {
            const isStarted = course.percent > 0;
            const isNotStarted = course.percent === 0;
            if (started && isStarted) return true;
            if (notStarted && isNotStarted) return true;
            return false;
        });
    }

    if (courses.length === 0) {
        this.#myCoursesContainerComponent.element.innerHTML = 
            '<p style="color: white; padding: 20px; grid-column: 1/-1; text-align: center;">Курсы не найдены.</p>';
    } else {
        courses.forEach(course => {
            const courseCard = new MyCourseCardView(course); 
            
            courseCard.setDeleteClickHandler((courseTitle) => {
                this.#handleDeleteCourse(courseTitle);
            });
            
            courseCard.setCourseActionClickHandler((courseData) => {
                this.#handleCourseAction(courseData);
            });
            
            render(courseCard, this.#myCoursesContainerComponent.element);
        }); 
    }
}


    #renderAllCoursesTab() {
        this.#clearContent();
        const contentContainer = this.#profileContainerComponent.contentContainer;

        render(this.#allCoursesContainerComponent, contentContainer);
        

        const listContainer = this.#allCoursesContainerComponent.getListContainer();
  
        render(this.#allCoursesSearchComponent, listContainer, RenderPosition.BEFOREBEGIN);


        this.#renderAllCoursesList();
    }

    #renderAllCoursesList() {
        const listContainer = this.#allCoursesContainerComponent.getListContainer();
        listContainer.innerHTML = '';

        let allCourses = this.#coursesModel.getAllCourses();

      
        if (this.#allCoursesSearchQuery) {
            allCourses = allCourses.filter(course => 
                course.title.toLowerCase().includes(this.#allCoursesSearchQuery)
            );
        }

        if (allCourses.length === 0) {
            listContainer.innerHTML = '<p style="color: white; padding: 20px; text-align: center;">Ничего не найдено.</p>';
        } else {
            allCourses.forEach(course => {
                const courseCard = new AllCourseCardView(course);
                courseCard.setEnrollClickHandler((courseTitle) => {
                    this.#handleEnrollCourse(courseTitle);
                });
                render(courseCard, listContainer);
            });
        }
    }

   

    #switchTab(tabName) {
        if (tabName === 'my-courses') {
            this.#renderMyCoursesTab();
        } else if (tabName === 'all-courses') {
            this.#renderAllCoursesTab();
        }
    }

    #openModal() {
        const user = this.#userModel.getUser();
        this.#modalComponent = new EditModalView(user);
        
        this.#modalComponent.setCloseClickHandler(() => this.#closeModal());
        
        this.#modalComponent.setFormSubmitHandler((updatedData) => {
            this.#handleUserUpdate(updatedData);
        });
        
        render(this.#modalComponent, this.#bodyContainer);
    }
    #handleUserUpdate = (updatedData) => {
        this.#userModel.updateUser(updatedData);
        this.#closeModal();
        this.#renderMyCoursesTab();
    };

    #closeModal() {
        this.#modalComponent.element.remove();
        this.#modalComponent.removeElement();
        this.#modalComponent = null;
    }
    #handleCourseAction(courseData) {
       
        this.#profileContainerComponent.element.style.display = 'none';

       
        this.#courseContentPresenter = new CourseContentPresenter(
            this.#bodyContainer,
            this.#coursesModel,
            courseData
        );
        
        
        this.#courseContentPresenter.init(this.#handleBackToProfile);
    }

    #handleBackToProfile = () => {
        this.#profileContainerComponent.element.style.display = 'block';

        this.#courseContentPresenter = null;

        this.#renderMyCoursesList();
    };
    async #handleDeleteCourse(courseTitle) {
        await this.#coursesModel.removeCourse(courseTitle);
        this.#renderMyCoursesList();
    }

    async #handleEnrollCourse(courseTitle) {
        await this.#coursesModel.enrollCourse(courseTitle);
        this.#renderAllCoursesList();
    }
}