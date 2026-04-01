export class UserModel {
    #user = null;
    #listeners = new Set();

    setUser(userData) {
        this.#user = userData;
        this.#notify();
    }

    getUser() {
        return this.#user;
    }

    updateUser(patch) {
        this.#user = { ...this.#user, ...patch };
        this.#notify();
        return this.#user;
    }

    onChange(callback) {
        this.#listeners.add(callback);
        return () => {
            this.#listeners.delete(callback);
        };
    }

    #notify() {
        this.#listeners.forEach((callback) => callback(this.#user));
    }
}

export default UserModel;
