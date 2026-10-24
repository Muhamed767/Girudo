"use strict";

const LIVE_SITE = "https://hirudo-care.bziksievmuhamed.chatgpt.site";
const form = document.querySelector("#booking form");
const card = document.querySelector(".booking-card");
const menuButton = document.querySelector(".menu");
const navigation = document.querySelector("header nav");
const schedule = document.querySelector("#schedule");
const submitButton = form.querySelector('[type="submit"]');
const errorMessage = document.createElement("p");

errorMessage.id = "form-error";
errorMessage.className = "error";
errorMessage.setAttribute("role", "alert");
errorMessage.hidden = true;
form.querySelector(".form-subtitle").after(errorMessage);

let selectedSlot = "";
let availableSlots = [];

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = !message;
}

async function request(path, data) {
  const options = {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : {},
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(path, options);
  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("Сервис временно недоступен. Попробуйте позже.");
  }

  if (!response.ok) {
    throw new Error(result.error || "Не удалось выполнить запрос.");
  }

  return result;
}

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "short",
  });
}

function createTimeButton(slot, container) {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = slot.time;

  button.addEventListener("click", () => {
    selectedSlot = slot.id;
    submitButton.disabled = false;

    container.querySelectorAll("button").forEach((item) => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
  });

  return button;
}

function renderSchedule() {
  schedule.replaceChildren();

  if (!availableSlots.length) {
    const message = document.createElement("p");
    const telegramLink = document.createElement("a");

    message.textContent =
      "Пока нет свободного времени. Уточните запись в Telegram.";
    telegramLink.href = "https://t.me/girudo07bot";
    telegramLink.className = "inline-link";
    telegramLink.textContent = "Открыть Telegram";

    schedule.append(message, telegramLink);
    return;
  }

  const dateLabel = document.createElement("label");
  const dateSelect = document.createElement("select");
  const timeCaption = document.createElement("div");
  const timeButtons = document.createElement("div");
  const dates = [...new Set(availableSlots.map((slot) => slot.date))];

  dateLabel.textContent = "Дата приёма";
  dateSelect.required = true;
  dateSelect.add(new Option("Выберите дату", ""));

  dates.forEach((date) => {
    dateSelect.add(new Option(formatDate(date), date));
  });

  timeCaption.className = "time-label";
  timeCaption.textContent = "Свободное время · МСК, UTC+3";
  timeButtons.className = "times";
  timeButtons.textContent = "Сначала выберите дату";

  dateSelect.addEventListener("change", () => {
    selectedSlot = "";
    submitButton.disabled = true;
    timeButtons.replaceChildren();

    const slotsForDate = availableSlots.filter(
      (slot) => slot.date === dateSelect.value,
    );

    slotsForDate.forEach((slot) => {
      timeButtons.append(createTimeButton(slot, timeButtons));
    });
  });

  dateLabel.append(dateSelect);
  schedule.append(dateLabel, timeCaption, timeButtons);
}

async function loadSchedule() {
  submitButton.disabled = true;
  selectedSlot = "";
  schedule.textContent = "Загружаем расписание…";

  try {
    const result = await request("/api/slots");

    availableSlots = result.slots;
    renderSchedule();
  } catch (error) {
    schedule.textContent = "Не удалось загрузить расписание.";

    const siteLink = document.createElement("a");
    siteLink.className = "inline-link";
    siteLink.href = `${LIVE_SITE}/#booking`;
    siteLink.textContent = "Записаться на основном сайте";
    schedule.append(siteLink);

    showError(error.message);
  }
}

function showBookingConfirmation(token) {
  card.innerHTML = `
    <div class="success">
      <div class="eyebrow">ЗАЯВКА СОХРАНЕНА</div>
      <h3>Спасибо за доверие.</h3>
      <p>
        Мы свяжемся с вами по указанному телефону для подтверждения приёма.
      </p>
      <p>
        Подключите Telegram, чтобы получать уведомления, смотреть статус,
        переносить или отменять запись.
      </p>
      <a class="primary" id="connect-bot" target="_blank" rel="noreferrer">
        Подключить Telegram ↗
      </a>
      <p class="small">
        В боте нажмите «Старт». Не передавайте эту персональную ссылку другим.
      </p>
    </div>
  `;

  const botLink = card.querySelector("#connect-bot");
  botLink.href = `https://t.me/girudo07bot?start=connect_${token.slice(0, 56)}`;
}

function showStaticHostingNotice() {
  card.innerHTML = `
    <h3>Запись на приём</h3>
    <p>
      Выберите удобное время на основном сайте. После заявки можно подключить
      Telegram.
    </p>
    <a class="primary" href="${LIVE_SITE}/#booking">
      Выбрать время и записаться ↗
    </a>
  `;
}

menuButton?.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("mobile-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navigation.classList.remove("mobile-open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

document.querySelectorAll("[data-privacy]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#privacy").showModal();
  });
});

document.querySelector("#privacy .close-modal").addEventListener("click", () => {
  document.querySelector("#privacy").close();
});

document.querySelector("[data-admin]").addEventListener("click", () => {
  window.open(LIVE_SITE, "_blank", "noopener");
});

form.elements.phone.addEventListener("input", (event) => {
  let digits = event.currentTarget.value.replace(/\D/g, "");

  if (digits[0] === "7" || digits[0] === "8") {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 10);

  const areaCode = digits.slice(0, 3);
  const firstPart = digits.slice(3, 6);
  const secondPart = digits.slice(6, 8);
  const thirdPart = digits.slice(8, 10);

  let formatted = digits ? `+7 (${areaCode}` : "";

  if (digits.length >= 3) formatted += ") ";
  if (firstPart) formatted += firstPart;
  if (digits.length > 6) formatted += `-${secondPart}`;
  if (digits.length > 8) formatted += `-${thirdPart}`;

  event.currentTarget.value = formatted;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedSlot) {
    showError("Выберите день и свободное время.");
    return;
  }

  submitButton.disabled = true;
  showError("");

  const formData = new FormData(form);
  const booking = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    slotId: selectedSlot,
    consent: formData.get("consent") === "on",
  };

  try {
    const result = await request("/api/bookings", booking);
    showBookingConfirmation(result.token);
  } catch (error) {
    showError(error.message);
    await loadSchedule();
  }
});

if (location.hostname.endsWith(".github.io") || location.protocol === "file:") {
  showStaticHostingNotice();
} else {
  loadSchedule();
}
