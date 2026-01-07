import { AbstractComponent } from "../framework/view/abstract-component.js";


function createUserInfoTemplate(user) {
    return (
        `<section class="profile-details">
            <div class="profile-avatar">
                <h2>Аватар профиля</h2>
                <img src="${user.avatar}" alt="Аватар" class="avatar-image">
                <input type="file" id="avatar-input" accept="image/*" style="display: none">
                <button class="btn btn-avatar">Выбрать аватар</button>
            </div>

            <form class="profile-form">
                <h2>Личные данные</h2>
                <div class="form-group">
                    <label>Логин</label>
                    <input type="text" value="${user.login}" disabled>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" value="${user.email}" disabled>
                </div>
                <div class="form-group">
                    <label>Имя</label>
                    <input type="text" value="${user.name}" disabled>
                </div>
                <div class="form-group">
                    <label>Фамилия</label>
                    <input type="text" value="${user.surname}" disabled>
                </div>
                <button type="button" class="btn btn-save" id="openModalBtn">Изменить</button>
            </form>
        </section>`
    );
}

export default class UserInfoView extends AbstractComponent {
    #user = null;
    _callback = {};

    constructor(user) {
        super();
        this.#user = user;
    }

    get template() {
        return createUserInfoTemplate(this.#user);
    }


    setEditClickHandler(callback) {
        this._callback.editClick = callback;
        this.element.querySelector('#openModalBtn').addEventListener('click', this.#editClickHandler);
    }


    setAvatarClickHandler(callback) {
        this._callback.avatarClick = callback;
        
        const avatarBtn = this.element.querySelector('.btn-avatar');
        const fileInput = this.element.querySelector('#avatar-input');

        avatarBtn.addEventListener('click', (evt) => {
            evt.preventDefault();
            fileInput.click(); // Открываем окно выбора файла
        });

        fileInput.addEventListener('change', this.#avatarChangeHandler);
    }


    #editClickHandler = (evt) => {
        evt.preventDefault();
        this._callback.editClick();
    };

 
    #avatarChangeHandler = (evt) => {
        const file = evt.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                // Передаем результат (base64 строку) в колбэк презентера
                this._callback.avatarClick(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
}