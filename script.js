'use strict';
const LIVE_SITE = 'https://hirudo-care.bziksievmuhamed.chatgpt.site';
const form = document.querySelector('#booking form');
const card = document.querySelector('.booking-card');
const menu = document.querySelector('.menu');
const nav = document.querySelector('header nav');
menu?.addEventListener('click', () => {
  const open = nav.classList.toggle('mobile-open');
  menu.setAttribute('aria-expanded', String(open));
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('mobile-open'); menu?.setAttribute('aria-expanded', 'false');
}));
document.querySelectorAll('[data-privacy]').forEach(b => b.addEventListener('click', () => document.querySelector('#privacy').showModal()));
document.querySelector('#privacy .close-modal').addEventListener('click', () => document.querySelector('#privacy').close());
document.querySelector('[data-admin]').addEventListener('click', () => window.open(LIVE_SITE, '_blank', 'noopener'));
const phone = form.elements.phone;
phone.addEventListener('input', () => {
  let digits = phone.value.replace(/\D/g, '');
  if (digits[0] === '7' || digits[0] === '8') digits = digits.slice(1);
  digits = digits.slice(0, 10);
  phone.value = digits ? '+7 (' + digits.slice(0, 3) + (digits.length >= 3 ? ') ' : '') + digits.slice(3, 6) + (digits.length > 6 ? '-' : '') + digits.slice(6, 8) + (digits.length > 8 ? '-' : '') + digits.slice(8, 10) : '';
});
const error = document.createElement('p'); error.className = 'error'; error.setAttribute('role', 'alert'); error.hidden = true;
form.querySelector('.form-subtitle').after(error);
const schedule = document.querySelector('#schedule');
const submit = form.querySelector('[type=submit]');
let selectedSlot = '', slots = [];
const formatDate = d => new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', {day:'numeric',month:'long',weekday:'short'});
function showError(message) { error.textContent = message; error.hidden = !message; }
async function api(path, body) {
  const response = await fetch(path, {method:body ? 'POST' : 'GET', headers:body ? {'Content-Type':'application/json'} : {}, ...(body ? {body:JSON.stringify(body)} : {})});
  let data; try { data = await response.json(); } catch { throw new Error('Сервис временно недоступен. Попробуйте позже.'); }
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос.');
  return data;
}
async function loadSlots() {
  submit.disabled = true; selectedSlot = ''; schedule.textContent = 'Загружаем расписание…';
  try {
    const data = await api('/api/slots'); slots = data.slots;
    schedule.replaceChildren();
    if (!slots.length) {
      const p = document.createElement('p'); p.textContent = 'Пока нет свободного времени. Уточните запись в Telegram.';
      const a = document.createElement('a'); a.href = 'https://t.me/girudo07bot'; a.textContent = 'Открыть Telegram'; a.className = 'inline-link';
      schedule.append(p,a); return;
    }
    const label = document.createElement('label'); label.textContent = 'Дата приёма';
    const select = document.createElement('select'); select.required = true; select.add(new Option('Выберите дату', ''));
    [...new Set(slots.map(s => s.date))].forEach(d => select.add(new Option(formatDate(d), d)));
    label.append(select);
    const caption = document.createElement('div'); caption.className = 'time-label'; caption.textContent = 'Свободное время · МСК, UTC+3';
    const times = document.createElement('div'); times.className = 'times'; times.textContent = 'Сначала выберите дату';
    select.addEventListener('change', () => {
      selectedSlot = ''; submit.disabled = true; times.replaceChildren();
      slots.filter(s => s.date === select.value).forEach(s => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = s.time;
        b.addEventListener('click', () => {selectedSlot = s.id; times.querySelectorAll('button').forEach(x => x.classList.remove('selected')); b.classList.add('selected'); submit.disabled = false;});
        times.append(b);
      });
    });
    schedule.append(label,caption,times);
  } catch(e) {
    schedule.textContent = 'Не удалось загрузить расписание.';
    const a = document.createElement('a'); a.className = 'inline-link'; a.href = LIVE_SITE + '/#booking'; a.textContent = 'Записаться на основном сайте'; schedule.append(a);
    showError(e.message);
  }
}
form.addEventListener('submit', async e => {
  e.preventDefault(); if (!selectedSlot) {showError('Выберите день и свободное время.'); return;}
  submit.disabled = true; showError('');
  const fields = new FormData(form);
  try {
    const result = await api('/api/bookings', {name:fields.get('name'),phone:fields.get('phone'),slotId:selectedSlot,consent:fields.get('consent') === 'on'});
    card.innerHTML = '<div class="success"><div class="eyebrow">ЗАЯВКА СОХРАНЕНА</div><h3>Спасибо за доверие.</h3><p>Мы свяжемся с вами по указанному телефону для подтверждения приёма.</p><p>Подключите Telegram, чтобы получать уведомления, смотреть статус, переносить или отменять запись.</p><a class="primary" id="connect-bot" target="_blank" rel="noreferrer">Подключить Telegram ↗</a><p class="small">В боте нажмите «Старт». Не передавайте эту персональную ссылку другим.</p></div>';
    card.querySelector('#connect-bot').href = 'https://t.me/girudo07bot?start=connect_' + result.token.slice(0,56);
  } catch(e) {showError(e.message); await loadSlots();}
});
// GitHub Pages hosts static files. Booking continues on the existing server there.
if (location.hostname.endsWith('.github.io') || location.protocol === 'file:') {
  card.innerHTML = '<h3>Запись на приём</h3><p>Выберите удобное время на основном сайте. После заявки можно подключить Telegram.</p><a class="primary" href="' + LIVE_SITE + '/#booking">Выбрать время и записаться ↗</a>';
} else loadSlots();
