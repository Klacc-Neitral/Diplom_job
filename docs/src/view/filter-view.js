import { AbstractComponent } from "../framework/view/abstract-component.js";

function createFilterTemplate() {
    return (
        `<div class="filter-panel"> 
            
            <div class="search-box">
                <input type="text" id="search-input" placeholder="Поиск курса по названию..." class="app-input">
            </div>

            <div class="filter-checkboxes"> 
                <label>
                    <input type="checkbox" id="filter-started" value="started">
                    В процессе
                </label>
                <label>
                    <input type="checkbox" id="filter-not-started" value="not-started">
                    Не начато
                </label>
            </div>
        </div>`
    );
}

export default class FilterView extends AbstractComponent {
    _callback = {};

    get template() {
        return createFilterTemplate();
    }


    setSearchInputHandler(callback) {
        this._callback.searchInput = callback;
        this.element.querySelector('#search-input').addEventListener('input', (evt) => {
            this._callback.searchInput(evt.target.value);
        });
    }


    setFilterChangeHandler(callback) {
        this._callback.filterChange = callback;
        
        const checkboxStarted = this.element.querySelector('#filter-started');
        const checkboxNotStarted = this.element.querySelector('#filter-not-started');

        const changeHandler = () => {
            const filters = {
                started: checkboxStarted.checked,
                notStarted: checkboxNotStarted.checked
            };
            this._callback.filterChange(filters);
        };

        checkboxStarted.addEventListener('change', changeHandler);
        checkboxNotStarted.addEventListener('change', changeHandler);
    }
}