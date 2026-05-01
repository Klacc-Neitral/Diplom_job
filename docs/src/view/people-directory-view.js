import { AbstractComponent } from "../framework/view/abstract-component.js";

function createPeopleDirectoryTemplate() {
    return (
        `<section class="people-view">
            <div class="people-layout">
                <aside class="people-sidebar">
                    <div class="people-sidebar-header">
                        <h2>Люди</h2>
                        <p>Найди участников платформы и посмотри, какие курсы они проходят.</p>
                    </div>
                    <div class="people-search-slot"></div>
                    <div class="people-results"></div>
                </aside>
                <div class="people-profile-slot">
                    <div class="empty-state people-empty-state">Выбери пользователя из списка, чтобы открыть его профиль.</div>
                </div>
            </div>
        </section>`
    );
}

export default class PeopleDirectoryView extends AbstractComponent {
    get template() {
        return createPeopleDirectoryTemplate();
    }

    get searchSlot() {
        return this.element.querySelector(".people-search-slot");
    }

    get resultsContainer() {
        return this.element.querySelector(".people-results");
    }

    get profileSlot() {
        return this.element.querySelector(".people-profile-slot");
    }
}
