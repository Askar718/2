const FORM_ENDPOINT = "/api/rsvp";
const WEDDING_DATE = "2026-08-08T17:00:00+05:00";

const form = document.getElementById("rsvp-form");
const submitButton = document.getElementById("submit-btn");
const formStatus = document.getElementById("form-status");
const revealItems = document.querySelectorAll("[data-reveal]");
const heroBackdrop = document.querySelector(".hero__backdrop");
const countdownElement = document.getElementById("countdown");

const validators = {
  name(value) {
    if (!value.trim()) return "Аты-жөніңізді енгізіңіз.";
    if (value.trim().length < 2) return "Аты-жөніңіз тым қысқа.";
    return "";
  },
  attendance(formData) {
    return formData.get("attendance") ? "" : "Қатысу мәртебесін таңдаңыз.";
  },
  phone(value) {
    if (!value.trim()) return "";
    const normalized = value.replace(/[\s()-]/g, "");
    const valid = /^\+?[0-9]{7,15}$/.test(normalized);
    return valid ? "" : "Телефон нөмірін дұрыс форматта енгізіңіз.";
  }
};

function setFieldError(name, message) {
  const target = document.querySelector(`[data-error-for="${name}"]`);
  if (target) target.textContent = message || "";
}

function clearStatus() {
  formStatus.textContent = "";
  formStatus.classList.remove("is-success", "is-error");
}

function setStatus(message, type) {
  formStatus.textContent = message;
  formStatus.classList.remove("is-success", "is-error");
  if (type) formStatus.classList.add(type);
}

function collectPayload(formData) {
  return {
    name: formData.get("name")?.trim() || "",
    guests: formData.get("guests")?.trim() || "",
    attendance: formData.get("attendance") || "",
    comment: formData.get("comment")?.trim() || "",
    phone: formData.get("phone")?.trim() || "",
    sentAt: new Date().toISOString(),
    page: window.location.href
  };
}

function validate(formData) {
  const errors = {
    name: validators.name(formData.get("name") || ""),
    attendance: validators.attendance(formData),
    phone: validators.phone(formData.get("phone") || "")
  };

  setFieldError("name", errors.name);
  setFieldError("attendance", errors.attendance);
  setFieldError("phone", errors.phone);

  const firstInvalidField = Object.keys(errors).find((key) => errors[key]);
  if (firstInvalidField) {
    const element =
      form.querySelector(`[name="${firstInvalidField}"]`) ||
      form.querySelector(`input[name="${firstInvalidField}"]`);
    element?.focus();
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  return true;
}

function initReveal() {
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.18,
    rootMargin: "0px 0px -6% 0px"
  });

  revealItems.forEach((item) => observer.observe(item));
}

function initHeroParallax() {
  if (!heroBackdrop || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let ticking = false;

  const update = () => {
    const offset = Math.min(window.scrollY * 0.16, 38);
    heroBackdrop.style.transform = `scale(1.06) translate3d(0, ${offset}px, 0)`;
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  update();
}

function updateCountdown() {
  if (!countdownElement) return;

  const targetDate = new Date(WEDDING_DATE).getTime();
  const now = Date.now();
  const diff = Math.max(0, targetDate - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  countdownElement.querySelector('[data-unit="days"]').textContent = String(days);
  countdownElement.querySelector('[data-unit="hours"]').textContent = String(hours).padStart(2, "0");
  countdownElement.querySelector('[data-unit="minutes"]').textContent = String(minutes).padStart(2, "0");
  countdownElement.querySelector('[data-unit="seconds"]').textContent = String(seconds).padStart(2, "0");
}

function initCountdown() {
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();

  const formData = new FormData(form);
  if (!validate(formData)) return;

  const payload = collectPayload(formData);

  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");
  setStatus("Жіберіліп жатыр…");

  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Сервер жауап бермеді.");
    }

    form.reset();
    setFieldError("name", "");
    setFieldError("attendance", "");
    setFieldError("phone", "");
    setStatus("Рақмет! Жауабыңыз сәтті қабылданды.", "is-success");
  } catch (error) {
    console.error(error);
    setStatus("Кешіріңіз, жауапты жіберу мүмкін болмады. Сәл кейінірек қайталап көріңіз.", "is-error");
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initReveal();
  initHeroParallax();
  initCountdown();
});
