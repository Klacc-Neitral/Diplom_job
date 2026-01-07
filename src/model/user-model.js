import { USER_DATA } from "../mock/user.js";
export default class UserModel {
    #user = null;

    constructor(userData) {
        this.#user = userData;
    }

    getUser() {
        return this.#user;
    }

    // Добавьте этот метод
    updateUser(update) {
        // Объединяем старые данные с новыми
        this.#user = { ...this.#user, ...update };
        return this.#user;
    }
}

