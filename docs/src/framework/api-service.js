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

    async updateUser(user) {
        const response = await this.#load({
            url: `users/${this.#getUserId()}/profile`,
            method: Method.PUT,
            body: JSON.stringify(user),
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
        return this.#userModel.getUser()?.user_id;
    }

    async #load({
        url,
        method = Method.GET,
        body = null,
        headers = new Headers(),
    }) {
        const response = await fetch(`${this.#endPoint}/${url}`, { method, body, headers });
        if (!response.ok) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }
        return response;
    }

    static parseResponse(response) {
        return response.json();
    }
}
