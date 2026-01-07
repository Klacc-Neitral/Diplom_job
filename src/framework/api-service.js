const Method = {
    GET: 'GET',
    PUT: 'PUT',
    POST: 'POST',
    DELETE: 'DELETE',
};

export default class ApiService {
    #endPoint = 'https://692db100e5f67cd80a4c92ec.mockapi.io';

    constructor(endPoint) {
        this.#endPoint = endPoint;
    }

    get courses() {
        return this.#load({url: 'course'})
            .then(ApiService.parseResponse);
    }

    get materials() {
        return this.#load({url: 'materials'})
            .then(ApiService.parseResponse);
    }

    async updateCourse(course) {
        const response = await this.#load({
            url: `course/${course.id}`,
            method: Method.PUT,
            body: JSON.stringify(course),
            headers: new Headers({'Content-Type': 'application/json'}),
        });

        return await ApiService.parseResponse(response);
    }

    async #load({
        url,
        method = Method.GET,
        body = null,
        headers = new Headers(),
    }) {
        const response = await fetch(`${this.#endPoint}/${url}`, {method, body, headers});
        if (!response.ok) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }
        return response;
    }

    static parseResponse(response) {
        return response.json();
    }
}