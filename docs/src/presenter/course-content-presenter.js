import { render, RenderPosition, remove } from "../framework/render.js";
import CourseContentView from "../view/course-content-view.js";

export default class CourseContentPresenter {
    #container = null;
    #coursesModel = null;
    #userModel = null;
    #courseData = null;
    #courseContentComponent = null;
    #coursePages = [];
    #currentPageIndex = 0;
    #quizBundle = { lessonQuizzes: [], finalQuiz: null, passPercent: 60 };
    #quizResults = new Map();
    #activeQuizKey = null;
    #isQuizLoading = true;
    #isDestroyed = false;

    constructor(container, coursesModel, userModel, courseData) {
        this.#container = container;
        this.#coursesModel = coursesModel;
        this.#userModel = userModel;
        this.#courseData = courseData;
        this.#coursePages = this.#coursesModel.getCourseContent(courseData.id);

        const totalPages = this.#coursePages.length;
        if (courseData.percent === 100) {
            this.#currentPageIndex = totalPages - 1;
        } else if (courseData.percent > 0) {
            this.#currentPageIndex = Math.floor((courseData.percent / 100) * totalPages);
            if (this.#currentPageIndex >= totalPages) {
                this.#currentPageIndex = totalPages - 1;
            }
        } else {
            this.#currentPageIndex = 0;
        }
    }

    init(onBackToProfile) {
        this.onBackToProfile = onBackToProfile;
        this.#renderCoursePage();
        this.#loadQuizzes();
    }

    destroy() {
        this.#isDestroyed = true;
        if (this.#courseContentComponent) {
            remove(this.#courseContentComponent);
            this.#courseContentComponent = null;
        }
    }

    async #loadQuizzes() {
        try {
            this.#quizBundle = await this.#coursesModel.getCourseQuizBundle(this.#courseData.id);
            this.#hydrateQuizResults();
        } catch (error) {
            console.error("Не удалось загрузить викторины курса:", error);
            this.#quizBundle = { lessonQuizzes: [], finalQuiz: null, passPercent: 60 };
        } finally {
            this.#isQuizLoading = false;
            if (!this.#isDestroyed) {
                this.#renderCoursePage();
            }
        }
    }

    #hydrateQuizResults() {
        this.#quizResults.clear();

