/* Локальное приложение: данные сохраняются в браузере, сетевой отправки нет. */
(() => {
  "use strict";
  const D = window.RostDomain;
  const KEY = "rost-univer-v3";
  const app = document.getElementById("app");
  const modal = document.getElementById("modal");
  const ui = {
    userId: "anna",
    meetingView: "people",
    role: null,
    page: "dashboard",
    eventId: "forum",
    tab: "overview",
    query: "",
    status: "",
    access: "",
  };
  let state = D.seed();
  let storageError = "";
  let toastTimer;
  let chatEvent = "";
  let chatStatus = "Не подключено";
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.version !== 3 || !Array.isArray(parsed.events)) throw Error();
      state = parsed;
    }
  } catch {
    storageError =
      "Сохранённые данные недоступны. Изменения не будут их перезаписывать.";
  }
  state.meetings ||= [];

  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const admin = () => ui.role === "admin";
  const person = (id) => state.users.find((r) => r.id === id);
  const current = () => state.events.find((r) => r.id === ui.eventId);
  const rows = (key) => state[key].filter((r) => r.eventId === ui.eventId);
  const member = (id) =>
    state.memberships.find((r) => r.eventId === id && r.userId === ui.userId);
  const find = (key, id) => state[key].find((r) => r.id === id);
  const date = (value) =>
    value
      ? new Date(
          value.length === 16 ? value + ":00+03:00" : value,
        ).toLocaleString("ru-RU", {
          timeZone: "Europe/Moscow",
          day: "2-digit",
          month: "short",
          year: "numeric",
          ...(value.includes("T")
            ? { hour: "2-digit", minute: "2-digit" }
            : {}),
        })
      : "Не указано";
  const button = (label, action, id = "", type = "") =>
    '<button class="button ' +
    type +
    '" data-action="' +
    action +
    '" data-id="' +
    esc(id) +
    '">' +
    label +
    "</button>";
  const badge = (value) =>
    '<span class="badge ' +
    (/Отмен|Заблок|Удал/.test(value)
      ? "bad"
      : /Черновик|Заверш|Снята/.test(value)
        ? "neutral"
        : /работе|Ожидает|Новая/.test(value)
          ? "warn"
          : "") +
    '">' +
    esc(value) +
    "</span>";
  const heading = (title, note, actions = "") =>
    '<div class="heading"><div><h1>' +
    esc(title) +
    "</h1><p>" +
    esc(note) +
    '</p></div><div class="actions">' +
    actions +
    "</div></div>";
  const empty = (title, note = "Здесь появятся данные, когда организатор их добавит.") =>
    '<div class="empty"><h3>' +
    esc(title) +
    "</h3><p>" + esc(note) + "</p></div>";
  const info = (items) =>
    '<dl class="info-grid">' +
    items
      .map(
        (pair) =>
          "<div><dt>" +
          esc(pair[0]) +
          "</dt><dd>" +
          esc(pair[1] || "Не указано") +
          "</dd></div>",
      )
      .join("") +
    "</dl>";
  const table = (headers, records) =>
    records.length
      ? '<div class="table-wrap"><table><thead><tr>' +
        headers.map((h) => "<th>" + esc(h) + "</th>").join("") +
        "</tr></thead><tbody>" +
        records
          .map(
            (row) =>
              "<tr>" + row.map((c) => "<td>" + c + "</td>").join("") + "</tr>",
          )
          .join("") +
        '</tbody></table></div><div class="table-foot">Записей: ' +
        records.length +
        "</div>"
      : empty("Пока нет записей");
  const select = (name, values) =>
    '<select data-filter="' +
    name +
    '" aria-label="' +
    name +
    '">' +
    ["", ...values]
      .map(
        (v) =>
          '<option value="' +
          esc(v) +
          '" ' +
          (ui[name] === v ? "selected" : "") +
          ">" +
          esc(v || "Все") +
          "</option>",
      )
      .join("") +
    "</select>";
  const toolbar = (extra) =>
    '<div class="toolbar"><input aria-label="Поиск" data-filter="query" placeholder="Поиск по названию или имени" value="' +
    esc(ui.query) +
    '">' +
    (extra || "") +
    button("Сбросить", "clear", "", "text compact") +
    "</div>";

  function toast(text) {
    const target = document.getElementById("toast");
    target.textContent = text;
    target.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => target.classList.remove("show"), 4000);
  }

  // Сначала записываем целиком в хранилище, затем обновляем интерфейс.
  function commit(action, object, mutate) {
    if (storageError) throw Error(storageError);
    const next = D.clone(state);
    mutate(next);
    next.audit.unshift({
      id: D.uid(),
      time: new Date().toISOString(),
      actor: admin() ? "Максим Ильин" : person(ui.userId).name,
      action,
      object,
    });
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      throw Error(
        "Не удалось сохранить. Хранилище браузера недоступно или заполнено.",
      );
    }
    state = next;
  }

  function login() {
    app.innerHTML =
      '<main class="login"><form id="login-form" class="login-card"><div class="brand"><span class="logo">Р</span>РОСТ Универ</div><h1>Вход</h1><label class="field">Аккаунт<select name="role"><option value="user">Участник</option><option value="admin">Администратор</option></select></label><label class="field">Email<input name="email" type="email" autocomplete="username" required value="user@rost.ru"></label><label class="field">Пароль<input name="password" type="password" autocomplete="current-password" required></label><p class="error" id="login-error"></p><button class="button primary">Войти</button></form></main>';
    app.querySelector("[name=role]").onchange = (e) => {
      const isAdmin = e.target.value === "admin";
      app.querySelector("[name=email]").value = isAdmin
        ? "admin@rost.ru"
        : "user@rost.ru";
      app.querySelector("[name=password]").value = "";
    };
    app.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const error = document.getElementById("login-error");
      error.textContent = "";
      const complete = (result) => {
        ui.userId = result.user.id;
        ui.role = result.user.role;
        ui.page = result.user.role === "admin" ? "dashboard" : "my";
        render();
      };
      if (data.role === "admin") {
        form(
          "Подтверждение входа",
          [
            {
              name: "code",
              label: "Код подтверждения",
              required: true,
              pattern: "[0-9]{6}",
            },
          ],
          {},
          async ({ code }) => complete(await RostAPI.login(data.email, data.password, code)),
          "Войти",
          "Введите код администратора.",
        );
      } else {
        try { complete(await RostAPI.login(data.email, data.password)); }
        catch (failure) { error.textContent = failure.message; }
      }
    };
  }

  const adminNav = [
    ["dashboard", "▦", "Обзор"],
    ["events", "◫", "Мероприятия"],
    ["users", "♙", "Участники"],
    ["moderation", "◇", "Модерация"],
    ["news", "≡", "Новости"],
    ["audit", "↺", "Журнал действий"],
    ["settings", "⚙", "Настройки"],
  ];
  const userNav = [
    ["my", "▦", "Мои мероприятия"],
    ["catalog", "⌕", "Каталог"],
    ["news", "≡", "Новости"],
    ["profile", "○", "Профиль"],
  ];
  function render() {
    if (!ui.role) {
      login();
      return;
    }
    const nav = admin() ? adminNav : userNav;
    const active = ui.page === "event" ? (admin() ? "events" : "my") : ui.page;
    app.innerHTML =
      '<div class="shell"><aside class="sidebar"><div class="brand"><span class="logo">Р</span><div>РОСТ Универ<small>' +
      (admin() ? "ОРГАНИЗАЦИЯ СОБЫТИЙ" : "ЛИЧНЫЙ КАБИНЕТ") +
      '</small></div></div><div class="nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</div><nav class="nav">' +
      nav
        .map(
          ([id, icon, label]) =>
            '<button data-action="nav" data-id="' +
            id +
            '" class="' +
            (active === id ? "active" : "") +
            '"><span class="nav-icon">' +
            icon +
            "</span>" +
            label +
            "</button>",
        )
        .join("") +
      '</nav><div class="sidebar-foot"><strong>' +
      (admin() ? "Максим Ильин" : esc(person(ui.userId).name)) +
      "</strong><small>" +
      (admin() ? "Администратор" : "Участник") +
      '</small></div></aside><main><header class="topbar"><div class="breadcrumb">Ассоциация РОСТ / <span>' +
      esc(nav.find((n) => n[0] === active)?.[2] || "Мероприятие") +
      '</span></div><div class="actions"><span class="badge neutral">Демо-сервер · данные на этом Mac</span>' +
      button("Выйти", "logout", "", "text") +
      '</div></header><div class="content">' +
      (storageError
        ? '<div class="banner warn">' + esc(storageError) + "</div>"
        : "") +
      page() +
      "</div></main></div>";
  }

  function page() {
    if (ui.page === "event") return eventPage();
    if (ui.page === "dashboard") return dashboard();
    if (ui.page === "events") return eventsPage();
    if (ui.page === "my" || ui.page === "catalog") return catalog();
    if (ui.page === "users") return usersPage();
    if (ui.page === "news") return newsPage();
    if (ui.page === "moderation") return moderation();
    if (ui.page === "audit") return auditPage();
    if (ui.page === "settings") return settingsPage();
    if (ui.page === "profile") return profilePage();
    return "";
  }

  function dashboard() {
    const active = state.events.filter((r) =>
      ["Опубликовано", "Идёт"].includes(r.status),
    );
    const complaints = state.complaints.filter((r) => r.status === "Новая");
    const registrations = state.users.filter((r) => {
      const delta = new Date(D.DEMO_TIME) - new Date(r.registered);
      return delta >= 0 && delta < 7 * 864e5;
    }).length;
    const metrics = [
      ["Участники сообщества", state.users.length, "Учётные записи"],
      ["Активные мероприятия", active.length, "Опубликованы или идут"],
      ["Требуют модерации", complaints.length, "Новые обращения"],
      ["Регистрации за 7 дней", registrations, "На 21 сентября 2026"],
    ];
    return (
      heading(
        "Всё для следующей встречи",
        "Организация, участники и готовность мероприятий.",
      ) +
      '<div class="metrics">' +
      metrics
        .map(
          ([label, n, note]) =>
            '<article class="panel metric"><span>' +
            label +
            "</span><strong>" +
            n +
            "</strong><small>" +
            note +
            "</small></article>",
        )
        .join("") +
      "</div>" +
      '<div class="columns"><div class="stack"><section class="panel"><div class="panel-head"><h3>Ближайшие мероприятия</h3>' +
      button("Все мероприятия →", "nav", "events", "text compact") +
      "</div>" +
      table(
        ["Мероприятие", "Участники", "Статус"],
        active.map((r) => [
          button(esc(r.name), "open", r.id, "text compact") +
            "<small>" +
            date(r.start) +
            "</small>",
          state.memberships.filter((m) => m.eventId === r.id).length +
            " / " +
            r.capacity,
          badge(r.status),
        ]),
      ) +
      '</section><section class="panel"><div class="panel-head"><h3>Требует внимания</h3>' +
      button("Рассмотреть", "nav", "moderation", "text compact") +
      "</div>" +
      table(
        ["Причина", "Заявитель", "Поступила"],
        complaints.map((r) => [
          esc(r.reason),
          esc(r.reporter),
          date(r.created),
        ]),
      ) +
      '</section></div><section class="panel pad"><span class="eyebrow">Подготовка форума</span><h2 style="margin-top:12px">Ничего не упустить</h2>' +
      [
        [
          "Организаторы",
          state.organizers.filter((r) => r.eventId === "forum").length +
            " назначено",
        ],
        [
          "Ресурсы",
          state.resources.filter(
            (r) => r.eventId === "forum" && r.status === "Готово",
          ).length + " готово",
        ],
        [
          "Приглашения",
          state.memberships.filter(
            (r) => r.eventId === "forum" && r.invitation === "Ожидает ответа",
          ).length + " без ответа",
        ],
        [
          "Трансляция",
          find("events", "forum")?.stream ? "Ссылка добавлена" : "Нужна ссылка",
        ],
        [
          "Поездки",
          state.trips.filter((r) => r.eventId === "forum").length +
            " заполнено",
        ],
      ]
        .map(
          ([label, n]) =>
            '<div class="progress-row"><span>' +
            label +
            "</span><strong>" +
            n +
            "</strong></div>",
        )
        .join("") +
      '<div style="margin-top:20px">' +
      button("Открыть мероприятие →", "open", "forum", "primary") +
      "</div></section></div>"
    );
  }

  function eventsPage() {
    const records = state.events
      .filter(
        (r) =>
          r.name.toLowerCase().includes(ui.query.toLowerCase()) &&
          (!ui.status || r.status === ui.status) &&
          (!ui.access || r.access === ui.access),
      )
      .sort((a, b) => a.start.localeCompare(b.start));
    return (
      heading(
        "Мероприятия",
        "От первого приглашения до отъезда последнего участника.",
        button("+ Создать мероприятие", "event-edit", "", "primary"),
      ) +
      '<section class="panel">' +
      toolbar(
        select("status", [
          "Черновик",
          "Опубликовано",
          "Идёт",
          "Завершено",
          "Отменено",
        ]) + select("access", ["Открытое", "По коду"]),
      ) +
      table(
        [
          "Название / формат",
          "Начало · МСК",
          "Доступ / код",
          "Участники",
          "Статус",
          "",
        ],
        records.map((r) => [
          '<div class="title-cell">' +
            button(esc(r.name), "open", r.id, "text compact") +
            "<small>" +
            esc(r.format) +
            "</small></div>",
          date(r.start),
          esc(r.access) + "<small>" + esc(r.code) + "</small>",
          state.memberships.filter((m) => m.eventId === r.id).length +
            " / " +
            r.capacity,
          badge(r.status),
          button("Открыть →", "open", r.id, "compact"),
        ]),
      ) +
      "</section>"
    );
  }

  function catalog() {
    const items = state.events.filter(
      (r) =>
        (ui.page === "my"
          ? member(r.id)
          : r.access === "Открытое" && r.status !== "Черновик") &&
        r.name.toLowerCase().includes(ui.query.toLowerCase()),
    );
    return (
      heading(
        ui.page === "my" ? "Мои мероприятия" : "Каталог мероприятий",
        "Программа, приглашения и детали вашей поездки.",
        button("Вступить по коду", "join-code"),
      ) +
      toolbar() +
      '<div class="event-grid" style="margin-top:20px">' +
      items
        .map(
          (r) =>
            '<article class="panel event-card"><div class="event-card-top"><time><strong>' +
            r.start.slice(8, 10) +
            "</strong>" +
            date(r.start) +
            "</time>" +
            badge(r.status) +
            '</div><div class="pad"><span class="eyebrow">' +
            esc(r.format) +
            "</span><h2>" +
            esc(r.name) +
            '</h2><p class="muted">' +
            esc(r.location) +
            '</p><div class="actions">' +
            button("Открыть мероприятие", "open", r.id, "primary") +
            (member(r.id) ? badge("Вы записаны") : "") +
            "</div></div></article>",
        )
        .join("") +
      "</div>" +
      (items.length ? "" : empty("Мероприятия не найдены"))
    );
  }

  function eventPage() {
    const r = current();
    if (!r) return empty("Мероприятие не найдено");
    const tabs = admin()
      ? [
          ["overview", "Обзор"],
          ["agenda", "Программа"],
          ["speakers", "Спикеры"],
          ["organizers", "Организаторы"],
          ["resources", "Ресурсы"],
          ["members", "Участники"],
          ["invitations", "Приглашения"],
          ["video", "ВКС"],
          ["trips", "Логистика и проживание"],
          ["chat", "Чат"],
        ]
      : member(r.id)
        ? [
            ["overview", "Обзор"],
            ["agenda", "Программа"],
            ["speakers", "Спикеры"],
            ["organizers", "Организаторы"],
            ["meetings", "Встречи"],
            ["video", "ВКС"],
            ["mytrip", "Моя поездка"],
            ["chat", "Чат"],
          ]
        : [["overview", "Обзор"]];
    if (!tabs.some((t) => t[0] === ui.tab)) ui.tab = "overview";
    return (
      button("← К мероприятиям", "nav", admin() ? "events" : "my", "text") +
      '<div class="event-header"><div><div class="actions" style="margin-bottom:14px">' +
      badge(r.status) +
      '<span class="eyebrow">' +
      esc(r.format) +
      "</span></div><h1>" +
      esc(r.name) +
      '</h1><div class="event-meta"><span>' +
      date(r.start) +
      " · МСК</span><span>" +
      esc(r.location) +
      '</span></div></div><div class="actions">' +
      (admin()
        ? button("Редактировать", "event-edit", r.id, "primary")
        : member(r.id)
          ? button("Отменить участие", "leave", r.id)
          : ["Опубликовано", "Идёт"].includes(r.status)
            ? button("Записаться", "join", r.id, "primary")
            : "") +
      "</div></div>" +
      '<nav class="tabs" aria-label="Разделы мероприятия">' +
      tabs
        .map(
          ([id, label]) =>
            '<button data-action="tab" data-id="' +
            id +
            '" class="' +
            (id === ui.tab ? "active" : "") +
            '">' +
            label +
            "</button>",
        )
        .join("") +
      "</nav>" +
      eventContent()
    );
  }

  function eventContent() {
    const r = current();
    if (ui.tab === "overview")
      return (
        '<div class="columns"><section class="panel pad"><h2>О мероприятии</h2><p>' +
        esc(r.description || "Описание ещё не добавлено.") +
        "</p>" +
        info([
          ["Начало · МСК", date(r.start)],
          ["Окончание · МСК", date(r.end)],
          ["Место", r.location],
          ["Тип доступа", r.access],
        ]) +
        '</section><section class="panel pad"><h3>Участие</h3>' +
        info([
          ["Участники", rows("memberships").length + " из " + r.capacity],
          ["Код приглашения", r.code],
        ]) +
        '<div class="actions">' +
        (admin()
          ? button("Копировать код", "copy") +
            button(
              r.status === "Черновик"
                ? "Удалить черновик"
                : "Отменить мероприятие",
              "event-remove",
              r.id,
              "danger",
            )
          : member(r.id)
            ? button("В календарь", "ics", ui.userId, "primary")
            : "") +
        "</div></section></div>"
      );
    if (ui.tab === "organizers")
      return collection(
        "organizers",
        "Организаторы",
        "Контакты команды и зоны ответственности.",
        ["ФИО / роль", "Контакты", "Ответственность"],
        (r) => [
          esc(r.name) + "<small>" + esc(r.role) + "</small>",
          esc(r.email) + "<small>" + esc(r.phone) + "</small>",
          esc(r.responsibility),
        ],
      );
    if (ui.tab === "resources")
      return collection(
        "resources",
        "Ресурсы",
        "Помещения, оборудование и материалы.",
        ["Ресурс", "Количество", "Ответственный", "Готовность"],
        (r) => [
          esc(r.name) +
            "<small>" +
            esc(r.type) +
            " · " +
            esc(r.note) +
            "</small>",
          esc(r.quantity),
          esc(r.owner),
          badge(r.status),
        ],
      );
    if (ui.tab === "speakers")
      return collection(
        "speakers",
        "Спикеры",
        "Эксперты и темы выступлений.",
        ["Спикер", "Тема", "Время"],
        (r) => [
          esc(r.name) + "<small>" + esc(r.position) + "</small>",
          esc(r.topic) + "<small>" + esc(r.bio) + "</small>",
          esc(r.time),
        ],
      );
    if (ui.tab === "agenda")
      return collection(
        "agenda",
        "Программа",
        "Время выступлений — московское.",
        ["Время", "Название", "Спикер"],
        (r) => [esc(r.time), esc(r.title), esc(r.speaker)],
      );
    if (ui.tab === "members" || ui.tab === "invitations") return membersPage();
    if (ui.tab === "meetings") return meetingsPage();
    if (ui.tab === "invitation")
      return (
        '<section class="panel pad"><span class="eyebrow">Персональное приглашение</span><h2 style="margin-top:12px">' +
        esc(person(ui.userId).name) +
        ", ждём вас на мероприятии</h2>" +
        info([
          ["Мероприятие", r.name],
          ["Когда · МСК", date(r.start)],
          ["Место", r.location],
          ["Ваш ответ", member(r.id).invitation],
        ]) +
        '<div class="actions">' +
        button("Подтвердить участие", "accept", "", "primary") +
        button("Скачать приглашение .ics", "ics", ui.userId) +
        "</div></section>"
      );
    if (ui.tab === "stream")
      return (
        heading(
          "Трансляция",
          "Подключение к мероприятию по внешней ссылке.",
          admin() ? button("Настроить", "stream-edit", "", "primary") : "",
        ) +
        '<section class="panel pad"><h2>' +
        (r.stream ? "Ссылка на трансляцию" : "Трансляция ещё не настроена") +
        '</h2><p class="muted">' +
        esc(
          r.streamNote ||
            "Организатор добавит ссылку перед началом мероприятия.",
        ) +
        "</p>" +
        (D.safeUrl(r.stream)
          ? '<a class="button primary" target="_blank" rel="noopener noreferrer" href="' +
            esc(D.safeUrl(r.stream)) +
            '">Открыть трансляцию ↗</a>'
          : "") +
        "</section>"
      );
    if (ui.tab === "video") return videoPage();
    if (ui.tab === "trips")
      return (
        heading(
          "Логистика и проживание",
          "Прилёт, отлёт, трансфер и размещение участников.",
          button("+ Добавить поездку", "add:trips", "", "primary"),
        ) +
        '<section class="panel">' +
        table(
          ["Участник", "Прибытие · МСК", "Отъезд · МСК", "Проживание", ""],
          rows("trips").map((t) => [
            esc(person(t.userId)?.name),
            esc(t.travelMode || "Поездка") +
              "<small>" +
              esc(t.travelNote || "") +
              "</small>" +
              date(t.arrival) +
              "<small>" +
              esc(t.arrivalFlight) +
              " · " +
              esc(t.arrivalPlace) +
              "</small>",
            date(t.departure) + "<small>" + esc(t.departureFlight) + "</small>",
            esc(t.hotel) +
              "<small>" +
              date(t.checkin) +
              " — " +
              date(t.checkout) +
              "</small>",
            button("Редактировать", "edit:trips", t.id, "compact"),
          ]),
        ) +
        "</section>"
      );
    if (ui.tab === "mytrip")
      return (
        heading(
          "Моя поездка",
          "Заполните или уточните данные для организатора.",
          button("Изменить данные поездки", "my-trip", "", "primary"),
        ) + trip(rows("trips").find((t) => t.userId === ui.userId))
      );
    if (ui.tab === "chat") return chat();
    return "";
  }

  function meetingsPage() {
    const mine = rows("meetings").filter((m) =>
      [m.from, m.to].includes(ui.userId),
    );
    const incoming = mine.filter((m) => m.to === ui.userId);
    const outgoing = mine.filter((m) => m.from === ui.userId);
    const cards = (list, incoming) =>
      list.length
        ? table(
            ["Участник / тема", "Время · МСК / место", "Статус", "Действия"],
            list.map((m) => [
              esc(person(incoming ? m.from : m.to)?.name) +
                "<small>" +
                esc(m.topic) +
                "</small>",
              date(m.start) +
                " — " +
                date(m.end) +
                "<small>" +
                esc(m.place) +
                "</small>",
              badge(m.status),
              (incoming && m.status === "Ожидает ответа"
                ? button("Принять", "meeting-accept", m.id, "compact primary") +
                  button("Отклонить", "meeting-decline", m.id, "compact")
                : "") +
                ((!incoming && m.status === "Ожидает ответа") ||
                m.status === "Принято"
                  ? button("Отменить", "meeting-cancel", m.id, "compact")
                  : ""),
            ]),
          )
        : empty(
            incoming
              ? "Входящих приглашений пока нет"
              : "Вы пока никого не пригласили",
            incoming ? "Здесь будут приглашения от других участников." : "Выберите человека в списке участников и предложите встречу.",
          );
    const people = rows("memberships").filter(
      (m) => m.userId !== ui.userId && person(m.userId)?.status === "Активна",
    );
    return (
      heading(
        "Встречи",
        "Договоритесь о личной встрече с участниками мероприятия. Приглашения сохраняются в этой локальной версии.",
      ) +
      '<nav class="tabs" aria-label="Разделы встреч">' +
      button(
        "Мои встречи · " + mine.length,
        "meeting-view",
        "mine",
        ui.meetingView === "mine" ? "primary" : "",
      ) +
      button(
        "Участники · " + people.length,
        "meeting-view",
        "people",
        ui.meetingView === "people" ? "primary" : "",
      ) +
      "</nav>" +
      (ui.meetingView === "mine"
        ? '<section class="panel pad"><h2>Входящие приглашения</h2>' +
          cards(incoming, true) +
          '</section><section class="panel pad" style="margin-top:20px"><h2>Исходящие приглашения</h2>' +
          cards(outgoing, false) +
          "</section>"
        : '<section class="panel">' +
          table(
            ["Участник", "Организация", "Встреча"],
            people.map((m) => {
              const p = person(m.userId);
              const existing = mine.find(
                (r) =>
                  [r.from, r.to].includes(p.id) &&
                  ["Ожидает ответа", "Принято"].includes(r.status),
              );
              return [
                esc(p.name) + "<small>" + esc(p.region) + "</small>",
                esc(p.organization),
                existing
                  ? badge(existing.status) +
                    button("Открыть", "meeting-view", "mine", "compact")
                  : button(
                      "Пригласить на встречу",
                      "meeting-invite",
                      p.id,
                      "compact primary",
                    ),
              ];
            }),
          ) +
          "</section>")
    );
  }

  // Регистрация и самостоятельное уточнение маршрута используют одну форму.
  function registration(eventId, editing = false) {
    const event = find("events", eventId);
    const existing = state.trips.find(
      (t) => t.eventId === eventId && t.userId === ui.userId,
    );
    const fields = [
      F("travelMode", "Как вы участвуете", {
        options: [
          "Поездка",
          "Я местный участник",
          "Онлайн",
          "Билеты ещё не куплены",
        ],
        wide: true,
      }),
      ...schemas.trips.filter((f) =>
        [
          "arrival",
          "arrivalFlight",
          "arrivalPlace",
          "departure",
          "departureFlight",
          "departurePlace",
        ].includes(f.name),
      ),
      F("travelNote", "Комментарий для организатора", {
        type: "textarea",
        wide: true,
        maxLength: 1000,
      }),
    ];
    form(
      editing ? "Мой прилёт и отлёт" : "Регистрация на мероприятие",
      fields,
      existing || {
        travelMode: event.format === "Онлайн" ? "Онлайн" : "Поездка",
      },
      (data) => {
        Object.keys(data).forEach((k) => (data[k] = data[k].trim()));
        D.validateTravel(data);
        if (data.travelMode !== "Поездка")
          for (const key of [
            "arrival",
            "arrivalFlight",
            "arrivalPlace",
            "departure",
            "departureFlight",
            "departurePlace",
          ])
            data[key] = "";
        commit(
          editing ? "Участник обновил маршрут" : "Регистрация с маршрутом",
          event.name,
          (next) => {
            if (!editing) D.join(next, eventId, ui.userId);
            const membership = next.memberships.find(
              (m) => m.eventId === eventId && m.userId === ui.userId,
            );
            if (!membership)
              throw Error("Сначала зарегистрируйтесь на мероприятие.");
            membership.invitation = "Принято";
            const index = next.trips.findIndex(
              (t) => t.eventId === eventId && t.userId === ui.userId,
            );
            const row = {
              ...(index >= 0 ? next.trips[index] : {}),
              ...data,
              id: existing?.id || D.uid(),
              eventId,
              userId: ui.userId,
              source: "Участник",
            };
            if (index >= 0) next.trips[index] = row;
            else next.trips.push(row);
          },
        );
        ui.eventId = eventId;
        ui.page = "event";
        ui.tab = "mytrip";
        render();
        toast(
          editing
            ? "Маршрут обновлён"
            : "Вы зарегистрированы. Маршрут доступен организатору.",
        );
      },
      editing ? "Сохранить маршрут" : "Зарегистрироваться",
      "Для поездки укажите прибытие и отъезд по московскому времени. Если билетов ещё нет, выберите соответствующий вариант — маршрут можно дополнить позже. Проживание и трансфер назначает организатор.",
    );
  }

  function collection(key, title, note, headers, cells) {
    return (
      heading(
        title,
        note,
        admin() ? button("+ Добавить", "add:" + key, "", "primary") : "",
      ) +
      '<section class="panel">' +
      table(
        [...headers, ...(admin() ? [""] : [])],
        rows(key).map((r) => [
          ...cells(r),
          ...(admin()
            ? [
                '<div class="actions">' +
                  button("Изменить", "edit:" + key, r.id, "text compact") +
                  button("Удалить", "delete:" + key, r.id, "danger compact") +
                  "</div>",
              ]
            : []),
        ]),
      ) +
      "</section>"
    );
  }

  function membersPage() {
    return (
      heading(
        ui.tab === "invitations" ? "Индивидуальные приглашения" : "Участники",
        "Скачайте календарное приглашение и передайте участнику. Почтовая отправка пока не подключена.",
        button("+ Пригласить", "invite", "", "primary") +
          button("Скачать CSV", "export-members"),
      ) +
      '<section class="panel">' +
      table(
        ["Участник", "Организация / регион", "Роль", "Приглашение", ""],
        rows("memberships").map((r) => {
          const p = person(r.userId);
          return [
            esc(p.name) + "<small>" + esc(p.email) + "</small>",
            esc(p.organization) + "<small>" + esc(p.region) + "</small>",
            esc(r.role),
            badge(r.invitation),
            '<div class="actions">' +
              button("Календарь", "ics", p.id, "compact") +
              button("Роль", "member-role", r.id, "text compact") +
              button("Исключить", "member-remove", r.id, "danger compact") +
              "</div>",
          ];
        }),
      ) +
      "</section>"
    );
  }

  function trip(r) {
    if (!r)
      return (
        '<section class="panel">' +
        empty("Поездка пока не оформлена") +
        '<p class="muted" style="padding:0 24px 24px">Контакты команды доступны во вкладке «Организаторы».</p></section>'
      );
    return (
      '<p class="muted">' +
      esc(r.travelMode || "Поездка") +
      (r.travelNote ? " · " + esc(r.travelNote) : "") +
      '</p><div class="trip-grid"><section class="panel pad"><span class="eyebrow">Прибытие</span><h2 style="margin-top:12px">' +
      date(r.arrival) +
      "</h2>" +
      info([
        ["Рейс / поезд", r.arrivalFlight],
        ["Место прибытия", r.arrivalPlace],
        ["Трансфер", r.transfer],
      ]) +
      '</section><section class="panel pad"><span class="eyebrow">Отъезд</span><h2 style="margin-top:12px">' +
      date(r.departure) +
      "</h2>" +
      info([
        ["Рейс / поезд", r.departureFlight],
        ["Место отправления", r.departurePlace],
      ]) +
      '</section><section class="panel pad"><span class="eyebrow">Проживание</span><h2 style="margin-top:12px">' +
      esc(r.hotel || "Не назначено") +
      "</h2>" +
      info([
        ["Адрес", r.address],
        ["Номер / тип", r.room],
        ["Заселение", date(r.checkin)],
        ["Выезд", date(r.checkout)],
      ]) +
      '<p class="muted">' +
      esc(r.note) +
      "</p></section></div>"
    );
  }

  function chat() {
    queueMicrotask(() => ensureChat(ui.eventId));
    return (
      '<section class="panel"><div class="panel-head"><h3>Чат мероприятия</h3><small>' + esc(chatStatus) + " · " +
      rows("memberships").length +
      " участников</small></div>" +
      rows("messages")
        .map(
          (r) =>
            '<article class="message ' +
            (r.userId === ui.userId ? "mine" : "") +
            '"><strong>' +
            esc(person(r.userId)?.name || "Администратор") +
            "</strong> <small>" +
            date(r.time) +
            "</small><p>" +
            esc(r.deleted ? "Сообщение удалено" : r.text) +
            "</p>" +
            (!r.deleted
              ? button(
                  admin() ? "Удалить" : "Пожаловаться",
                  admin() ? "message-delete" : "report",
                  r.id,
                  "text compact",
                )
              : "") +
            "</article>",
        )
        .join("") +
      (["Завершено", "Отменено"].includes(current().status)
        ? '<div class="banner">Чат доступен только для чтения.</div>'
        : '<form id="chat-form" class="compose"><input name="text" aria-label="Сообщение" maxlength="2000" required placeholder="Написать сообщение"><button class="button primary">Отправить</button></form>') +
      "</section>"
    );
  }

  function ensureChat(eventId) {
    if (chatEvent === eventId) return;
    chatEvent = eventId;
    chatStatus = "Подключение…";
    RostAPI.subscribe(eventId, (event) => {
      if (event.type === "history") {
        state.messages = state.messages.filter((row) => row.eventId !== eventId).concat(event.messages.map((row) => ({ id: row.id, eventId: row.eventId, userId: row.userId, text: row.text, time: row.time })));
      } else if (event.type === "chat.message" && !state.messages.some((row) => row.id === event.message.id)) {
        state.messages.push({ id: event.message.id, eventId: event.message.eventId, userId: event.message.userId, text: event.message.text, time: event.message.time });
      } else if (event.type === "status") chatStatus = event.status;
      else if (event.type === "error") toast(event.error);
      if (ui.page === "event" && ui.tab === "chat" && ui.eventId === eventId) render();
    }).catch((error) => { chatStatus = "Нет соединения"; toast(error.message); if (ui.tab === "chat") render(); });
  }

  function videoPage() {
    return heading("Видеоконференция", "Комната мероприятия с серверной проверкой доступа.", admin() ? button("Создать комнату", "room-create", "", "primary") : "") +
      '<section class="panel pad"><span class="eyebrow">LiveKit</span><h2>Комната мероприятия</h2><p class="muted">Перед входом браузер запросит доступ к камере и микрофону. Можно войти и включить их позже.</p>' + button("Подключиться", "room-join", "", "primary") + '</section>';
  }

  function usersPage() {
    const items = state.users.filter(
      (r) =>
        [r.name, r.email, r.phone, r.organization]
          .join(" ")
          .toLowerCase()
          .includes(ui.query.toLowerCase()) &&
        (!ui.status || r.status === ui.status),
    );
    return (
      heading(
        "Участники сообщества",
        "Профили и состояние учётных записей.",
        button("Скачать CSV", "export-users"),
      ) +
      '<section class="panel">' +
      toolbar(select("status", ["Активна", "Заблокирована"])) +
      table(
        ["Участник", "Организация", "Регион", "Мероприятий", "Статус", ""],
        items.map((r) => [
          esc(r.name) +
            "<small>" +
            esc(r.email) +
            "<br>" +
            esc(r.phone) +
            "</small>",
          esc(r.organization),
          esc(r.region),
          state.memberships.filter((m) => m.userId === r.id).length,
          badge(r.status),
          button("Карточка", "user-card", r.id, "compact"),
        ]),
      ) +
      "</section>"
    );
  }

  function newsPage() {
    return (
      heading(
        "Новости Ассоциации",
        "Анонсы и материалы сообщества.",
        admin() ? button("+ Создать новость", "add:news", "", "primary") : "",
      ) +
      '<section class="panel">' +
      table(
        ["Публикация", "Дата", "Статус", ""],
        state.news
          .filter((r) => admin() || r.status === "Опубликована")
          .map((r) => [
            '<div class="title-cell"><strong>' +
              esc(r.title) +
              "</strong><small>" +
              esc(r.summary) +
              "</small></div>",
            date(r.date),
            badge(r.status),
            button("Читать", "news-read", r.id, "compact") +
              (admin()
                ? button("Изменить", "edit:news", r.id, "text compact")
                : ""),
          ]),
      ) +
      "</section>"
    );
  }

  function moderation() {
    return (
      heading("Модерация", "Решение требует основания. История сохраняется.") +
      '<section class="panel">' +
      table(
        ["Обращение", "Сообщение", "Статус", ""],
        state.complaints.map((r) => [
          esc(r.reason) +
            "<small>" +
            esc(r.reporter) +
            " · " +
            date(r.created) +
            "</small>",
          '<div class="title-cell">' +
            esc(find("messages", r.messageId)?.text) +
            "</div>",
          badge(r.status) + "<small>" + esc(r.resolution) + "</small>",
          r.status === "Новая"
            ? button("Рассмотреть", "resolve", r.id, "primary compact")
            : "",
        ]),
      ) +
      '</section><section class="panel pad" style="margin-top:20px"><h3>Стоп-лист</h3><p>' +
      esc(state.settings.stopWords || "Не задан") +
      "</p>" +
      button("Изменить", "stopwords") +
      "</section>"
    );
  }

  function auditPage() {
    return (
      heading(
        "Журнал действий",
        "Локальная история изменений. В рабочем сервисе журнал будет храниться на сервере.",
        button("Скачать CSV", "export-audit"),
      ) +
      '<section class="panel">' +
      toolbar() +
      table(
        ["Время · МСК", "Кто", "Действие", "Объект"],
        state.audit
          .filter((r) =>
            [r.actor, r.action, r.object]
              .join(" ")
              .toLowerCase()
              .includes(ui.query.toLowerCase()),
          )
          .map((r) => [
            date(r.time),
            esc(r.actor),
            esc(r.action),
            esc(r.object),
          ]),
      ) +
      "</section>"
    );
  }

  function settingsPage() {
    return (
      heading("Настройки", "Контакты и параметры локальной версии.") +
      '<div class="columns"><section class="panel pad"><h2>Параметры сервиса</h2>' +
      info([
        ["Домены email", state.settings.domains],
        ["Поддержка", state.settings.support],
      ]) +
      button("Изменить", "settings-edit", "", "primary") +
      '</section><section class="panel pad"><h2>Резервная копия</h2><p class="muted">JSON-файл содержит все данные локальной версии.</p>' +
      button("Скачать резервную копию", "backup") +
      "</section></div>"
    );
  }

  function profilePage() {
    const p = person(ui.userId);
    return (
      heading(
        "Мой профиль",
        "Контактная информация и настройки.",
        button("Редактировать", "profile-edit", "", "primary"),
      ) +
      '<div class="columns"><section class="panel pad"><div class="organizer"><div class="avatar">АК</div><div><h2>' +
      esc(p.name) +
      '</h2><p class="muted">' +
      esc(p.organization) +
      "</p></div></div>" +
      info([
        ["Email", p.email],
        ["Телефон", p.phone],
        ["Регион", p.region],
      ]) +
      '</section><section class="panel pad"><h2>Уведомления</h2><p class="muted">Предпочтения сохраняются. Push-уведомления пока не подключены.</p>' +
      [
        ["news", "Новости"],
        ["chat", "Сообщения"],
        ["reminders", "Напоминания"],
      ]
        .map(
          ([key, label]) =>
            '<label class="check"><input type="checkbox" data-preference="' +
            key +
            '" ' +
            (state.settings[key] ? "checked" : "") +
            ">" +
            label +
            "</label>",
        )
        .join("") +
      "</section></div>"
    );
  }

  /* Доступные диалоги: встроенная валидация, фокус и закрытие Escape. */
  let priorFocus;
  function form(title, schema, values, save, label = "Сохранить", note = "") {
    priorFocus = document.activeElement;
    const controls = schema
      .map((f) => {
        const value = values[f.name] ?? f.value ?? "";
        const attr =
          ' name="' +
          f.name +
          '" ' +
          (f.required ? "required " : "") +
          (f.min !== undefined ? ' min="' + f.min + '"' : "") +
          (f.maxLength ? ' maxlength="' + f.maxLength + '"' : "") +
          (f.pattern ? ' pattern="' + f.pattern + '"' : "");
        const control = f.options
          ? "<select" +
            attr +
            ">" +
            f.options
              .map((option) => {
                const [id, text] = Array.isArray(option)
                  ? option
                  : [option, option];
                return (
                  '<option value="' +
                  esc(id) +
                  '" ' +
                  (String(id) === String(value) ? "selected" : "") +
                  ">" +
                  esc(text) +
                  "</option>"
                );
              })
              .join("") +
            "</select>"
          : f.type === "textarea"
            ? "<textarea" + attr + ">" + esc(value) + "</textarea>"
            : "<input" +
              attr +
              ' type="' +
              (f.type || "text") +
              '" value="' +
              esc(value) +
              '">';
        return (
          '<label class="field ' +
          (f.wide ? "wide" : "") +
          '">' +
          esc(f.label) +
          control +
          "</label>"
        );
      })
      .join("");
    modal.innerHTML =
      '<form id="modal-form"><header class="modal-head"><h2 id="modal-title">' +
      esc(title) +
      '</h2><button class="button text" type="button" data-close aria-label="Закрыть">✕</button></header><div class="modal-body">' +
      (note ? '<p class="muted">' + esc(note) + "</p>" : "") +
      '<div class="form-grid">' +
      controls +
      '</div><div id="form-error" role="alert" class="error"></div></div><footer class="modal-footer"><button type="button" class="button" data-close>Отмена</button><button class="button primary">' +
      esc(label) +
      "</button></footer></form>";
    modal
      .querySelectorAll("[data-close]")
      .forEach((b) => (b.onclick = closeModal));
    modal.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      try {
        await save(Object.fromEntries(new FormData(e.target)));
        closeModal();
      } catch (error) {
        document.getElementById("form-error").textContent = error.message;
      }
    };
    if (!modal.open) modal.showModal();
  }
  function closeModal() {
    modal.close();
    priorFocus?.focus();
  }
  function confirm(title, note, action) {
    form(
      title,
      [],
      {},
      () => {
        action();
        render();
        toast("Изменения сохранены");
      },
      "Подтвердить",
      note,
    );
  }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  const F = (name, label, extra = {}) => ({ name, label, ...extra });
  const schemas = {
    organizers: [
      F("name", "ФИО", { required: true }),
      F("role", "Роль", { required: true }),
      F("email", "Email", { type: "email", required: true }),
      F("phone", "Телефон"),
      F("responsibility", "Зона ответственности", {
        type: "textarea",
        wide: true,
      }),
    ],
    resources: [
      F("name", "Ресурс", { required: true }),
      F("type", "Тип", {
        options: ["Помещение", "Оборудование", "Материалы", "Услуга"],
      }),
      F("quantity", "Количество", {
        type: "number",
        min: 1,
        required: true,
        value: 1,
      }),
      F("owner", "Ответственный", { required: true }),
      F("status", "Готовность", {
        options: ["В работе", "Готово", "Не требуется"],
      }),
      F("note", "Примечание", { type: "textarea", wide: true }),
    ],
    speakers: [
      F("name", "ФИО", { required: true }),
      F("position", "Должность и организация", { required: true }),
      F("topic", "Тема", { required: true }),
      F("time", "Время · МСК", { type: "time", required: true }),
      F("bio", "Описание", { type: "textarea", wide: true }),
    ],
    agenda: [
      F("time", "Время · МСК", { type: "time", required: true }),
      F("title", "Название", { required: true }),
      F("speaker", "Спикер / ответственный", { wide: true }),
    ],
    news: [
      F("title", "Заголовок", { required: true, maxLength: 200, wide: true }),
      F("summary", "Анонс", { required: true, maxLength: 300, wide: true }),
      F("text", "Текст", { type: "textarea", required: true, wide: true }),
      F("date", "Дата", { type: "date", required: true, value: "2026-09-21" }),
      F("status", "Статус", { options: ["Черновик", "Опубликована", "Снята"] }),
    ],
    trips: [
      F("arrival", "Прибытие · МСК", { type: "datetime-local" }),
      F("arrivalFlight", "Рейс / поезд прибытия"),
      F("arrivalPlace", "Аэропорт / вокзал прибытия", { wide: true }),
      F("departure", "Отъезд · МСК", { type: "datetime-local" }),
      F("departureFlight", "Рейс / поезд отправления"),
      F("departurePlace", "Место отправления"),
      F("transfer", "Трансфер: время, встреча, контакт", { wide: true }),
      F("hotel", "Гостиница"),
      F("room", "Номер / тип размещения"),
      F("address", "Адрес", { wide: true }),
      F("checkin", "Заселение", { type: "date" }),
      F("checkout", "Выезд", { type: "date" }),
      F("note", "Примечание", { type: "textarea", wide: true }),
    ],
  };
  function editCollection(key, id) {
    const existing = id ? find(key, id) : null;
    const schema = [...schemas[key]];
    if (key === "trips") {
      const candidates = rows("memberships").map((r) => [
        r.userId,
        person(r.userId).name,
      ]);
      if (!candidates.length) throw Error("Сначала добавьте участника.");
      schema.unshift(
        F("userId", "Участник", {
          options: candidates,
          required: true,
          wide: true,
        }),
      );
    }
    form(
      existing ? "Редактирование записи" : "Новая запись",
      schema,
      existing || {},
      (data) => {
        Object.keys(data).forEach((k) => (data[k] = data[k].trim()));
        if (schema.some((f) => f.required && !data[f.name]))
          throw Error("Заполните обязательные поля.");
        if (key === "trips") {
          if (data.arrival && data.departure && data.departure <= data.arrival)
            throw Error("Отъезд должен быть позже прибытия.");
          if (data.checkin && data.checkout && data.checkout <= data.checkin)
            throw Error("Выезд должен быть позже заселения.");
          if (
            rows("trips").some((r) => r.userId === data.userId && r.id !== id)
          )
            throw Error("Поездка участника уже существует.");
        }
        commit(
          existing ? "Изменение записи" : "Создание записи",
          key +
            ": " +
            (data.name || data.title || person(data.userId)?.name || ""),
          (next) => {
            const row = {
              ...existing,
              ...data,
              id: existing?.id || D.uid(),
              ...(key !== "news" ? { eventId: ui.eventId } : {}),
            };
            if (existing)
              next[key] = next[key].map((r) => (r.id === id ? row : r));
            else next[key].push(row);
          },
        );
        render();
        toast("Запись сохранена");
      },
    );
  }
  function editEvent(id) {
    const existing = id ? find("events", id) : null;
    const schema = [
      F("name", "Название", { required: true, maxLength: 200, wide: true }),
      F("start", "Начало · МСК", { type: "datetime-local", required: true }),
      F("end", "Окончание · МСК", { type: "datetime-local", required: true }),
      F("format", "Формат", { options: ["Очно", "Онлайн", "Смешанный"] }),
      F("access", "Доступ", { options: ["Открытое", "По коду"] }),
      F("capacity", "Количество мест", {
        type: "number",
        min: 1,
        required: true,
        value: 100,
      }),
      F("status", "Статус", {
        options: ["Черновик", "Опубликовано", "Идёт", "Завершено", "Отменено"],
      }),
      F("location", "Место", { required: true, wide: true }),
      F("description", "Описание", { type: "textarea", wide: true }),
    ];
    form(
      existing ? "Настройки мероприятия" : "Создать мероприятие",
      schema,
      existing || {},
      (data) => {
        data.name = data.name.trim();
        data.location = data.location.trim();
        data.capacity = Number(data.capacity);
        D.validateEvent(data);
        if (!data.location) throw Error("Укажите место проведения.");
        if (
          existing &&
          existing.status !== "Черновик" &&
          data.status === "Черновик"
        )
          throw Error(
            "Опубликованное мероприятие нельзя вернуть в черновик. Используйте отмену, чтобы сохранить историю.",
          );
        if (
          existing &&
          state.memberships.filter((r) => r.eventId === id).length >
            data.capacity
        )
          throw Error("Лимит меньше числа участников.");
        const newId = existing?.id || D.uid();
        commit(
          existing ? "Изменение мероприятия" : "Создание мероприятия",
          data.name,
          (next) => {
            let code = existing?.code;
            const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            while (
              !code ||
              next.events.some((r) => r.code === code && r.id !== newId)
            )
              code = Array.from(
                crypto.getRandomValues(new Uint8Array(8)),
                (n) => alphabet[n % alphabet.length],
              ).join("");
            const record = {
              stream: "",
              streamNote: "",
              ...existing,
              ...data,
              id: newId,
              code,
            };
            if (existing)
              next.events = next.events.map((r) => (r.id === id ? record : r));
            else next.events.push(record);
          },
        );
        ui.eventId = newId;
        ui.page = "event";
        ui.tab = "overview";
        render();
        toast("Мероприятие сохранено");
      },
    );
  }

  async function action(type, id) {
    if (type === "logout") {
      await RostAPI.logout();
      chatEvent = "";
      ui.role = null;
      render();
      return;
    }
    if (type === "nav") {
      ui.page = id;
      ui.query = "";
      ui.status = "";
      ui.access = "";
      render();
      return;
    }
    if (type === "clear") {
      ui.query = "";
      ui.status = "";
      ui.access = "";
      render();
      return;
    }
    if (type === "open") {
      ui.eventId = id;
      ui.page = "event";
      ui.tab = "overview";
      render();
      return;
    }
    if (type === "tab") {
      ui.tab = id;
      render();
      return;
    }
    if (type === "join") {
      registration(id);
      return;
    }
    if (type === "my-trip") {
      registration(ui.eventId, true);
      return;
    }
    if (type === "room-create") { await RostAPI.createRoom(ui.eventId); toast("Комната создана"); return; }
    if (type === "room-join") {
      const access = await RostAPI.roomToken(ui.eventId);
      await RostRoom.open({ ...access, title: current().name });
      return;
    }
    if (type === "meeting-view") {
      ui.meetingView = id;
      render();
      return;
    }
    if (type === "meeting-invite") {
      form(
        "Встреча с «" + person(id).name + "»",
        [
          F("topic", "Тема встречи", {
            required: true,
            maxLength: 150,
            wide: true,
          }),
          F("start", "Начало · МСК", {
            type: "datetime-local",
            required: true,
          }),
          F("end", "Окончание · МСК", {
            type: "datetime-local",
            required: true,
          }),
          F("place", "Место или ссылка", {
            required: true,
            maxLength: 300,
            wide: true,
          }),
        ],
        { start: current().start },
        (data) => {
          Object.keys(data).forEach((k) => (data[k] = data[k].trim()));
          commit("Приглашение на встречу", person(id).name, (next) =>
            D.inviteMeeting(next, ui.eventId, ui.userId, id, data),
          );
          ui.meetingView = "mine";
          render();
          toast("Приглашение отправлено в локальный кабинет участника");
        },
        "Пригласить",
        "Время встречи должно быть в пределах мероприятия. Email не отправляется.",
      );
      return;
    }
    if (
      ["meeting-accept", "meeting-decline", "meeting-cancel"].includes(type)
    ) {
      const status = {
        "meeting-accept": "Принято",
        "meeting-decline": "Отклонено",
        "meeting-cancel": "Отменено",
      }[type];
      commit("Ответ на встречу: " + status, current().name, (next) =>
        D.respondMeeting(next, id, ui.userId, status),
      );
      render();
      toast("Статус встречи обновлён");
      return;
    }
    if (type === "join-code") {
      form(
        "Вступить по коду",
        [F("code", "Код мероприятия", { required: true, wide: true })],
        {},
        (data) => {
          const found = state.events.find(
            (r) =>
              r.code === data.code.replace(/[\s-]/g, "").toUpperCase() &&
              ["Опубликовано", "Идёт"].includes(r.status),
          );
          if (!found) throw Error("Мероприятие не найдено.");
          ui.eventId = found.id;
          ui.page = "event";
          ui.tab = "overview";
          render();
          if (!member(found.id)) setTimeout(() => registration(found.id), 0);
        },
        "Присоединиться",
      );
      return;
    }
    if (type === "leave") {
      confirm(
        "Отменить участие?",
        "Вы потеряете доступ к чату и материалам.",
        () =>
          commit("Отмена участия", current().name, (next) => {
            next.meetings
              .filter(
                (m) =>
                  m.eventId === id &&
                  [m.from, m.to].includes(ui.userId) &&
                  ["Ожидает ответа", "Принято"].includes(m.status),
              )
              .forEach((m) => (m.status = "Отменено"));
            next.memberships = next.memberships.filter(
              (r) => !(r.eventId === id && r.userId === ui.userId),
            );
          }),
      );
      return;
    }
    if (type === "accept") {
      if (["Отменено", "Завершено"].includes(current().status))
        throw Error("Подтверждение участия в этом мероприятии закрыто.");
      commit("Принято приглашение", current().name, (next) => {
        next.memberships.find(
          (r) => r.eventId === ui.eventId && r.userId === ui.userId,
        ).invitation = "Принято";
      });
      render();
      toast("Участие подтверждено");
      return;
    }
    if (type === "ics") {
      if (!admin() && id !== ui.userId) throw Error("Приглашение недоступно.");
      download(
        "rost-" + current().code + "-" + id + ".ics",
        D.calendar(current(), person(id)),
        "text/calendar;charset=utf-8",
      );
      toast("Календарный файл подготовлен");
      return;
    }
    if (type === "news-read") {
      const r = find("news", id);
      form(r.title, [], {}, () => {}, "Закрыть", r.text);
      return;
    }
    if (type === "profile-edit") {
      form(
        "Мои данные",
        [
          F("name", "ФИО", { required: true }),
          F("phone", "Телефон", { required: true }),
          F("region", "Регион", { required: true }),
          F("organization", "Организация", { required: true }),
        ],
        person(ui.userId),
        (data) => {
          commit("Изменение профиля", data.name, (next) =>
            Object.assign(
              next.users.find((r) => r.id === ui.userId),
              data,
            ),
          );
          render();
        },
      );
      return;
    }
    if (type === "report") {
      form(
        "Пожаловаться",
        [
          F("reason", "Причина", {
            type: "textarea",
            required: true,
            wide: true,
          }),
        ],
        {},
        (data) => {
          commit("Жалоба", id, (next) =>
            next.complaints.unshift({
              id: D.uid(),
              eventId: ui.eventId,
              messageId: id,
              reporter: person(ui.userId).name,
              reason: data.reason,
              created: new Date().toISOString(),
              status: "Новая",
              resolution: "",
            }),
          );
          render();
          toast("Жалоба добавлена в очередь");
        },
      );
      return;
    }
    if (!admin()) throw Error("Действие доступно администратору.");
    if (type === "event-edit") {
      editEvent(id);
      return;
    }
    if (type.startsWith("add:") || type.startsWith("edit:")) {
      editCollection(type.split(":")[1], id);
      return;
    }
    if (type.startsWith("delete:")) {
      const key = type.split(":")[1];
      confirm("Удалить запись?", "Запись будет удалена из мероприятия.", () =>
        commit("Удаление записи", key, (next) => {
          next[key] = next[key].filter((r) => r.id !== id);
        }),
      );
      return;
    }
    if (type === "event-remove") {
      const r = find("events", id);
      confirm(
        r.status === "Черновик" ? "Удалить черновик?" : "Отменить мероприятие?",
        r.status === "Черновик"
          ? "Черновик и его данные будут удалены."
          : "Событие останется в истории, запись будет закрыта.",
        () =>
          commit("Удаление / отмена", r.name, (next) => {
            if (r.status === "Черновик") {
              next.events = next.events.filter((e) => e.id !== id);
              [
                "memberships",
                "organizers",
                "resources",
                "trips",
                "meetings",
                "speakers",
                "agenda",
                "messages",
                "complaints",
              ].forEach(
                (key) =>
                  (next[key] = next[key].filter((e) => e.eventId !== id)),
              );
              ui.page = "events";
            } else next.events.find((e) => e.id === id).status = "Отменено";
          }),
      );
      return;
    }
    if (type === "copy") {
      try {
        await navigator.clipboard.writeText(current().code);
        toast("Код скопирован");
      } catch {
        form(
          "Код приглашения",
          [F("code", "Скопируйте код", { wide: true })],
          { code: current().code },
          () => {},
          "Закрыть",
        );
      }
      return;
    }
    if (type === "invite") {
      const candidates = state.users.filter(
        (p) =>
          p.status === "Активна" &&
          !rows("memberships").some((r) => r.userId === p.id),
      );
      if (!candidates.length)
        throw Error("Все активные пользователи уже приглашены.");
      form(
        "Пригласить участника",
        [
          F("userId", "Пользователь", {
            options: candidates.map((p) => [p.id, p.name + " · " + p.email]),
            wide: true,
          }),
        ],
        {},
        (data) => {
          commit("Приглашение участника", person(data.userId).name, (next) =>
            D.join(next, ui.eventId, data.userId),
          );
          render();
          toast("Участник добавлен. Приглашение доступно для скачивания.");
        },
      );
      return;
    }
    if (type === "member-role") {
      const r = find("memberships", id);
      form(
        "Роль в мероприятии",
        [
          F("role", "Роль", {
            options: ["Участник", "Спикер", "Модератор"],
            wide: true,
          }),
        ],
        r,
        (data) => {
          commit("Изменение роли", person(r.userId).name, (next) =>
            Object.assign(
              next.memberships.find((m) => m.id === id),
              data,
            ),
          );
          render();
        },
      );
      return;
    }
    if (type === "member-remove") {
      const r = find("memberships", id);
      form(
        "Исключить участника",
        [
          F("reason", "Причина", {
            type: "textarea",
            required: true,
            wide: true,
          }),
        ],
        {},
        (data) => {
          commit(
            "Исключение: " + data.reason,
            person(r.userId).name,
            (next) => {
              next.memberships = next.memberships.filter((m) => m.id !== id);
            },
          );
          render();
        },
      );
      return;
    }
    if (type === "stream-edit") {
      form(
        "Настройка трансляции",
        [
          F("stream", "HTTPS-ссылка", { type: "url", wide: true }),
          F("streamNote", "Инструкция", { type: "textarea", wide: true }),
        ],
        current(),
        (data) => {
          if (data.stream && !D.safeUrl(data.stream))
            throw Error("Используйте ссылку https://.");
          commit("Изменение трансляции", current().name, (next) =>
            Object.assign(
              next.events.find((r) => r.id === ui.eventId),
              data,
            ),
          );
          render();
        },
      );
      return;
    }
    if (type === "message-delete") {
      confirm(
        "Удалить сообщение?",
        "Текст будет заменён отметкой об удалении.",
        () =>
          commit("Удаление сообщения", id, (next) => {
            next.messages.find((r) => r.id === id).deleted = true;
          }),
      );
      return;
    }
    if (type === "resolve") {
      const r = find("complaints", id);
      form(
        "Решение по жалобе",
        [
          F("decision", "Решение", {
            options: ["Удалить сообщение", "Отклонить жалобу"],
            wide: true,
          }),
          F("reason", "Основание", {
            type: "textarea",
            required: true,
            wide: true,
          }),
        ],
        {},
        (data) => {
          if (!data.reason.trim()) throw Error("Укажите основание.");
          commit(data.decision, id, (next) => {
            const c = next.complaints.find((i) => i.id === id);
            c.status = "Обработана";
            c.resolution = data.decision + ": " + data.reason;
            if (data.decision === "Удалить сообщение")
              next.messages.find((m) => m.id === r.messageId).deleted = true;
          });
          render();
        },
      );
      return;
    }
    if (type === "user-card") {
      const p = person(id);
      form(
        p.name,
        [
          F("status", "Состояние аккаунта", {
            options: ["Активна", "Заблокирована"],
            wide: true,
          }),
          F("reason", "Основание изменения", {
            type: "textarea",
            required: true,
            wide: true,
          }),
        ],
        p,
        (data) => {
          commit("Изменение статуса: " + data.reason, p.name, (next) => {
            next.users.find((r) => r.id === id).status = data.status;
          });
          render();
        },
        "Сохранить",
        p.email + " · " + p.organization,
      );
      return;
    }
    if (type === "stopwords") {
      form(
        "Стоп-лист",
        [
          F("stopWords", "Выражения через запятую", {
            type: "textarea",
            wide: true,
          }),
        ],
        state.settings,
        (data) => {
          commit("Изменение стоп-листа", "Чаты", (next) =>
            Object.assign(next.settings, data),
          );
          render();
        },
      );
      return;
    }
    if (type === "settings-edit") {
      form(
        "Параметры сервиса",
        [
          F("domains", "Доменные зоны", { required: true }),
          F("support", "Email поддержки", { type: "email", required: true }),
        ],
        state.settings,
        (data) => {
          commit("Настройки", "Параметры", (next) =>
            Object.assign(next.settings, data),
          );
          render();
        },
      );
      return;
    }
    if (type === "backup") {
      download(
        "rost-backup.json",
        JSON.stringify(state, null, 2),
        "application/json",
      );
      toast("Резервная копия подготовлена");
      return;
    }
    if (type.startsWith("export-")) {
      const kind = type.slice(7);
      form(
        "Скачать CSV?",
        [],
        {},
        () => {
          const output =
            kind === "audit"
              ? [
                  ["Время", "Кто", "Действие", "Объект"],
                  ...state.audit.map((r) => [
                    r.time,
                    r.actor,
                    r.action,
                    r.object,
                  ]),
                ]
              : [
                  ["ФИО", "Email", "Телефон", "Регион", "Организация"],
                  ...(kind === "members"
                    ? rows("memberships").map((r) => person(r.userId))
                    : state.users
                  ).map((p) => [
                    p.name,
                    p.email,
                    p.phone,
                    p.region,
                    p.organization,
                  ]),
                ];
          commit("Выгрузка CSV", kind, () => {});
          download(
            "rost-" + kind + ".csv",
            D.csv(output),
            "text/csv;charset=utf-8",
          );
          render();
          toast("CSV подготовлен для скачивания");
        },
        "Скачать",
        kind === "audit"
          ? "Скачать локальную историю действий?"
          : "Файл содержит контактные данные. Выгрузка будет записана в журнал.",
      );
      return;
    }
  }

  app.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (b)
      action(b.dataset.action, b.dataset.id).catch((error) =>
        toast(error.message),
      );
  });
  function applyFilter(input) {
    const name = input.dataset.filter,
      position = input.selectionStart;
    ui[name] = input.value;
    render();
    const replacement = app.querySelector('[data-filter="' + name + '"]');
    replacement?.focus();
    if (replacement?.tagName === "INPUT")
      replacement.setSelectionRange(position, position);
  }
  app.addEventListener("input", (e) => {
    if (e.target.dataset.filter) applyFilter(e.target);
  });
  app.addEventListener("change", (e) => {
    if (e.target.dataset.filter && e.target.tagName === "SELECT")
      applyFilter(e.target);
    if (e.target.dataset.preference) {
      try {
        commit(
          "Предпочтения уведомлений",
          e.target.dataset.preference,
          (next) => {
            next.settings[e.target.dataset.preference] = e.target.checked;
          },
        );
        toast("Сохранено");
      } catch (error) {
        toast(error.message);
        render();
      }
    }
  });
  app.addEventListener("submit", (e) => {
    if (e.target.id !== "chat-form") return;
    e.preventDefault();
    try {
      const text = new FormData(e.target).get("text").trim();
      if (!text) return;
      if (text.length > 2000) throw Error("Не более 2000 символов.");
      if (
        state.settings.stopWords
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
          .some((s) => text.toLowerCase().includes(s))
      )
        throw Error("Сообщение содержит выражение из стоп-листа.");
      RostAPI.sendMessage(ui.eventId, text);
      e.target.reset();
    } catch (error) {
      toast(error.message);
    }
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      try {
        const updated = JSON.parse(e.newValue);
        if (updated.version === 3) {
          updated.meetings ||= [];
          state = updated;
          render();
        }
      } catch {
        toast("Не удалось обновить данные из другой вкладки.");
      }
    }
  });
  (async () => {
    const active = await RostAPI.session();
    if (active?.user) {
      ui.userId = active.user.id;
      ui.role = active.user.role;
      ui.page = active.user.role === "admin" ? "dashboard" : "my";
    }
    render();
  })();
})();
