export default class CoursesModel {
    #apiService = null;
    #courses = [];
    #materials = [];
    #quizzesByCourseId = new Map();

    constructor(apiService) {
        this.#apiService = apiService;
    }

    async init() {
        try {
            const [courses, materials] = await Promise.all([
                this.#apiService.courses,
                this.#apiService.materials,
            ]);

            this.#courses = courses;
            this.#materials = materials;
            this.#quizzesByCourseId.clear();
        } catch (error) {
            this.#courses = [];
            this.#materials = [];
            this.#quizzesByCourseId.clear();
            console.error("Ошибка загрузки данных:", error);
        }
    }

    getCourse(courseId) {
        return this.#courses.find((course) => course.id === courseId) ?? null;
    }

    getMyCourses() {
        return this.#courses.filter((course) => course.isEnrolled === true);
    }

    getAllCourses() {
        return this.#courses.filter((course) => course.isEnrolled === false);
    }

    getCreatedCourses() {
        return this.#courses.filter((course) => course.isOwner === true);
    }

    async getEditableCourseDraft(courseId) {
        return this.#apiService.getCourseEditorData(courseId);
    }

    getCourseContent(courseId) {
        const content = this.#materials
            .filter((item) => item.course_id === courseId)
            .sort((a, b) => a.pageNumber - b.pageNumber);

        if (content.length > 0) {
            return content;
        }

        return [
            {
                pageTitle: "Нет материалов",
                text: "Материалы для этого курса еще не добавлены.",
                videoUrl: "",
                pageNumber: 1,
            },
        ];
    }

    async getCourseQuizBundle(courseId) {
        if (this.#quizzesByCourseId.has(courseId)) {
            return this.#quizzesByCourseId.get(courseId);
        }

        const bundle = await this.#apiService.getCourseQuizzes(courseId);
        this.#quizzesByCourseId.set(courseId, bundle);
        return bundle;
    }

    async submitCourseQuiz(courseId, payload) {
        const result = await this.#apiService.submitCourseQuiz(courseId, payload);

        if (this.#quizzesByCourseId.has(courseId)) {
            const bundle = this.#quizzesByCourseId.get(courseId);

            if (payload.quizType === "final" && bundle.finalQuiz) {
                bundle.finalQuiz.lastResult = result;
            }

            if (payload.quizType === "lesson") {
                const lessonQuiz = bundle.lessonQuizzes?.find((quiz) => quiz.lessonOrder === payload.lessonOrder);
                if (lessonQuiz) {
                    lessonQuiz.lastResult = result;
                }
            }
        }

        return result;
    }

    async createCourse(payload) {
        const response = await this.#apiService.createCourse(payload);
        return this.#applyCourseResponse(response, "Не удалось создать курс.");
    }

    async editCreatedCourse(courseId, payload) {
        const response = await this.#apiService.editCourseContent(courseId, payload);
        return this.#applyCourseResponse(response, "Не удалось обновить курс.");
    }

    async enrollCourse(courseId) {
        const course = this.getCourse(courseId);
        if (!course) {
            return;
        }

        course.isEnrolled = true;
        course.percent = 0;
        course.action = "Начать";

        try {
            await this.#apiService.updateCourse(course);
        } catch {}
    }

    async removeCourse(courseId) {
        const course = this.getCourse(courseId);
        if (!course) {
            return;
        }

        course.isEnrolled = false;
        course.percent = 0;

        try {
            await this.#apiService.updateCourse(course);
        } catch {}
    }

    async updateCourseProgress(courseId, newPercent) {
        const course = this.getCourse(courseId);
        if (!course) {
            return;
        }

        course.percent = newPercent;
        if (newPercent === 100) {
            course.action = "Завершено";
        } else if (newPercent > 0) {
            course.action = "Продолжить";
        } else {
            course.action = "Начать";
        }

        try {
            await this.#apiService.updateCourse(course);
        } catch {}
    }

    #applyCourseResponse(response, errorMessage) {
        const course = response?.course;
        const materials = Array.isArray(response?.materials) ? response.materials : [];

        if (!course) {
            throw new Error(errorMessage);
        }

        this.#courses = [course, ...this.#courses.filter((item) => item.id !== course.id)];
        this.#materials = [
            ...this.#materials.filter((item) => item.course_id !== course.id),
            ...materials,
        ];
        this.#quizzesByCourseId.delete(course.id);

        return course;
    }
}
