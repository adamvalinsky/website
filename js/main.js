const SUPABASE_URL = "https://yoamadmjpawhyietyjkr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kHJDJhShP2i1yYPYOSsl5Q_T6A8TmIT";
let supabaseClient;

const AVW_AUTH = {
  async getSession() {
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
  },

  async isLoggedIn() {
    return !!(await this.getSession());
  },

  async getEmail() {
    const session = await this.getSession();
    return session?.user?.email || null;
  },

  async login(email, password) {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    return { ok: !error, error: error?.message };
  },

  async logout() {
    await supabaseClient.auth.signOut();
  },

  async sendPasswordReset(email) {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`,
    });
    return { ok: !error, error: error?.message };
  },

  // Requires an active recovery session (arrived via the reset-password email link).
  async updatePasswordFromRecovery(newPassword) {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    return { ok: !error, error: error?.message };
  },

  async updateProfile({ currentPassword, newEmail, newPassword }) {
    const email = await this.getEmail();
    if (!email) return { ok: false, error: "Not logged in." };

    const { error: reauthError } = await supabaseClient.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (reauthError) return { ok: false, error: "Current password is incorrect." };

    const updates = {};
    if (newEmail && newEmail !== email) updates.email = newEmail;
    if (newPassword) updates.password = newPassword;
    if (Object.keys(updates).length === 0) return { ok: true, updates };

    const { error } = await supabaseClient.auth.updateUser(updates);
    if (error) return { ok: false, error: error.message };
    return { ok: true, updates };
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

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

  const navLogin = document.querySelector(".nav-login");
  if (navLogin) {
    if (await AVW_AUTH.isLoggedIn()) {
      navLogin.textContent = "Member Area";
      navLogin.setAttribute("href", "members.html");
    } else {
      navLogin.textContent = "Member Login";
      navLogin.setAttribute("href", "login.html");
    }
  }

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
    if (await AVW_AUTH.isLoggedIn()) {
      window.location.replace("members.html");
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.querySelector("#email").value.trim();
      const password = document.querySelector("#password").value;
      const error = document.querySelector("#login-error");
      const submitBtn = loginForm.querySelector("button[type='submit']");

      submitBtn.disabled = true;
      const result = await AVW_AUTH.login(email, password);
      submitBtn.disabled = false;

      if (result.ok) {
        window.location.href = "members.html";
      } else if (error) {
        error.textContent = result.error || "Incorrect email or password.";
      }
    });
  }

  const forgotBtn = document.querySelector("#forgot-password-btn");
  if (forgotBtn) {
    forgotBtn.addEventListener("click", async () => {
      const status = document.querySelector("#forgot-password-status");
      const email = document.querySelector("#email").value.trim();

      if (!email) {
        status.classList.add("auth-error");
        status.textContent = "Enter your email above first, then click \"Forgot password?\"";
        return;
      }

      forgotBtn.disabled = true;
      const result = await AVW_AUTH.sendPasswordReset(email);
      forgotBtn.disabled = false;

      status.classList.remove("auth-error");
      if (result.ok) {
        status.textContent = `If an account exists for ${email}, a password reset link has been sent.`;
      } else {
        status.classList.add("auth-error");
        status.textContent = result.error || "Something went wrong sending the reset email.";
      }
    });
  }

  const resetForm = document.querySelector("#reset-password-form");
  if (resetForm) {
    const { data } = await supabaseClient.auth.getSession();
    const statusEl = document.querySelector("#reset-password-status");
    if (!data.session) {
      statusEl.classList.add("auth-error");
      statusEl.textContent = "This reset link is invalid or has expired. Request a new one from the login page.";
      resetForm.querySelector("button[type='submit']").disabled = true;
    }

    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPassword = document.querySelector("#reset-new-password").value;
      const confirmPassword = document.querySelector("#reset-confirm-password").value;

      statusEl.classList.remove("auth-error", "auth-success");

      if (newPassword !== confirmPassword) {
        statusEl.classList.add("auth-error");
        statusEl.textContent = "Passwords do not match.";
        return;
      }

      const result = await AVW_AUTH.updatePasswordFromRecovery(newPassword);
      if (result.ok) {
        statusEl.classList.add("auth-success");
        statusEl.textContent = "Password updated. Redirecting to the members area…";
        setTimeout(() => window.location.replace("members.html"), 1500);
      } else {
        statusEl.classList.add("auth-error");
        statusEl.textContent = result.error || "Something went wrong updating your password.";
      }
    });
  }

  const memberGate = document.querySelector("[data-member-gate]");
  if (memberGate) {
    if (!(await AVW_AUTH.isLoggedIn())) {
      window.location.replace("login.html");
      return;
    }

    const logoutBtn = document.querySelector("#logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await AVW_AUTH.logout();
        window.location.href = "login.html";
      });
    }

    const email = await AVW_AUTH.getEmail();
    document.querySelectorAll("[data-current-email]").forEach((el) => {
      el.textContent = email;
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
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentPassword = document.querySelector("#current-password").value;
      const newEmail = document.querySelector("#new-email").value.trim();
      const newPassword = document.querySelector("#new-password").value;
      const confirmPassword = document.querySelector("#confirm-password").value;
      const status = document.querySelector("#profile-status");
      const submitBtn = profileForm.querySelector("button[type='submit']");

      status.classList.remove("auth-error", "auth-success");

      if (newPassword && newPassword !== confirmPassword) {
        status.textContent = "New password and confirmation do not match.";
        status.classList.add("auth-error");
        return;
      }

      submitBtn.disabled = true;
      const result = await AVW_AUTH.updateProfile({ currentPassword, newEmail, newPassword });
      submitBtn.disabled = false;

      if (!result.ok) {
        status.textContent = result.error;
        status.classList.add("auth-error");
        return;
      }

      status.classList.add("auth-success");
      status.textContent = result.updates?.email
        ? "Profile updated. Check your new email address for a confirmation link before it takes effect."
        : "Profile updated.";
      profileForm.reset();

      const email = await AVW_AUTH.getEmail();
      document.querySelectorAll("[data-current-email]").forEach((el) => {
        el.textContent = email;
      });
    });
  }
});
