const FORM_ENDPOINT = "/api/rsvp";

const form = document.getElementById("rsvp-form");
const submitButton = document.getElementById("submit-btn");
const formStatus = document.getElementById("form-status");

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
    return false;
  }

  return true;
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
