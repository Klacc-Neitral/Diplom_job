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
import PeopleDirectoryView from "../view/people-directory-view.js";
import UserSearchResultView from "../view/user-search-result-view.js";
import PublicProfileView from "../view/public-profile-view.js";
import InfoPageView from "../view/info-page-view.js";
import CourseContentPresenter from "./course-content-presenter.js";

const INFO_PAGES = {
    news: {
        badge: "Новости",
        title: "Что нового в ProgTest",
        description: "Короткая страница с самыми важными обновлениями платформы и ближайшими планами.",
        sections: [
            {
                title: "Новые курсы",
                text: "Мы постепенно добавляем новые тестовые и практические курсы, чтобы проще проверять контент, видео и прогресс пользователей."
            },
            {
                title: "Социальные функции",
                text: "Уже доступен поиск пользователей и просмотр их публичного профиля. Дальше можно будет развивать это в полноценный социальный слой."
            },
            {
                title: "Интеграции",
                text: "Платформа готовится к стабильной работе на VPS с Telegram WebApp, VK Mini Apps и Docker-развёртыванием на одном сервере."
            }
        ]
    },
    help: {
        badge: "Помощь",
        title: "Как получить помощь",
        description: "Здесь собрана короткая инструкция, если что-то не работает или пользователь не понимает следующий шаг.",
        sections: [
            {
                title: "Проблемы со входом",
                text: "Сначала проверь email и пароль, затем попробуй обновить страницу. Если проблема сохраняется, стоит посмотреть логи backend и базы данных."
            },
            {
                title: "Не открываются курсы",
                text: "Чаще всего причина в данных курса: пустые lessons, битая картинка или неактуальная ссылка на видео. Это проверяется через SQL и логи API."
            },
            {
                title: "Проблемы на VPS",
                text: "Если сайт открылся, но API не отвечает, проверь nginx, docker compose logs и содержимое .env. Обычно ошибка находится именно там."
            }
        ]
    },
    services: {
        badge: "Услуги",
        title: "Что умеет платформа",
        description: "Простое описание ключевых возможностей текущей версии сервиса.",
        sections: [
            {
                title: "Онлайн-курсы",
                text: "Пользователь может заходить в курс, читать материал, смотреть встроенные видео и сохранять прогресс прямо внутри платформы."
            },
            {
                title: "Профиль и прогресс",
                text: "У каждого пользователя есть свой профиль, список записанных курсов, процент прохождения и публичная карточка для просмотра другими пользователями."
            },
            {
                title: "Интеграции",
                text: "Приложение поддерживает вход через Telegram WebApp, работу с VK Mini Apps и развёртывание через Docker на одном VPS."
            }
        ]
    },
    mission: {
        badge: "Миссия",
        title: "Зачем существует ProgTest",
        description: "Платформа создаётся как понятное и живое пространство для обучения, практики и постепенного роста навыков.",
        sections: [
            {
                title: "Простота входа",
                text: "Нам важно, чтобы пользователь мог быстро зайти в приложение, открыть курс и сразу начать учиться без лишней сложности и перегруза."
            },
            {
                title: "Практичность",
                text: "Контент, прогресс, видео и профили должны работать как единая система, а не как набор случайных экранов и отдельных функций."
            },
            {
                title: "Гибкость развития",
                text: "Архитектура уже позволяет развивать сервис дальше: добавлять новые курсы, интерактивные блоки, поиск людей и дополнительные интеграции."
            }
        ]
    }
};

export default class ProfilePresenter {
    #bodyContainer = null;
    #coursesModel = null;
    #userModel = null;
    #apiService = null;

    #headerComponent = new HeaderView();
    #footerComponent = new FooterView();
    #profileContainerComponent = new ProfileContainerView();
    #tabNavigationComponent = new TabNavigationView();
    #courseContentPresenter = null;
    #myCoursesContainerComponent = new MyCoursesContainerView();
    #filterComponent = null;
    #allCoursesContainerComponent = new AllCoursesContainerView();
    #allCoursesSearchComponent = null;
    #peopleDirectoryComponent = new PeopleDirectoryView();
    #peopleSearchComponent = new SearchInputView("Найти пользователя по имени или логину...", "people-search");
    #userInfoComponent = null;
    #modalComponent = null;
    #currentSearchQuery = "";
    #allCoursesSearchQuery = "";
    #peopleSearchQuery = "";
    #peopleResults = [];
    #selectedPublicProfile = null;
    #selectedPeopleUserId = null;
    #peopleRequestId = 0;
    #infoPageComponent = null;
    #activeTab = "my-courses";

