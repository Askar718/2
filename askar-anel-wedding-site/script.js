const FORM_ENDPOINT = "/api/rsvp";
const WEDDING_DATE = "2026-08-08T17:00:00+05:00";

const form = document.getElementById("rsvp-form");
const submitButton = document.getElementById("submit-btn");
const formStatus = document.getElementById("form-status");
const revealItems = document.querySelectorAll("[data-reveal]");
const heroMedia = document.querySelector(".hero__media");
const countdownParts = {
  days: document.querySelector('[data-part="days"]'),
  hours: document.querySelector('[data-part="hours"]'),
  minutes: document.querySelector('[data-part="minutes"]')
};
const mobileBar = document.querySelector(".mobile-bar");
const rsvpSection = document.getElementById("rsvp");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  if (!formStatus) return;
  formStatus.textContent = "";
  formStatus.classList.remove("is-success", "is-error");
}

function setStatus(message, type) {
  if (!formStatus) return;
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
      form?.querySelector(`[name="${firstInvalidField}"]`) ||
      form?.querySelector(`input[name="${firstInvalidField}"]`);
    element?.focus();
    return false;
  }

  return true;
}

async function handleSubmit(event) {
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
}

function initReveal() {
  if (!revealItems.length) return;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      obs.unobserve(entry.target);
    });
  }, {
    threshold: 0.18,
    rootMargin: "0px 0px -8% 0px"
  });

  revealItems.forEach((item) => observer.observe(item));
}

function updateCountdown() {
  if (!countdownParts.days) return;
  const target = new Date(WEDDING_DATE).getTime();
  const now = Date.now();
  const diff = Math.max(target - now, 0);

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  countdownParts.days.textContent = String(days);
  countdownParts.hours.textContent = String(hours).padStart(2, "0");
  countdownParts.minutes.textContent = String(minutes).padStart(2, "0");
}

function initHeroMotion() {
  if (!heroMedia || prefersReducedMotion) return;

  const onScroll = () => {
    const offset = Math.min(window.scrollY * 0.08, 28);
    heroMedia.style.transform = `scale(1.06) translate3d(0, ${offset}px, 0)`;
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function toggleKeyboardState(isOpen) {
  document.body.classList.toggle("keyboard-open", isOpen);
}

function initKeyboardHelpers() {
  document.addEventListener("focusin", (event) => {
    if (event.target.matches("input, textarea")) {
      toggleKeyboardState(true);
    }
  });

  document.addEventListener("focusout", () => {
    window.setTimeout(() => toggleKeyboardState(false), 120);
  });
}

function initMobileBarObserver() {
  if (!mobileBar || !rsvpSection || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const isHidden = entry.isIntersecting;
      mobileBar.style.opacity = isHidden ? "0" : "";
      mobileBar.style.transform = isHidden ? "translateY(100%)" : "";
      mobileBar.style.pointerEvents = isHidden ? "none" : "";
    });
  }, {
    threshold: 0.2
  });

  observer.observe(rsvpSection);
}

form?.addEventListener("submit", handleSubmit);

updateCountdown();
window.setInterval(updateCountdown, 60000);

initReveal();
initHeroMotion();
initKeyboardHelpers();
initMobileBarObserver();
