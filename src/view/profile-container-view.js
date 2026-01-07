import { AbstractComponent } from "../framework/view/abstract-component.js";

function createProfileContainerTemplate() {
    return (
        `<main class="main">
            <div class="container">
                <div class="profile-card">
                    <div class="profile-content"></div>
                </div>
            </div>
        </main>`
    );
}

export default class ProfileContainerView extends AbstractComponent {
    get template() {
        return createProfileContainerTemplate();
    }
    
    get contentContainer() {
        return this.element.querySelector('.profile-content');
    }
    
    get cardContainer() {
        return this.element.querySelector('.profile-card');
    }
}