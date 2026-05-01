import ProfilePresenter from "./presenter/profile-presenter.js";
import CoursesModel from "./model/courses-model.js";
import { UserModel } from "./model/user-model.js";
import ApiService from "./framework/api-service.js";
import { initPlatform } from "./platform/index.js";
import { APP_CONFIG } from "./config.js";

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

function saveAuthSession(session) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, session.token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
}

function clearAuthSession() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

function getStoredSession() {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  const rawUser = window.localStorage.getItem(AUTH_USER_KEY);

  if (!token || !rawUser) {
    return null;
  }

  try {
    return {
      token,
      user: JSON.parse(rawUser),
    };
  } catch {
    clearAuthSession();
    return null;
  }
}

function validatePasswordStrength(password) {
  if (password.length < 8) {
    return "Пароль должен быть не короче 8 символов.";
  }

  if (!/[a-zа-я]/.test(password)) {
    return "Добавь хотя бы одну строчную букву.";
  }

  if (!/[A-ZА-Я]/.test(password)) {
    return "Добавь хотя бы одну заглавную букву.";
  }

  if (!/\d/.test(password)) {
    return "Добавь хотя бы одну цифру.";
  }

  if (!/[^A-Za-zА-Яа-я0-9]/.test(password)) {
    return "Добавь хотя бы один спецсимвол.";
  }

  if (password.trim() !== password) {
    return "Убери пробелы в начале и конце пароля.";
  }

  return "";
}

