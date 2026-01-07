import { AbstractComponent } from "../framework/view/abstract-component.js";


function createModalTemplate(user) {
    return (
        `<div id="editModal" class="modal" style="display: block;">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Редактировать профиль</h2>
                <form>
                    <div class="form-group">
                        <label for="edit-login">Логин</label>
                        <input type="text" id="edit-login" value="${user.login}">
                    </div>
                    <div class="form-group">
                        <label for="edit-email">Email</label>
                        <input type="email" id="edit-email" value="${user.email}">
                    </div>
                    <div class="form-group">
                        <label for="edit-name">Имя</label>
                        <input type="text" id="edit-name" value="${user.name}">
                    </div>
                    <div class="form-group">
                        <label for="edit-surname">Фамилия</label>
                        <input type="text" id="edit-surname" value="${user.surname}">
                    </div>
                    <button type="submit" class="btn btn-save">Сохранить</button>
                </form>
            </div>
        </div>`
    );
}

export default class EditModalView extends AbstractComponent {
    #user = null;
    _callback = {};

    constructor(user) {
        super();
        this.#user = user;
    }

    get template() {
        return createModalTemplate(this.#user);
    }

    setCloseClickHandler(callback) {
        this._callback.closeClick = callback;
        this.element.querySelector('.close').addEventListener('click', (evt) => {
            evt.preventDefault();
            this._callback.closeClick();
        });

        window.addEventListener('click', (evt) => {
            if (evt.target === this.element) {
                this._callback.closeClick();
            }
        });
    }

    setFormSubmitHandler(callback) {
    this._callback.formSubmit = callback;
    this.element.querySelector('form').addEventListener('submit', (evt) => {
        evt.preventDefault();

        const updatedData = {
        login: this.element.querySelector('#edit-login').value,
        email: this.element.querySelector('#edit-email').value,
        name: this.element.querySelector('#edit-name').value,
        surname: this.element.querySelector('#edit-surname').value,
        };


        this._callback.formSubmit(updatedData);
    });
    }
}