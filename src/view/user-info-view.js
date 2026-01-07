import { AbstractComponent } from "../framework/view/abstract-component.js";

function createUserInfoTemplate(user) {
    const avatar = user.photo_url || 'https://via.placeholder.com/150';
    const login = user.username || 'Не указан';
    const firstName = user.first_name || 'Не указано';
    const lastName = user.last_name || '';
    const email = 'Скрыто Telegram'; // Telegram не отдает email автоматически

    return (
        `<section class="profile-details">
            <div class="profile-avatar">
                <h2>Аватар профиля</h2>
                <img src="${avatar}" alt="Аватар" class="avatar-image" style="width: 150px; border-radius: 50%;">
                <input type="file" id="avatar-input" accept="image/*" style="display: none">
                <button class="btn btn-avatar">Выбрать аватар</button>
            </div>

            <form class="profile-form">
                <h2>Личные данные (из Telegram)</h2>
                <div class="form-group">
                    <label>ID пользователя</label>
                    <input type="text" value="${user.id}" disabled>
                </div>
                <div class="form-group">
                    <label>Логин (@username)</label>
                    <input type="text" value="${login}" disabled>
                </div>
                <div class="form-group">
                    <label>Имя</label>
                    <input type="text" value="${firstName}" disabled>
                </div>
                <div class="form-group">
                    <label>Фамилия</label>
                    <input type="text" value="${lastName}" disabled>
                </div>
                <button type="button" class="btn btn-save" id="openModalBtn">Изменить (локально)</button>
            </form>
        </section>`
    );
}

export default class UserInfoView extends AbstractComponent {
    #user = null;
    _callback = {};

    constructor() {
        super();
        const tg = window.Telegram?.WebApp;
        
        if (tg?.initDataUnsafe?.user) {
            this.#user = tg.initDataUnsafe.user;
        } else {
            this.#user = {
                id: '0000',
                first_name: 'Гость',
                last_name: '',
                username: 'guest',
                photo_url: ''
            };
        }
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
            fileInput.click();
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
                this._callback.avatarClick(reader.result);
                this.element.querySelector('.avatar-image').src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    };
}
