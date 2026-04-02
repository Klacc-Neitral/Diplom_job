import ProfilePresenter from "./presenter/profile-presenter.js";
import CoursesModel from "./model/courses-model.js";
import { UserModel } from "./model/user-model.js";
import ApiService from "./framework/api-service.js";
import { initPlatform } from "./platform/index.js";
import { APP_CONFIG } from "./config.js";

async function startApp() {
  try {
    console.log("APP START");

    const END_POINT = APP_CONFIG.apiBaseUrl;
    const bodyElement = document.querySelector("body");

    const userModel = new UserModel();
    const apiService = new ApiService(END_POINT, userModel);
    const coursesModel = new CoursesModel(apiService);

    const platformUser = await initPlatform();
    console.log("platformUser:", platformUser);

    const persistedUser = await apiService.syncUser(platformUser);
    console.log("persistedUser:", persistedUser);

    userModel.setUser(persistedUser);

    const profilePresenter = new ProfilePresenter(
      bodyElement,
      coursesModel,
      userModel,
      apiService
    );

    await coursesModel.init();
    profilePresenter.init();

  } catch (e) {
    console.error("APP ERROR:", e);
    document.body.innerHTML = "<h1>ERROR</h1><pre>" + e + "</pre>";
  }
}

startApp();
