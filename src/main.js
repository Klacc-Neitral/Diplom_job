import ProfilePresenter from "./presenter/profile-presenter.js";
import CoursesModel from "./model/courses-model.js";
import UserModel from "./model/user-model.js";
import ApiService from "./framework/api-service.js";
import { USER_DATA } from "./mock/user.js"


const END_POINT = 'https://692db100e5f67cd80a4c92ec.mockapi.io';


const bodyElement = document.querySelector('body');


const apiService = new ApiService(END_POINT);


const coursesModel = new CoursesModel(apiService);
const userModel = new UserModel(USER_DATA);

const profilePresenter = new ProfilePresenter(bodyElement, coursesModel, userModel);


coursesModel.init()
    .then(() => {
        profilePresenter.init();
    });