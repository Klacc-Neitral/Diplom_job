import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const workspaceRoot = process.cwd();
const coursesModelUrl = pathToFileURL(path.join(workspaceRoot, "docs/src/model/courses-model.js")).href;

const { default: CoursesModel } = await import(coursesModelUrl);

function createApiServiceStub() {
    const calls = {
        getCourseQuizzes: 0,
        deleteCourse: [],
        createCourse: [],
        editCourseContent: [],
        updateCourse: [],
    };

    const stub = {
        calls,
        courses: Promise.resolve([
            { id: 1, title: "Enrolled course", isEnrolled: true, isOwner: false, percent: 10, action: "Продолжить" },
            { id: 2, title: "Catalog course", isEnrolled: false, isOwner: true, percent: 0, action: "Начать" },
        ]),
        materials: Promise.resolve([
            { course_id: 1, pageTitle: "Page 1", text: "Text", videoUrl: "", pageNumber: 2 },
            { course_id: 1, pageTitle: "Page 0", text: "Intro", videoUrl: "", pageNumber: 1 },
        ]),
        async getCourseQuizzes(courseId) {
            calls.getCourseQuizzes += 1;
            return {
                lessonQuizzes: [{ key: "lesson-1", lessonOrder: 1, lastResult: null }],
                finalQuiz: { key: "final", lastResult: null },
                passPercent: 60,
                courseId,
            };
        },
        async submitCourseQuiz(courseId, payload) {
            return { courseId, ...payload, passed: true };
        },
        async createCourse(payload) {
            calls.createCourse.push(payload);
            return {
                course: { id: 3, title: payload.title, isEnrolled: true, isOwner: true, percent: 0, action: "Начать" },
                materials: [{ course_id: 3, pageTitle: "Intro", text: "Body", videoUrl: "", pageNumber: 1 }],
            };
        },
        async editCourseContent(courseId, payload) {
            calls.editCourseContent.push({ courseId, payload });
            return {
                course: { id: courseId, title: payload.title, isEnrolled: true, isOwner: true, percent: 0, action: "Начать" },
                materials: [{ course_id: courseId, pageTitle: "Updated", text: "Body", videoUrl: "", pageNumber: 1 }],
            };
        },
        async updateCourse(course) {
            calls.updateCourse.push({ ...course });
            return { ok: true };
        },
        async deleteCourse(courseId) {
            calls.deleteCourse.push(courseId);
            return { ok: true, deletedCourseId: courseId };
        },
        async getCourseEditorData(courseId) {
            return { id: courseId, title: "Draft" };
        },
    };

    return stub;
}

export async function runCoursesModelTests() {
    const apiService = createApiServiceStub();
    const model = new CoursesModel(apiService);

    await model.init();

    assert.equal(model.getMyCourses().length, 1);
    assert.equal(model.getAllCourses().length, 1);
    assert.equal(model.getCreatedCourses().length, 1);
    assert.deepEqual(model.getCourseContent(1).map((item) => item.pageNumber), [1, 2]);

    const firstBundle = await model.getCourseQuizBundle(2);
    const secondBundle = await model.getCourseQuizBundle(2);
    assert.equal(apiService.calls.getCourseQuizzes, 1);
    assert.equal(firstBundle, secondBundle);

    const result = await model.submitCourseQuiz(2, { quizType: "final", lessonOrder: null });
    assert.equal(result.passed, true);
    assert.deepEqual(secondBundle.finalQuiz.lastResult, result);

    const createdCourse = await model.createCourse({ title: "Created course" });
    assert.equal(createdCourse.id, 3);
    assert.equal(model.getCourse(3).title, "Created course");

    const editedCourse = await model.editCreatedCourse(3, { title: "Edited course" });
    assert.equal(editedCourse.title, "Edited course");
    assert.equal(model.getCourse(3).title, "Edited course");

    await model.deleteCourse(3);
    assert.equal(model.getCourse(3), null);
    assert.deepEqual(apiService.calls.deleteCourse, [3]);

    await model.enrollCourse(2);
    assert.equal(model.getCourse(2).isEnrolled, true);
    assert.equal(model.getCourse(2).action, "Начать");

    await model.updateCourseProgress(2, 100);
    assert.equal(model.getCourse(2).percent, 100);
    assert.equal(model.getCourse(2).action, "Завершено");

    await model.removeCourse(2);
    assert.equal(model.getCourse(2).isEnrolled, false);
}