function ensureAuthStyles() {
  if (document.getElementById("auth-screen-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "auth-screen-styles";
  style.textContent = `
    body.auth-screen {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, #171d33 0%, #0d1222 100%);
      font-family: Arial, sans-serif;
      color: #ffffff;
    }
    .auth-card {
      width: min(420px, calc(100vw - 32px));
      background: rgba(22, 30, 54, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      padding: 28px;
      box-sizing: border-box;
    }
    .auth-title {
      margin: 0 0 10px;
      font-size: 28px;
    }
    .auth-subtitle {
      margin: 0 0 20px;
      color: rgba(255, 255, 255, 0.75);
      line-height: 1.5;
    }
    .auth-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 20px;
    }
    .auth-tab {
      height: 44px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: transparent;
      color: #ffffff;
      cursor: pointer;
      font-size: 15px;
    }
    .auth-tab.active {
      background: #4b7cff;
      border-color: #4b7cff;
    }
    .auth-form {
      display: none;
      gap: 14px;
    }
    .auth-form.active {
      display: grid;
    }
    .auth-field {
      display: grid;
      gap: 6px;
    }
    .auth-field label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.84);
    }
    .auth-hint {
      min-height: 18px;
      font-size: 12px;
      line-height: 1.4;
      color: rgba(255, 255, 255, 0.6);
    }
    .auth-hint.is-error {
      color: #ff8e8e;
    }
    .auth-hint.is-success {
      color: #93f5b0;
    }
    .auth-field input {
      height: 44px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.05);
      color: #ffffff;
      padding: 0 14px;
      outline: none;
      box-sizing: border-box;
    }
    .auth-field input:focus {
      border-color: #4b7cff;
    }
    .auth-inline-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: center;
    }
    .auth-secondary {
      height: 44px;
      padding: 0 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      cursor: pointer;
      white-space: nowrap;
    }
    .auth-error {
      min-height: 20px;
      color: #ff8e8e;
      font-size: 13px;
      line-height: 1.4;
    }
    .auth-submit {
      height: 46px;
      border: none;
      border-radius: 12px;
      background: #4b7cff;
      color: #ffffff;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
    }
    .auth-submit:disabled,
    .auth-tab:disabled {
      opacity: 0.65;
      cursor: wait;
    }
  `;

  document.head.appendChild(style);
}

function ensureLoadingStyles() {
  if (document.getElementById("loading-screen-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "loading-screen-styles";
  style.textContent = `
    body.loading-screen {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, #171d33 0%, #0d1222 100%);
      font-family: Arial, sans-serif;
      color: #ffffff;
    }
    .loading-card {
      width: min(420px, calc(100vw - 32px));
      padding: 28px;
      border-radius: 20px;
      background: rgba(22, 30, 54, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      box-sizing: border-box;
      text-align: center;
    }
    .loading-card h1 {
      margin: 0 0 10px;
      font-size: 28px;
    }
    .loading-card p {
      margin: 0;
      color: rgba(255, 255, 255, 0.75);
      line-height: 1.5;
    }
  `;

  document.head.appendChild(style);
}

function renderLoadingScreen(message = "Загружаем приложение...") {
  ensureLoadingStyles();
  document.body.className = "loading-screen";
  document.body.innerHTML = `
    <section class="loading-card">
      <h1>ProgTest</h1>
      <p>${message}</p>
    </section>
  `;
}

function buildAuthScreenTemplate() {
  return `
    <section class="auth-card">
      <h1 class="auth-title">Вход в ProgTest</h1>
      <p class="auth-subtitle">Если Telegram WebApp недоступен, войдите по email или создайте новый аккаунт.</p>
      <div class="auth-tabs">
        <button class="auth-tab active" data-tab-target="signin" type="button">Sign In</button>
        <button class="auth-tab" data-tab-target="register" type="button">Register</button>
      </div>

      <form class="auth-form active" data-tab="signin">
        <div class="auth-field">
          <label for="signin-email">Email</label>
          <input id="signin-email" name="email" type="email" autocomplete="email">
        </div>
        <div class="auth-field">
          <label for="signin-password">Пароль</label>
          <input id="signin-password" name="password" type="password" autocomplete="current-password">
        </div>
        <div class="auth-error" data-error="signin"></div>
        <button class="auth-submit" type="submit">Войти</button>
      </form>

      <form class="auth-form" data-tab="register">
        <div class="auth-field">
          <label for="register-name">Имя</label>
          <input id="register-name" name="name" type="text" autocomplete="name">
        </div>
        <div class="auth-field">
          <label for="register-email">Email</label>
          <div class="auth-inline-row">
            <input id="register-email" name="email" type="email" autocomplete="email">
            <button class="auth-secondary" type="button" data-send-code>Отправить код</button>
          </div>
          <div class="auth-hint" data-email-status></div>
        </div>
        <div class="auth-field">
          <label for="register-password">Пароль</label>
          <input id="register-password" name="password" type="password" autocomplete="new-password">
          <div class="auth-hint" data-password-status>Минимум 8 символов, строчные и заглавные буквы, цифра и спецсимвол.</div>
        </div>
        <div class="auth-field">
          <label for="register-confirm-password">Подтверждение пароля</label>
          <input id="register-confirm-password" name="confirmPassword" type="password" autocomplete="new-password">
        </div>
        <div class="auth-field">
          <label for="register-verification-code">Код из письма</label>
          <input id="register-verification-code" name="verificationCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6">
          <div class="auth-hint" data-verification-status>Сначала отправь код подтверждения на почту.</div>
        </div>
        <div class="auth-error" data-error="register"></div>
        <button class="auth-submit" type="submit">Зарегистрироваться</button>
      </form>
    </section>
  `;
}

function renderAuthScreen(apiService) {
  ensureAuthStyles();
  document.body.className = "auth-screen";
  document.body.innerHTML = buildAuthScreenTemplate();

  const tabs = [...document.querySelectorAll("[data-tab-target]")];
  const forms = [...document.querySelectorAll("[data-tab]")];
  const errors = {
    signin: document.querySelector('[data-error="signin"]'),
    register: document.querySelector('[data-error="register"]'),
  };
  const registerForm = document.querySelector('[data-tab="register"]');
  const registerEmailField = registerForm.querySelector('input[name="email"]');
  const registerEmailStatus = registerForm.querySelector("[data-email-status]");
  const registerPasswordField = registerForm.querySelector('input[name="password"]');
  const registerConfirmPasswordField = registerForm.querySelector('input[name="confirmPassword"]');
  const registerPasswordStatus = registerForm.querySelector("[data-password-status]");
  const registerVerificationCodeField = registerForm.querySelector('input[name="verificationCode"]');
  const registerVerificationStatus = registerForm.querySelector("[data-verification-status]");
  const sendVerificationCodeButton = registerForm.querySelector("[data-send-code]");
  const registerVerificationField = registerVerificationCodeField.closest(".auth-field");
  let lastCheckedEmail = "";
  let lastCheckedAvailability = null;
  let verificationCodeSentTo = "";
  let emailVerificationRequired = false;

  const setActiveTab = (tabName) => {
    tabs.forEach((tabButton) => {
      tabButton.classList.toggle("active", tabButton.dataset.tabTarget === tabName);
    });

    forms.forEach((form) => {
      form.classList.toggle("active", form.dataset.tab === tabName);
    });

    errors.signin.textContent = "";
    errors.register.textContent = "";
  };

  const setLoading = (form, isLoading) => {
    form.querySelectorAll("input, button").forEach((control) => {
      control.disabled = isLoading;
    });
  };

  const setEmailStatus = (message = "", state = "") => {
    registerEmailStatus.textContent = message;
    registerEmailStatus.classList.remove("is-error", "is-success");
    if (state) {
      registerEmailStatus.classList.add(state);
    }
  };

  const setPasswordStatus = (message = "", state = "") => {
    registerPasswordStatus.textContent = message;
    registerPasswordStatus.classList.remove("is-error", "is-success");
    if (state) {
      registerPasswordStatus.classList.add(state);
    }
  };

  const setVerificationStatus = (message = "", state = "") => {
    registerVerificationStatus.textContent = message;
    registerVerificationStatus.classList.remove("is-error", "is-success");
    if (state) {
      registerVerificationStatus.classList.add(state);
    }
  };

  const applyAuthSettings = (settings = {}) => {
    emailVerificationRequired = Boolean(settings.emailVerificationRequired);
    const emailDeliveryConfigured = Boolean(settings.emailDeliveryConfigured);

    registerVerificationField.hidden = !emailVerificationRequired;
    sendVerificationCodeButton.hidden = !emailVerificationRequired;

    if (!emailVerificationRequired) {
      setVerificationStatus("");
      return;
    }

    if (!emailDeliveryConfigured) {
      sendVerificationCodeButton.disabled = true;
      setVerificationStatus("Подтверждение почты ещё не настроено на сервере.", "is-error");
      return;
    }

    sendVerificationCodeButton.disabled = false;
    setVerificationStatus("Сначала отправь код подтверждения на почту.");
  };

  const validateRegistrationPasswords = ({ showSuccess = false } = {}) => {
    const password = registerPasswordField.value;
    const confirmPassword = registerConfirmPasswordField.value;
    const passwordError = validatePasswordStrength(password);

    if (!password) {
      setPasswordStatus("Минимум 8 символов, строчные и заглавные буквы, цифра и спецсимвол.");
      return "";
    }

    if (passwordError) {
      setPasswordStatus(passwordError, "is-error");
      return passwordError;
    }

    if (confirmPassword && password !== confirmPassword) {
      const mismatchError = "Пароли не совпадают.";
      setPasswordStatus(mismatchError, "is-error");
      return mismatchError;
    }

    if (showSuccess || confirmPassword) {
      setPasswordStatus("Пароль подходит по требованиям.", "is-success");
    } else {
      setPasswordStatus("Пароль выглядит надежным.", "is-success");
    }

    return "";
  };

  const checkRegistrationEmail = async () => {
    const email = registerEmailField.value.trim().toLowerCase();

    if (!email) {
      setEmailStatus("");
      lastCheckedEmail = "";
      lastCheckedAvailability = null;
      return true;
    }

    if (email === lastCheckedEmail && lastCheckedAvailability !== null) {
      setEmailStatus(
        lastCheckedAvailability ? "Email свободен для регистрации." : "Эта почта уже зарегистрирована.",
        lastCheckedAvailability ? "is-success" : "is-error"
      );
      return lastCheckedAvailability;
    }

    setEmailStatus("Проверяем email...");

    try {
      const result = await apiService.checkEmailAvailability(email);
      lastCheckedEmail = email;
      lastCheckedAvailability = Boolean(result.available);
      setEmailStatus(
        lastCheckedAvailability ? "Email свободен для регистрации." : "Эта почта уже зарегистрирована.",
        lastCheckedAvailability ? "is-success" : "is-error"
      );
      return lastCheckedAvailability;
    } catch {
      setEmailStatus("Не удалось проверить email. Проверим его при регистрации.");
      lastCheckedEmail = "";
      lastCheckedAvailability = null;
      return true;
    }
  };

  const sendVerificationCode = async () => {
    if (!emailVerificationRequired) {
      return false;
    }

    errors.register.textContent = "";
    const email = registerEmailField.value.trim().toLowerCase();

    if (!email) {
      setVerificationStatus("Сначала укажи email для отправки кода.", "is-error");
      return false;
    }

    const isEmailAvailable = await checkRegistrationEmail();
    if (!isEmailAvailable) {
      setVerificationStatus("На этот email уже зарегистрирован аккаунт.", "is-error");
      return false;
    }

    sendVerificationCodeButton.disabled = true;
    setVerificationStatus("Отправляем код подтверждения...", "");

    try {
      await apiService.sendVerificationCode(email);
      verificationCodeSentTo = email;
      setVerificationStatus("Код отправлен. Проверь почту и введи его ниже.", "is-success");
      return true;
    } catch (error) {
      verificationCodeSentTo = "";
      setVerificationStatus(error.message || "Не удалось отправить код подтверждения.", "is-error");
      return false;
    } finally {
      sendVerificationCodeButton.disabled = false;
    }
  };

  tabs.forEach((tabButton) => {
    tabButton.addEventListener("click", () => setActiveTab(tabButton.dataset.tabTarget));
  });

  registerEmailField.addEventListener("input", () => {
    lastCheckedEmail = "";
    lastCheckedAvailability = null;
    verificationCodeSentTo = "";
    setEmailStatus("");
    if (emailVerificationRequired) {
      setVerificationStatus("Сначала отправь код подтверждения на почту.");
    }
  });

  registerEmailField.addEventListener("blur", () => {
    checkRegistrationEmail();
  });

  registerPasswordField.addEventListener("input", () => {
    validateRegistrationPasswords();
  });

  registerConfirmPasswordField.addEventListener("input", () => {
    validateRegistrationPasswords();
  });

  sendVerificationCodeButton.addEventListener("click", () => {
    sendVerificationCode();
  });

  apiService.getAuthSettings()
    .then((settings) => {
      applyAuthSettings(settings);
    })
    .catch(() => {
      applyAuthSettings({ emailVerificationRequired: false, emailDeliveryConfigured: false });
    });

  document.querySelector('[data-tab="signin"]').addEventListener("submit", async (evt) => {
    evt.preventDefault();
    errors.signin.textContent = "";

    const form = evt.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      errors.signin.textContent = "Заполните email и пароль.";
      return;
    }

    setLoading(form, true);
    try {
      const session = await apiService.login({ email, password });
      saveAuthSession(session);
      await mountAuthenticatedApp(session.user);
    } catch (error) {
      errors.signin.textContent = error.message || "Не удалось выполнить вход.";
    } finally {
      setLoading(form, false);
    }
  });

  registerForm.addEventListener("submit", async (evt) => {
    evt.preventDefault();
    errors.register.textContent = "";

    const form = evt.currentTarget;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    const verificationCode = registerVerificationCodeField.value.trim();

    if (!name || !email || !password || !confirmPassword || (emailVerificationRequired && !verificationCode)) {
      errors.register.textContent = "Заполните все поля.";
      return;
    }

    const passwordValidationError = validateRegistrationPasswords({ showSuccess: true });
    if (passwordValidationError) {
      errors.register.textContent = passwordValidationError;
      return;
    }

    const isEmailAvailable = await checkRegistrationEmail();
    if (!isEmailAvailable) {
      errors.register.textContent = "Пользователь с такой почтой уже существует.";
      return;
    }

    if (emailVerificationRequired && verificationCodeSentTo && verificationCodeSentTo !== email.toLowerCase()) {
      errors.register.textContent = "После смены email нужно запросить новый код.";
      return;
    }

    setLoading(form, true);
    try {
      const session = await apiService.register({ name, email, password, verificationCode });
      saveAuthSession(session);
      await mountAuthenticatedApp(session.user);
    } catch (error) {
      errors.register.textContent = error.message || "Не удалось зарегистрироваться.";
    } finally {
      setLoading(form, false);
    }
  });
}

async function mountAuthenticatedApp(user) {
  renderLoadingScreen("Загружаем профиль и курсы...");

  const bodyElement = document.body;
  const userModel = new UserModel();
  userModel.setUser(user);

  const apiService = new ApiService(APP_CONFIG.apiBaseUrl, userModel);
  const coursesModel = new CoursesModel(apiService);
  const profilePresenter = new ProfilePresenter(
    bodyElement,
    coursesModel,
    userModel,
    apiService
  );

  try {
    await coursesModel.init();
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuthSession();
      renderAuthScreen(new ApiService(APP_CONFIG.apiBaseUrl, null));
      return;
    }

    throw error;
  }

  document.body.className = "";
  document.body.innerHTML = "";

  profilePresenter.init();
}

async function startApp() {
  try {
    renderLoadingScreen("Подключаем платформу и проверяем сессию...");
    const publicApiService = new ApiService(APP_CONFIG.apiBaseUrl, null);
    const platformState = await initPlatform();

    if (platformState.context === "telegram") {
      const session = await publicApiService.authWithTelegram(platformState.user);
      saveAuthSession(session);
      await mountAuthenticatedApp(session.user);
      return;
    }

    if (platformState.context === "vk") {
      const session = await publicApiService.syncUser(platformState.user);
      saveAuthSession(session);
      await mountAuthenticatedApp(session.user);
      return;
    }

    const storedSession = getStoredSession();
    if (!storedSession) {
      renderAuthScreen(publicApiService);
      return;
    }

    const currentUser = await publicApiService.getCurrentUser();
    saveAuthSession({
      token: storedSession.token,
      user: currentUser,
    });
    await mountAuthenticatedApp(currentUser);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuthSession();
      renderAuthScreen(new ApiService(APP_CONFIG.apiBaseUrl, null));
      return;
    }

    console.error("APP ERROR:", error);
    document.body.innerHTML = `<h1>ERROR</h1><pre>${error.message || error}</pre>`;
  }
}

startApp();
