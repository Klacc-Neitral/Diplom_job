import { APP_CONFIG } from "../config.js";

const Method = {
    GET: "GET",
    PUT: "PUT",
    POST: "POST",
};

export default class ApiService {
    #endPoint = APP_CONFIG.apiBaseUrl;
    #userModel = null;

    constructor(endPoint, userModel) {
        this.#endPoint = endPoint;
        this.#userModel = userModel;
    }

    async syncUser(user) {
        const response = await this.#load({
            url: "auth/platform",
            method: Method.POST,
            body: JSON.stringify(user),
            headers: new Headers({ "Content-Type": "application/json" }),
        });

        return ApiService.parseResponse(response);
    }

    async authWithTelegram(user) {
        const response = await this.#load({
            url: "auth/telegram",
            method: Method.POST,
            body: JSON.stringify(user),
            headers: new Headers({ "Content-Type": "application/json" }),
        });

        return ApiService.parseResponse(response);
    }

    async login(credentials) {
        const response = await this.#load({
            url: "auth/login",
            method: Method.POST,
            body: JSON.stringify(credentials),
            headers: new Headers({ "Content-Type": "application/json" }),
        });

        return ApiService.parseResponse(response);
    }

    async register(payload) {
        const response = await this.#load({
            url: "auth/register",
            method: Method.POST,
            body: JSON.stringify(payload),
            headers: new Headers({ "Content-Type": "application/json" }),
        });

        return ApiService.parseResponse(response);
    }

    async sendVerificationCode(email) {
        const response = await this.#load({
            url: "auth/send-verification-code",
            method: Method.POST,
            body: JSON.stringify({ email }),
            headers: new Headers({ "Content-Type": "application/json" }),
        });

        return ApiService.parseResponse(response);
    }

    async getAuthSettings() {
        const response = await this.#load({
            url: "auth/settings",
            method: Method.GET,
        });

        return ApiService.parseResponse(response);
    }

    async checkEmailAvailability(email) {
        const response = await this.#load({
            url: `auth/check-email?email=${encodeURIComponent(email)}`,
            method: Method.GET,
        });

        return ApiService.parseResponse(response);
    }

    async getCurrentUser() {
        const response = await this.#load({
            url: "auth/me",
            method: Method.GET,
        });

        return ApiService.parseResponse(response);
    }

    async updateUser(user) {
        const response = await this.#load({
            url: `users/${this.#getUserId()}/profile`,
            method: Method.PUT,
            body: JSON.stringify(user),
            headers: new Headers({ "Content-Type": "application/json" }),
        });

        return ApiService.parseResponse(response);
    }

    async searchUsers(query) {
        const response = await this.#load({
            url: `users/search?q=${encodeURIComponent(query)}`,
            method: Method.GET,
        });

        return ApiService.parseResponse(response);
    }

    async getPublicProfile(userId) {
        const response = await this.#load({
            url: `users/${userId}/public-profile`,
            method: Method.GET,
        });

        return ApiService.parseResponse(response);
    }

    async getCourseQuizzes(courseId) {
        const response = await this.#load({
            url: `users/${this.#getUserId()}/courses/${courseId}/quizzes`,
            method: Method.GET,
        });

        return ApiService.parseResponse(response);
    }

    async submitCourseQuiz(courseId, payload) {
        const response = await this.#load({
            url: `users/${this.#getUserId()}/courses/${courseId}/quizzes/submit`,
            method: Method.POST,
            body: JSON.stringify(payload),
            headers: new Headers({ "Content-Type": "application/json" }),
        });

        return ApiService.parseResponse(response);
    }

    get courses() {
        return this.#load({ url: `users/${this.#getUserId()}/courses` })
            .then(ApiService.parseResponse);
    }

    get materials() {
        return this.#load({ url: `users/${this.#getUserId()}/materials` })
            .then(ApiService.parseResponse);
    }

    async updateCourse(course) {
        const response = await this.#load({
            url: `users/${this.#getUserId()}/courses/${course.id}`,
            method: Method.PUT,
            body: JSON.stringify(course),
            headers: new Headers({ "Content-Type": "application/json" }),
        });

        return ApiService.parseResponse(response);
    }

    #getUserId() {
        return this.#userModel?.getUser?.()?.user_id;
    }

    #getAuthToken() {
        try {
            return window.localStorage.getItem("auth_token");
        } catch {
            return null;
        }
    }

    async #load({
        url,
        method = Method.GET,
        body = null,
        headers = new Headers(),
    }) {
        const token = this.#getAuthToken();
        if (token && !headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        const response = await fetch(`${this.#endPoint}/${url}`, { method, body, headers });
        if (!response.ok) {
            const error = new Error(await ApiService.parseError(response));
            error.status = response.status;
            throw error;
        }

        return response;
    }

    static parseResponse(response) {
        return response.json();
    }

    static async parseError(response) {
        try {
            const payload = await response.json();
            return payload.error || `${response.status}: ${response.statusText}`;
        } catch {
            return `${response.status}: ${response.statusText}`;
        }
    }
}
