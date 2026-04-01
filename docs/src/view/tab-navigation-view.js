import { AbstractComponent } from "../framework/view/abstract-component.js";

function createTabNavTemplate() {
    return (
        `<div class="profile-tabs-wrapper">
            <button class="tab-label active" data-tab="my-courses">Мои курсы</button>
            <button class="tab-label" data-tab="all-courses">Все курсы</button>
        </div>`
    );
}

export default class TabNavigationView extends AbstractComponent {

    _callback = {};

    get template() {
        return createTabNavTemplate();
    }

    setTabClickHandler(callback) {
        this._callback.tabClick = callback;
        
        this.element.querySelectorAll('.tab-label').forEach(tab => {
            tab.addEventListener('click', (evt) => {
                evt.preventDefault();
                

                this.element.querySelectorAll('.tab-label').forEach(t => t.classList.remove('active'));
                evt.target.classList.add('active');
                
                this._callback.tabClick(evt.target.dataset.tab);
            });
        });
    }
}