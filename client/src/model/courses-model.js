export default class CoursesModel {
    #apiService = null;
    #courses = []; 
    #materials = []; 

    constructor(apiService) {
        this.#apiService = apiService;
    }

    async init() {
        try {

            const [courses, materials] = await Promise.all([
                this.#apiService.courses,
                this.#apiService.materials
            ]);

            this.#courses = courses;
            this.#materials = materials;
            
        } catch(err) {
            this.#courses = [];
            this.#materials = [];
            console.error('Ошибка загрузки данных:', err);
        }
    }

    getMyCourses() {
        return this.#courses.filter(course => course.isEnrolled === true);
    }

    getAllCourses() {
        return this.#courses.filter(course => course.isEnrolled === false);
    }

    getCourseContent(courseTitle) {

        const content = this.#materials.filter(item => item.course_name === courseTitle);


        content.sort((a, b) => a.pageNumber - b.pageNumber);

        if (content.length > 0) {
            return content;
        } else {
            return [{
                pageTitle: "Нет материалов", 
                text: "Материалы для этого курса еще не добавлены.", 
                pageNumber: 1
            }];
        }
    }


    async enrollCourse(courseTitle) {
        const course = this.#courses.find(c => c.title === courseTitle);
        if (course) {
            course.isEnrolled = true;
            course.percent = 0; 
            course.action = "Начать";
            try { await this.#apiService.updateCourse(course); } catch (err) {}
        }
    }

    async removeCourse(courseTitle) {
        const course = this.#courses.find(c => c.title === courseTitle);
        if (course) {
            course.isEnrolled = false;
            course.percent = 0;
            try { await this.#apiService.updateCourse(course); } catch (err) {}
        }
    }

    async updateCourseProgress(courseTitle, newPercent) {
        const course = this.#courses.find(c => c.title === courseTitle);
        if (course) {
            course.percent = newPercent;
            if (newPercent === 100) course.action = 'Завершено';
            else if (newPercent > 0) course.action = 'Продолжить';
            else course.action = 'Начать';
            try { await this.#apiService.updateCourse(course); } catch (err) {}
        }
    }
}