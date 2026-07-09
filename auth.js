/* ==========================================================================
   YourStocks — Auth Module
   IMPORTANT: GitHub Pages serves static files only, there is no server or
   database. This module simulates accounts using the browser's
   localStorage so the demo is fully self-contained. Passwords are hashed
   with SHA-256 before storage so they aren't sitting in plain text, but
   this is NOT real security — do not reuse a real password here, and
   don't treat this as production authentication.
   ========================================================================== */

const USERS_KEY = "ys_users";
const SESSION_KEY = "ys_session";
const STARTING_BALANCE = 100000; // AUD paper-trading balance

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setSession(email) {
  localStorage.setItem(SESSION_KEY, email);
}

function getSession() {
  return localStorage.getItem(SESSION_KEY);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function initUserState(email) {
  const key = `ys_state_${email}`;
  if (localStorage.getItem(key)) return;
  const state = {
    cash: STARTING_BALANCE,
    holdings: {},
    trades: [],
    watchlist: ["BHP", "CBA", "AAPL", "NVDA", "XRO", "TSLA"],
    riskProfile: null,
    portfolioHistory: [{ ts: Date.now(), value: STARTING_BALANCE }],
  };
  localStorage.setItem(key, JSON.stringify(state));
}

/* ---------------------------- UI wiring ---------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // If already logged in, skip straight to the platform
  if (getSession()) {
    window.location.href = "dashboard.html";
    return;
  }

  const panel = document.getElementById("authPanel");
  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const loginError = document.getElementById("loginError");
  const signupError = document.getElementById("signupError");

  function showLogin() {
    panel.dataset.mode = "login";
    tabLogin.classList.add("is-active");
    tabSignup.classList.remove("is-active");
    loginForm.classList.remove("is-hidden");
    signupForm.classList.add("is-hidden");
    loginError.textContent = "";
  }

  function showSignup() {
    panel.dataset.mode = "signup";
    tabSignup.classList.add("is-active");
    tabLogin.classList.remove("is-active");
    signupForm.classList.remove("is-hidden");
    loginForm.classList.add("is-hidden");
    signupError.textContent = "";
  }

  tabLogin.addEventListener("click", showLogin);
  tabSignup.addEventListener("click", showSignup);
  document.querySelectorAll("[data-switch-to]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      el.dataset.switchTo === "signup" ? showSignup() : showLogin();
    });
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    signupError.textContent = "";
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirm").value;

    if (!name || !email || !password) {
      signupError.textContent = "Fill in every field to create your account.";
      return;
    }
    if (password.length < 6) {
      signupError.textContent = "Use a password with at least 6 characters.";
      return;
    }
    if (password !== confirm) {
      signupError.textContent = "Passwords don't match.";
      return;
    }

    const users = getUsers();
    if (users[email]) {
      signupError.textContent = "An account with that email already exists — try logging in.";
      return;
    }

    const passwordHash = await sha256(password);
    users[email] = { name, passwordHash, createdAt: Date.now() };
    saveUsers(users);
    initUserState(email);
    setSession(email);
    window.location.href = "dashboard.html";
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const users = getUsers();
    const user = users[email];

    if (!user) {
      loginError.textContent = "No account found with that email. Try signing up instead.";
      return;
    }
    const passwordHash = await sha256(password);
    if (passwordHash !== user.passwordHash) {
      loginError.textContent = "Incorrect password. Give it another go.";
      return;
    }
    initUserState(email);
    setSession(email);
    window.location.href = "dashboard.html";
  });

  // Quick demo account so anyone can explore instantly
  const demoBtn = document.getElementById("demoLoginBtn");
  if (demoBtn) {
    demoBtn.addEventListener("click", async () => {
      const email = "demo@yourstocks.app";
      const users = getUsers();
      if (!users[email]) {
        users[email] = { name: "Demo Trader", passwordHash: await sha256("demo"), createdAt: Date.now() };
        saveUsers(users);
      }
      initUserState(email);
      setSession(email);
      window.location.href = "dashboard.html";
    });
  }
});