    #currentFilters = {
        started: false,
        notStarted: false
    };

    constructor(bodyContainer, coursesModel, userModel, apiService) {
        this.#bodyContainer = bodyContainer;
        this.#coursesModel = coursesModel;
        this.#userModel = userModel;
        this.#apiService = apiService;

        this.#userModel.onChange(() => {
            if (!this.#profileContainerComponent.element.isConnected) {
                return;
            }

            if (this.#activeTab === "my-courses") {
                this.#renderMyCoursesTab();
            }
        });
    }

    init() {
        this.#renderHeader();
        this.#renderProfileLayout();
        this.#renderFooter();
    }

    #renderHeader() {
        render(this.#headerComponent, this.#bodyContainer, RenderPosition.AFTERBEGIN);
        this.#headerComponent.setLogoClickHandler(this.#handleGoToMyCourses);
        this.#headerComponent.setPageClickHandler(this.#handleOpenInfoPage);
    }

    #renderFooter() {
        render(this.#footerComponent, this.#bodyContainer, RenderPosition.BEFOREEND);
        this.#footerComponent.setLogoClickHandler(this.#handleGoToMyCourses);
        this.#footerComponent.setPageClickHandler(this.#handleOpenInfoPage);
    }

    #showFooter() {
        this.#footerComponent.element.classList.remove("hidden");
    }

    #hideFooter() {
        this.#footerComponent.element.classList.add("hidden");
    }

    #renderProfileLayout() {
        render(this.#profileContainerComponent, this.#bodyContainer);

        const cardContainer = this.#profileContainerComponent.cardContainer;
        render(this.#tabNavigationComponent, cardContainer, RenderPosition.AFTERBEGIN);

        this.#tabNavigationComponent.setTabClickHandler((tabName) => {
            this.#switchTab(tabName);
        });
        this.#tabNavigationComponent.setActiveTab(this.#activeTab);

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

        this.#peopleSearchComponent.setSearchHandler((query) => {
            this.#handlePeopleSearch(query);
        });

        this.#renderMyCoursesTab();
    }

    #clearContent() {
        this.#profileContainerComponent.contentContainer.innerHTML = "";
        this.#myCoursesContainerComponent.element.innerHTML = "";

        const allCoursesList = this.#allCoursesContainerComponent.getListContainer();
        if (allCoursesList) {
            allCoursesList.innerHTML = "";
        }

        if (this.#selectedPublicProfile) {
            this.#selectedPublicProfile.removeElement();
            this.#selectedPublicProfile = null;
        }

        if (this.#infoPageComponent) {
            this.#infoPageComponent.removeElement();
            this.#infoPageComponent = null;
        }
    }

    #renderMyCoursesTab() {
        this.#activeTab = "my-courses";
        this.#tabNavigationComponent.setActiveTab(this.#activeTab);
        this.#showFooter();
        this.#clearContent();

        const contentContainer = this.#profileContainerComponent.contentContainer;

        this.#userInfoComponent = new UserInfoView(this.#userModel);
        this.#userInfoComponent.setEditClickHandler(() => this.#openModal());
        this.#userInfoComponent.setAvatarClickHandler(async (avatarUrl) => {
            const previousUser = this.#userModel.getUser();
            this.#userModel.updateUser({ avatar_url: avatarUrl });

            try {
                const persistedUser = await this.#apiService.updateUser(this.#userModel.getUser());
                this.#userModel.setUser({
                    ...this.#userModel.getUser(),
                    ...persistedUser,
                });
            } catch (error) {
                this.#userModel.setUser(previousUser);
                console.error("Не удалось сохранить аватар:", error);
            }
        });

        render(this.#userInfoComponent, contentContainer);
        render(this.#filterComponent, contentContainer);
        render(this.#myCoursesContainerComponent, contentContainer);

        this.#renderMyCoursesList();
    }

    #renderMyCoursesList() {
        this.#myCoursesContainerComponent.element.innerHTML = "";
        let courses = this.#coursesModel.getMyCourses();

        if (this.#currentSearchQuery) {
            courses = courses.filter((course) =>
                course.title.toLowerCase().includes(this.#currentSearchQuery)
            );
        }

        const { started, notStarted } = this.#currentFilters;
        if (started || notStarted) {
            courses = courses.filter((course) => {
                const isStarted = course.percent > 0;
                const isNotStarted = course.percent === 0;
                if (started && isStarted) return true;
                if (notStarted && isNotStarted) return true;
                return false;
            });
        }

        if (courses.length === 0) {
            this.#myCoursesContainerComponent.element.innerHTML =
                '<p class="empty-state">Курсы не найдены.</p>';
            return;
        }

        courses.forEach((course) => {
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

    #renderAllCoursesTab() {
        this.#activeTab = "all-courses";
        this.#tabNavigationComponent.setActiveTab(this.#activeTab);
        this.#showFooter();
        this.#clearContent();

        const contentContainer = this.#profileContainerComponent.contentContainer;
        render(this.#allCoursesContainerComponent, contentContainer);

        const listContainer = this.#allCoursesContainerComponent.getListContainer();
        render(this.#allCoursesSearchComponent, listContainer, RenderPosition.BEFOREBEGIN);
        this.#allCoursesSearchComponent.setValue(this.#allCoursesSearchQuery);

        this.#renderAllCoursesList();
    }

    #renderAllCoursesList() {
        const listContainer = this.#allCoursesContainerComponent.getListContainer();
        listContainer.innerHTML = "";

        let allCourses = this.#coursesModel.getAllCourses();

        if (this.#allCoursesSearchQuery) {
            allCourses = allCourses.filter((course) =>
                course.title.toLowerCase().includes(this.#allCoursesSearchQuery)
            );
        }

        if (allCourses.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">Пока нет доступных курсов.</p>';
            return;
        }

        allCourses.forEach((course) => {
            const courseCard = new AllCourseCardView(course);
            courseCard.setEnrollClickHandler((courseTitle) => {
                this.#handleEnrollCourse(courseTitle);
            });
            render(courseCard, listContainer);
        });
    }

    #renderPeopleTab() {
        this.#activeTab = "people";
        this.#tabNavigationComponent.setActiveTab(this.#activeTab);
        this.#showFooter();
        this.#clearContent();

        const contentContainer = this.#profileContainerComponent.contentContainer;
        render(this.#peopleDirectoryComponent, contentContainer);
        render(this.#peopleSearchComponent, this.#peopleDirectoryComponent.searchSlot);
        this.#peopleSearchComponent.setValue(this.#peopleSearchQuery);

        this.#renderPeopleResults();

        if (this.#selectedPublicProfile) {
            render(this.#selectedPublicProfile, this.#peopleDirectoryComponent.profileSlot);
        } else if (!this.#peopleSearchQuery) {
            this.#renderPeopleProfilePlaceholder("Выбери пользователя из списка, чтобы открыть его профиль.");
        } else if (this.#peopleSearchQuery.length < 2) {
            this.#renderPeopleProfilePlaceholder("Введите минимум 2 символа для поиска.");
        } else if (!this.#peopleResults.length) {
            this.#renderPeopleProfilePlaceholder("По этому запросу никого не найдено.");
        } else {
            this.#renderPeopleProfilePlaceholder("Нажми на пользователя слева, чтобы посмотреть его профиль.");
        }
    }

    #renderPeopleResults() {
        const resultsContainer = this.#peopleDirectoryComponent.resultsContainer;
        resultsContainer.innerHTML = "";

        if (!this.#peopleSearchQuery) {
            resultsContainer.innerHTML = '<p class="empty-state people-results-empty">Начни вводить имя или логин, чтобы найти пользователя.</p>';
            return;
        }

        if (this.#peopleSearchQuery.length < 2) {
            resultsContainer.innerHTML = '<p class="empty-state people-results-empty">Введите минимум 2 символа.</p>';
            return;
        }

        if (!this.#peopleResults.length) {
            resultsContainer.innerHTML = '<p class="empty-state people-results-empty">Никого не найдено.</p>';
            return;
        }

        this.#peopleResults.forEach((user) => {
            const userCard = new UserSearchResultView(user, user.user_id === this.#selectedPeopleUserId);
            userCard.setOpenClickHandler((userId) => {
                this.#openPublicProfile(userId);
            });
            render(userCard, resultsContainer);
        });
    }

    #renderPeopleProfilePlaceholder(message) {
        this.#peopleDirectoryComponent.profileSlot.innerHTML = `<div class="empty-state people-empty-state">${message}</div>`;
    }

    async #handlePeopleSearch(query) {
        this.#peopleSearchQuery = query.trim();
        this.#peopleResults = [];
        this.#selectedPeopleUserId = null;

        if (this.#selectedPublicProfile) {
            this.#selectedPublicProfile.removeElement();
            this.#selectedPublicProfile = null;
        }

        if (this.#activeTab === "people") {
            this.#renderPeopleResults();
            if (!this.#peopleSearchQuery) {
                this.#renderPeopleProfilePlaceholder("Выбери пользователя из списка, чтобы открыть его профиль.");
            } else if (this.#peopleSearchQuery.length < 2) {
                this.#renderPeopleProfilePlaceholder("Введите минимум 2 символа для поиска.");
            } else {
                this.#renderPeopleProfilePlaceholder("Ищу пользователей...");
            }
        }

        if (this.#peopleSearchQuery.length < 2) {
            return;
        }

        const requestId = ++this.#peopleRequestId;

        try {
            const results = await this.#apiService.searchUsers(this.#peopleSearchQuery);
            if (requestId !== this.#peopleRequestId) {
                return;
            }

            this.#peopleResults = results;

            if (this.#activeTab === "people") {
                this.#renderPeopleResults();
                if (!results.length) {
                    this.#renderPeopleProfilePlaceholder("По этому запросу никого не найдено.");
                } else {
                    this.#renderPeopleProfilePlaceholder("Нажми на пользователя слева, чтобы посмотреть его профиль.");
                }
            }
        } catch (error) {
            if (requestId !== this.#peopleRequestId) {
                return;
            }

            if (this.#activeTab === "people") {
                this.#peopleDirectoryComponent.resultsContainer.innerHTML =
                    '<p class="empty-state people-results-empty">Не удалось загрузить результаты поиска.</p>';
                this.#renderPeopleProfilePlaceholder("Попробуй повторить поиск чуть позже.");
            }
        }
    }

    async #openPublicProfile(userId) {
        this.#selectedPeopleUserId = userId;
        this.#renderPeopleResults();
        this.#renderPeopleProfilePlaceholder("Загружаю профиль...");

        try {
            const profile = await this.#apiService.getPublicProfile(userId);
            if (this.#selectedPeopleUserId !== userId || this.#activeTab !== "people") {
                return;
            }

            this.#selectedPublicProfile = new PublicProfileView(profile);
            this.#peopleDirectoryComponent.profileSlot.innerHTML = "";
            render(this.#selectedPublicProfile, this.#peopleDirectoryComponent.profileSlot);
        } catch (error) {
            if (this.#selectedPeopleUserId !== userId || this.#activeTab !== "people") {
                return;
            }

            this.#renderPeopleProfilePlaceholder("Не удалось открыть профиль пользователя.");
        }
    }

    #switchTab(tabName) {
        if (tabName === "my-courses") {
            this.#renderMyCoursesTab();
        } else if (tabName === "all-courses") {
            this.#renderAllCoursesTab();
        } else if (tabName === "people") {
            this.#renderPeopleTab();
        }
    }

    #renderInfoPage(pageKey) {
        const page = INFO_PAGES[pageKey];
        if (!page) {
            return;
        }

        this.#activeTab = "";
        this.#tabNavigationComponent.setActiveTab(this.#activeTab);
        this.#showFooter();
        this.#clearContent();

        this.#infoPageComponent = new InfoPageView(page);
        this.#infoPageComponent.setBackClickHandler(this.#handleGoToMyCourses);
        render(this.#infoPageComponent, this.#profileContainerComponent.contentContainer);
    }

    #openModal() {
        this.#modalComponent = new EditModalView(this.#userModel);
        this.#modalComponent.setCloseClickHandler(() => this.#closeModal());
        this.#modalComponent.setFormSubmitHandler((updatedData) => {
            this.#handleUserUpdate(updatedData);
        });
        render(this.#modalComponent, this.#bodyContainer);
    }

    #handleUserUpdate = async (updatedData) => {
        this.#userModel.updateUser(updatedData);
        const persistedUser = await this.#apiService.updateUser(this.#userModel.getUser());
        this.#userModel.setUser({
            ...this.#userModel.getUser(),
            ...persistedUser,
            avatar_url: this.#userModel.getUser().avatar_url,
        });
        this.#closeModal();
    };

    #closeModal() {
        if (!this.#modalComponent) {
            return;
        }

        this.#modalComponent.element.remove();
        this.#modalComponent.removeElement();
        this.#modalComponent = null;
    }

    #handleCourseAction(courseData) {
        this.#profileContainerComponent.element.style.display = "none";
        this.#hideFooter();

        this.#courseContentPresenter = new CourseContentPresenter(
            this.#bodyContainer,
            this.#coursesModel,
            this.#userModel,
            courseData
        );

        this.#courseContentPresenter.init(this.#handleBackToProfile);
    }

    #handleBackToProfile = () => {
        this.#profileContainerComponent.element.style.display = "block";
        this.#showFooter();
        this.#courseContentPresenter = null;
        this.#renderMyCoursesList();
    };

    #handleGoToMyCourses = () => {
        if (this.#courseContentPresenter) {
            this.#courseContentPresenter.destroy();
            this.#courseContentPresenter = null;
        }

        this.#profileContainerComponent.element.style.display = "block";
        this.#showFooter();
        this.#renderMyCoursesTab();
    };

    #handleOpenInfoPage = (pageKey) => {
        if (this.#courseContentPresenter) {
            this.#courseContentPresenter.destroy();
            this.#courseContentPresenter = null;
        }

        this.#profileContainerComponent.element.style.display = "block";
        this.#renderInfoPage(pageKey);
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
