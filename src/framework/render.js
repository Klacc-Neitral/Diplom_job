import { AbstractComponent } from "./view/abstract-component.js";

const RenderPosition = {
  BEFOREBEGIN: 'beforebegin',
  AFTERBEGIN: 'afterbegin',
  BEFOREEND: 'beforeend',
  AFTEREND: 'afterafterend',
};

function createElement(template) {
  const newElement = document.createElement('div');
  newElement.innerHTML = template;
  return newElement.firstElementChild;
}

function render(component, container, place = RenderPosition.BEFOREEND) {
  if (!(component instanceof AbstractComponent)) {
    throw new Error('Can render only components');
  }

  if (container === null) {
    throw new Error('Container element doesn\'t exist');
  }
  container.insertAdjacentElement(place, component.element);
}


function remove(component) {
    if (!(component instanceof AbstractComponent)) {
        throw new Error('Can remove only components');
    }

    if (component.element === null) {
        return;
    }
    
   
    component.element.remove(); 
    

    component.removeElement(); 
}


function replace(newComponent, oldComponent) {
    if (!(newComponent instanceof AbstractComponent && oldComponent instanceof AbstractComponent)) {
        throw new Error('Can replace only components');
    }

    const parent = oldComponent.element.parentElement;
    
    if (parent === null) {
        throw new Error('Parent element doesn\'t exist');
    }

    parent.replaceChild(newComponent.element, oldComponent.element);
    remove(oldComponent);
}


export {RenderPosition, createElement, render, remove, replace};