import { AbstractComponent } from "../framework/view/abstract-component.js";

function createSearchInputTemplate() {
    return (
        `<div class="search-bar-wrapper"> 
            <input type="text" id="all-courses-search" placeholder="Найти новый курс..." class="app-input">
        </div>`
    );
}

export default class SearchInputView extends AbstractComponent {
    _callback = {};

    get template() {
        return createSearchInputTemplate();
    }

    setSearchHandler(callback) {
        this._callback.search = callback;
        this.element.querySelector('input').addEventListener('input', (evt) => {
            this._callback.search(evt.target.value);
        });
    }
}