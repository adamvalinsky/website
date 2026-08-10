// Placeholder-only auth: credentials live in localStorage in plain text,
// so this gate is for demo/UI purposes only, not real security.
const AVW_AUTH = {
  SESSION_KEY: "avw_member_auth",
  CREDENTIALS_KEY: "avw_member_credentials",
  DEFAULT_CREDENTIALS: { username: "adam", password: "adam" },

  getCredentials() {
    try {
      const raw = localStorage.getItem(this.CREDENTIALS_KEY);
      if (!raw) return { ...this.DEFAULT_CREDENTIALS };
      const parsed = JSON.parse(raw);
      if (!parsed.username || !parsed.password) return { ...this.DEFAULT_CREDENTIALS };
      return parsed;
    } catch {
      return { ...this.DEFAULT_CREDENTIALS };
    }
  },

  setCredentials(username, password) {
    localStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify({ username, password }));
  },

  isLoggedIn() {
    return sessionStorage.getItem(this.SESSION_KEY) === "true";
  },

  login(username, password) {
    const creds = this.getCredentials();
    const ok = username === creds.username && password === creds.password;
    if (ok) {
      sessionStorage.setItem(this.SESSION_KEY, "true");
    }
    return ok;
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  const navLogin = document.querySelector(".nav-login");
  if (navLogin) {
    if (AVW_AUTH.isLoggedIn()) {
      navLogin.textContent = "Member Area";
      navLogin.setAttribute("href", "members.html");
    } else {
      navLogin.textContent = "Member Login";
      navLogin.setAttribute("href", "login.html");
    }
  }

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
    });
  }

  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    if (link.getAttribute("href") === path) {
      link.classList.add("active");
    }
  });

  const form = document.querySelector("#contact-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const status = document.querySelector("#form-status");
      if (status) {
        status.textContent = "This is a placeholder form — wire it up to an email service or backend to make it live.";
      }
    });
  }

  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    if (AVW_AUTH.isLoggedIn()) {
      window.location.replace("members.html");
    }

    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.querySelector("#username").value.trim();
      const password = document.querySelector("#password").value;
      const error = document.querySelector("#login-error");

      if (AVW_AUTH.login(username, password)) {
        window.location.href = "members.html";
      } else if (error) {
        error.textContent = "Incorrect username or password.";
      }
    });
  }

  const forgotBtn = document.querySelector("#forgot-password-btn");
  if (forgotBtn) {
    forgotBtn.addEventListener("click", () => {
      const status = document.querySelector("#forgot-password-status");
      const current = AVW_AUTH.getCredentials();
      const confirmed = window.confirm(
        `This placeholder reset has no email delivery — it can only reset the password back to the site default ("${AVW_AUTH.DEFAULT_CREDENTIALS.password}") for username "${current.username}". Continue?`
      );
      if (!confirmed) return;

      AVW_AUTH.setCredentials(current.username, AVW_AUTH.DEFAULT_CREDENTIALS.password);
      if (status) {
        status.textContent = `Password reset to the default. Log in with username "${current.username}" and password "${AVW_AUTH.DEFAULT_CREDENTIALS.password}".`;
      }
    });
  }

  const memberGate = document.querySelector("[data-member-gate]");
  if (memberGate) {
    if (!AVW_AUTH.isLoggedIn()) {
      window.location.replace("login.html");
    }

    const logoutBtn = document.querySelector("#logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        AVW_AUTH.logout();
        window.location.href = "login.html";
      });
    }

    document.querySelectorAll("[data-current-username]").forEach((el) => {
      el.textContent = AVW_AUTH.getCredentials().username;
    });
  }

  const requestForm = document.querySelector("#request-form");
  if (requestForm) {
    requestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.querySelector("#request-status");
      const title = document.querySelector("#request-title").value.trim();
      const accessKey = requestForm.querySelector("[name='access_key']").value;

      if (!accessKey || accessKey === "YOUR_WEB3FORMS_ACCESS_KEY") {
        if (status) {
          status.classList.add("auth-error");
          status.classList.remove("auth-success");
          status.textContent =
            "Form isn't wired up yet — add your Web3Forms access key in members.html to enable submissions.";
        }
        return;
      }

      const submitBtn = requestForm.querySelector("button[type='submit']");
      submitBtn.disabled = true;

      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(requestForm))),
        });
        const result = await response.json();

        if (result.success) {
          status.classList.remove("auth-error");
          status.classList.add("auth-success");
          status.textContent = `Request for "${title}" submitted — thanks!`;
          requestForm.reset();
        } else {
          throw new Error(result.message || "Submission failed");
        }
      } catch (err) {
        status.classList.add("auth-error");
        status.classList.remove("auth-success");
        status.textContent = "Something went wrong submitting your request. Please try again later.";
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  const profileForm = document.querySelector("#profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const currentPassword = document.querySelector("#current-password").value;
      const newUsername = document.querySelector("#new-username").value.trim();
      const newPassword = document.querySelector("#new-password").value;
      const confirmPassword = document.querySelector("#confirm-password").value;
      const status = document.querySelector("#profile-status");
      const current = AVW_AUTH.getCredentials();

      status.classList.remove("auth-error", "auth-success");

      if (currentPassword !== current.password) {
        status.textContent = "Current password is incorrect.";
        status.classList.add("auth-error");
        return;
      }

      if (newPassword && newPassword !== confirmPassword) {
        status.textContent = "New password and confirmation do not match.";
        status.classList.add("auth-error");
        return;
      }

      const finalUsername = newUsername || current.username;
      const finalPassword = newPassword || current.password;
      AVW_AUTH.setCredentials(finalUsername, finalPassword);

      status.textContent = "Profile updated.";
      status.classList.add("auth-success");
      profileForm.reset();
      document.querySelectorAll("[data-current-username]").forEach((el) => {
        el.textContent = finalUsername;
      });
    });
  }
});
