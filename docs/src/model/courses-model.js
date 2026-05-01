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

    getMyCourses() {
        return this.#courses.filter((course) => course.isEnrolled === true);
    }

    getAllCourses() {
        return this.#courses.filter((course) => course.isEnrolled === false);
    }

    getCourseContent(courseTitle) {
        const content = this.#materials
            .filter((item) => item.course_name === courseTitle)
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

    async enrollCourse(courseTitle) {
        const course = this.#courses.find((item) => item.title === courseTitle);
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

    async removeCourse(courseTitle) {
        const course = this.#courses.find((item) => item.title === courseTitle);
        if (!course) {
            return;
        }

        course.isEnrolled = false;
        course.percent = 0;

        try {
            await this.#apiService.updateCourse(course);
        } catch {}
    }

    async updateCourseProgress(courseTitle, newPercent) {
        const course = this.#courses.find((item) => item.title === courseTitle);
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
}