        this.#quizBundle.lessonQuizzes?.forEach((quiz) => {
            if (quiz.lastResult) {
                this.#quizResults.set(quiz.key, quiz.lastResult);
            }
        });

        if (this.#quizBundle.finalQuiz?.lastResult) {
            this.#quizResults.set(this.#quizBundle.finalQuiz.key, this.#quizBundle.finalQuiz.lastResult);
        }
    }

    #getCurrentPage() {
        return this.#coursePages[this.#currentPageIndex];
    }

    #calculateProgress(index) {
        const totalSteps = this.#coursePages.length;
        const currentStep = index + 1;
        return Math.round((currentStep / totalSteps) * 100);
    }

    #findLessonQuiz(pageNumber) {
        return this.#quizBundle.lessonQuizzes?.find((quiz) => quiz.lessonOrder === pageNumber) || null;
    }

    #getQuizResult(quizKey) {
        return this.#quizResults.get(quizKey) || null;
    }

    #getQuizMetaByKey(quizKey) {
        const lessonQuiz = this.#quizBundle.lessonQuizzes?.find((quiz) => quiz.key === quizKey);
        if (lessonQuiz) {
            return lessonQuiz;
        }

        if (this.#quizBundle.finalQuiz?.key === quizKey) {
            return this.#quizBundle.finalQuiz;
        }

        return null;
    }

    #buildQuizBlocks() {
        const currentPage = this.#getCurrentPage();
        const isLastPage = currentPage.pageNumber === this.#coursePages.length;
        const lessonQuiz = this.#findLessonQuiz(currentPage.pageNumber);
        const quizBlocks = [];

        if (lessonQuiz) {
            quizBlocks.push({
                ...lessonQuiz,
                type: "lesson",
                isVisible: this.#activeQuizKey === lessonQuiz.key,
                lastResult: this.#getQuizResult(lessonQuiz.key),
            });
        }

        if (isLastPage && this.#quizBundle.finalQuiz) {
            quizBlocks.push({
                ...this.#quizBundle.finalQuiz,
                type: "final",
                isVisible: this.#activeQuizKey === this.#quizBundle.finalQuiz.key,
                lastResult: this.#getQuizResult(this.#quizBundle.finalQuiz.key),
            });
        }

        return quizBlocks;
    }

    #getNextButtonState(quizBlocks) {
        if (this.#isQuizLoading) {
            return { label: "Загружаем тесты...", disabled: true };
        }

        const currentPage = this.#getCurrentPage();
        const isLastPage = currentPage.pageNumber === this.#coursePages.length;
        const pendingLessonQuiz = quizBlocks.find((quiz) => quiz.type === "lesson" && !quiz.lastResult);

        if (pendingLessonQuiz) {
            return {
                label: pendingLessonQuiz.isVisible ? "Сначала проверь ответы" : "Открыть тест",
                disabled: pendingLessonQuiz.isVisible,
            };
        }

        if (isLastPage) {
            const pendingFinalQuiz = quizBlocks.find((quiz) => quiz.type === "final" && !quiz.lastResult);
            if (pendingFinalQuiz) {
                return {
                    label: pendingFinalQuiz.isVisible ? "Сначала проверь ответы" : "Перейти к экзамену",
                    disabled: pendingFinalQuiz.isVisible,
                };
            }

            return { label: "Завершить курс", disabled: false };
        }

        return { label: "Далее →", disabled: false };
    }

    #renderCoursePage() {
        const currentPage = this.#getCurrentPage();
        const quizBlocks = this.#buildQuizBlocks();
        const nextButton = this.#getNextButtonState(quizBlocks);

        if (this.#courseContentComponent) {
            remove(this.#courseContentComponent);
        }

        this.#courseContentComponent = new CourseContentView({
            courseTitle: this.#courseData.title,
            pageData: currentPage,
            totalPages: this.#coursePages.length,
            quizBlocks,
            nextButton,
        });

        this.#courseContentComponent.setPrevClickHandler(this.#handlePrevClick);
        this.#courseContentComponent.setNextClickHandler(this.#handleNextClick);
        this.#courseContentComponent.setBackClickHandler(this.#handleBackClick);
        this.#courseContentComponent.setQuizOpenHandler(this.#handleQuizOpen);
        this.#courseContentComponent.setQuizSubmitHandler(this.#handleQuizSubmit);

        render(this.#courseContentComponent, this.#container, RenderPosition.BEFOREEND);
    }

    #handlePrevClick = () => {
        if (this.#currentPageIndex > 0) {
            this.#activeQuizKey = null;
            this.#currentPageIndex--;
            this.#updateProgressAndRender();
        }
    };

    #handleNextClick = () => {
        const currentPage = this.#getCurrentPage();
        const isLastPage = this.#currentPageIndex === this.#coursePages.length - 1;
        const lessonQuiz = this.#findLessonQuiz(currentPage.pageNumber);

        if (lessonQuiz && !this.#getQuizResult(lessonQuiz.key)) {
            this.#activeQuizKey = lessonQuiz.key;
            this.#renderCoursePage();
            return;
        }

        if (isLastPage && this.#quizBundle.finalQuiz && !this.#getQuizResult(this.#quizBundle.finalQuiz.key)) {
            this.#activeQuizKey = this.#quizBundle.finalQuiz.key;
            this.#renderCoursePage();
            return;
        }

        if (isLastPage) {
            this.#coursesModel.updateCourseProgress(this.#courseData.id, 100);
            this.#handleBackClick();
            return;
        }

        this.#activeQuizKey = null;
        this.#currentPageIndex++;
        this.#updateProgressAndRender();
    };

    #handleQuizOpen = (quizKey) => {
        this.#activeQuizKey = quizKey;
        this.#renderCoursePage();
    };

    #handleQuizSubmit = async (quizKey, answers) => {
        const quiz = this.#getQuizMetaByKey(quizKey);
        if (!quiz) {
            return;
        }

        const unansweredQuestions = answers.filter((answer) => answer.answerIndex === null);
        if (unansweredQuestions.length > 0) {
            window.alert("Ответь на все вопросы, прежде чем проверять тест.");
            return;
        }

        try {
            const result = await this.#coursesModel.submitCourseQuiz(this.#courseData.id, {
                quizType: quiz.quizType,
                lessonOrder: quiz.lessonOrder,
                answers,
            });
            this.#quizResults.set(quiz.key, result);
            this.#activeQuizKey = null;
            this.#renderCoursePage();
        } catch (error) {
            console.error("Не удалось отправить ответы викторины:", error);
            window.alert("Не удалось проверить ответы. Попробуй ещё раз.");
        }
    };

    #handleBackClick = () => {
        this.destroy();
        this.onBackToProfile();
    };

    async #updateProgressAndRender() {
        let newProgress = this.#calculateProgress(this.#currentPageIndex);
        if (newProgress > 100) {
            newProgress = 100;
        }

        await this.#coursesModel.updateCourseProgress(this.#courseData.id, newProgress);
        this.#renderCoursePage();
    }
}
