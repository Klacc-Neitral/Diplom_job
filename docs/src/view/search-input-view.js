import { AbstractComponent } from "../framework/view/abstract-component.js";

function createSearchInputTemplate(placeholder, inputId) {
    return (
        `<div class="search-bar-wrapper">
            <input type="text" id="${inputId}" placeholder="${placeholder}" class="app-input">
        </div>`
    );
}

export default class SearchInputView extends AbstractComponent {
    _callback = {};
    #placeholder = "";
    #inputId = "";

    constructor(placeholder = "Найти новый курс...", inputId = "all-courses-search") {
        super();
        this.#placeholder = placeholder;
        this.#inputId = inputId;
    }

    get template() {
        return createSearchInputTemplate(this.#placeholder, this.#inputId);
    }

    setSearchHandler(callback) {
        this._callback.search = callback;
        this.element.querySelector("input").addEventListener("input", (evt) => {
            this._callback.search(evt.target.value);
        });
    }

    setValue(value) {
        this.element.querySelector("input").value = value ?? "";
    }
}
