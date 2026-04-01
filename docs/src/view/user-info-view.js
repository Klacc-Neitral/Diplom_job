import { AbstractComponent } from "../framework/view/abstract-component.js";

function createUserInfoTemplate(user) {
    const avatarUrl = user.avatar_url || "https://via.placeholder.com/150";
    const username = user.username || "Не указан";
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";

    return (
        `<section class="profile-details">
            <div class="profile-avatar">
                <h2>Аватар профиля</h2>
                <img src="${avatarUrl}" alt="Аватар" class="avatar-image" style="width: 150px; border-radius: 50%;">
                <input type="file" id="avatar-input" accept="image/*" style="display: none">
                <button class="btn btn-avatar">Выбрать аватар</button>
            </div>

            <form class="profile-form">
                <h2>Личные данные</h2>
                <div class="form-group">
                    <label>ID пользователя</label>
                    <input type="text" value="${user.user_id}" disabled>
                </div>
                <div class="form-group">
                    <label>Платформа</label>
                    <input type="text" value="${user.platform}" disabled>
                </div>
                <div class="form-group">
                    <label>Логин</label>
                    <input type="text" value="${username}" disabled>
                </div>
                <div class="form-group">
                    <label>Имя</label>
                    <input type="text" value="${firstName}" disabled>
                </div>
                <div class="form-group">
                    <label>Фамилия</label>
                    <input type="text" value="${lastName}" disabled>
                </div>
                <button type="button" class="btn btn-save" id="openModalBtn">Изменить</button>
            </form>
        </section>`
    );
}

export default class UserInfoView extends AbstractComponent {
    #userModel = null;
    _callback = {};

    constructor(userModel) {
        super();
        this.#userModel = userModel;
    }

    get template() {
        return createUserInfoTemplate(this.#userModel.getUser());
    }

    setEditClickHandler(callback) {
        this._callback.editClick = callback;
        this.element.querySelector("#openModalBtn").addEventListener("click", this.#editClickHandler);
    }

    setAvatarClickHandler(callback) {
        this._callback.avatarClick = callback;

        const avatarBtn = this.element.querySelector(".btn-avatar");
        const fileInput = this.element.querySelector("#avatar-input");

        avatarBtn.addEventListener("click", (evt) => {
            evt.preventDefault();
            fileInput.click();
        });

        fileInput.addEventListener("change", this.#avatarChangeHandler);
    }

    #editClickHandler = (evt) => {
        evt.preventDefault();
        this._callback.editClick();
    };

    #avatarChangeHandler = (evt) => {
        const file = evt.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            this._callback.avatarClick(reader.result);
        };
        reader.readAsDataURL(file);
    };
}
