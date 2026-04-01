import { AbstractComponent } from "../framework/view/abstract-component.js";

function createModalTemplate(user) {
    return (
        `<div id="editModal" class="modal" style="display: block;">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Редактировать профиль</h2>
                <form>
                    <div class="form-group">
                        <label for="edit-username">Логин</label>
                        <input type="text" id="edit-username" value="${user.username || ""}">
                    </div>
                    <div class="form-group">
                        <label for="edit-first-name">Имя</label>
                        <input type="text" id="edit-first-name" value="${user.first_name || ""}">
                    </div>
                    <div class="form-group">
                        <label for="edit-last-name">Фамилия</label>
                        <input type="text" id="edit-last-name" value="${user.last_name || ""}">
                    </div>
                    <button type="submit" class="btn btn-save">Сохранить</button>
                </form>
            </div>
        </div>`
    );
}

export default class EditModalView extends AbstractComponent {
    #userModel = null;
    _callback = {};

    constructor(userModel) {
        super();
        this.#userModel = userModel;
    }

    get template() {
        return createModalTemplate(this.#userModel.getUser());
    }

    setCloseClickHandler(callback) {
        this._callback.closeClick = callback;
        this.element.querySelector(".close").addEventListener("click", (evt) => {
            evt.preventDefault();
            this._callback.closeClick();
        });

        window.addEventListener("click", (evt) => {
            if (evt.target === this.element) {
                this._callback.closeClick();
            }
        });
    }

    setFormSubmitHandler(callback) {
        this._callback.formSubmit = callback;
        this.element.querySelector("form").addEventListener("submit", (evt) => {
            evt.preventDefault();

            const updatedData = {
                username: this.element.querySelector("#edit-username").value || null,
                first_name: this.element.querySelector("#edit-first-name").value,
                last_name: this.element.querySelector("#edit-last-name").value,
            };

            this._callback.formSubmit(updatedData);
        });
    }
}
