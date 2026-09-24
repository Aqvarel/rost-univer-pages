/* Чистая модель данных. Не зависит от DOM и проверяется отдельно от интерфейса. */
(function (root) {
  "use strict";

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const DEMO_TIME = "2026-09-21T12:00:00+03:00";

  function seed() {
    return {
      version: 3,
      meetings: [],
      users: [
        {
          id: "anna",
          name: "Анна Крылова",
          email: "user@rost.ru",
          phone: "+7 999 123-45-67",
          region: "Москва",
          organization: "Вектор развития",
          status: "Активна",
          role: "Участник",
          registered: "2026-09-17",
        },
        {
          id: "pavel",
          name: "Павел Смирнов",
          email: "p.smirnov@example.ru",
          phone: "+7 917 555-13-20",
          region: "Казань",
          organization: "Проектный офис",
          status: "Активна",
          role: "Участник",
          registered: "2026-09-18",
        },
        {
          id: "maria",
          name: "Мария Соколова",
          email: "m.sokolova@example.ru",
          phone: "+7 495 000-10-12",
          region: "Москва",
          organization: "Ассоциация РОСТ",
          status: "Активна",
          role: "Участник",
          registered: "2026-09-01",
        },
        {
          id: "igor",
          name: "Игорь Матвеев",
          email: "i.matveev@example.ru",
          phone: "+7 927 111-08-12",
          region: "Самара",
          organization: "Центр инициатив",
          status: "Активна",
          role: "Участник",
          registered: "2026-09-20",
        },
      ],
      events: [
        {
          id: "forum",
          name: "Форум регионального развития",
          start: "2026-09-24T10:00",
          end: "2026-09-24T18:00",
          format: "Смешанный",
          access: "Открытое",
          status: "Опубликовано",
          code: "K7XM4RTD",
          capacity: 100,
          location: "Москва, ул. Ильинка, 6",
          description:
            "Обмен практиками региональных команд. Обсудим партнёрства, развитие сообществ и реализацию совместных проектов.",
          stream: "",
          streamNote:
            "Подключение за 15 минут до начала. Ссылка появится после настройки трансляции.",
        },
        {
          id: "school",
          name: "Школа руководителя: сильная команда",
          start: "2026-10-02T11:00",
          end: "2026-10-02T14:30",
          format: "Онлайн",
          access: "По коду",
          status: "Опубликовано",
          code: "TR8M5K2P",
          capacity: 60,
          location: "Онлайн",
          description: "Практикум по управлению командой и совместной работе.",
          stream: "",
          streamNote: "",
        },
        {
          id: "lab",
          name: "Партнёрская лаборатория РОСТ",
          start: "2026-10-17T10:30",
          end: "2026-10-17T17:00",
          format: "Очно",
          access: "Открытое",
          status: "Опубликовано",
          code: "CM4N8R7K",
          capacity: 30,
          location: "Санкт-Петербург",
          description: "Рабочая сессия по новым партнёрским проектам.",
          stream: "",
          streamNote: "",
        },
        {
          id: "strategy",
          name: "Стратегическая сессия 2027",
          start: "2026-11-18T10:00",
          end: "2026-11-18T16:00",
          format: "Очно",
          access: "По коду",
          status: "Черновик",
          code: "ST7G5N2P",
          capacity: 40,
          location: "Москва",
          description: "",
          stream: "",
          streamNote: "",
        },
      ],
      memberships: [
        {
          id: "member1",
          eventId: "forum",
          userId: "anna",
          role: "Участник",
          invitation: "Принято",
          joined: "2026-09-17",
        },
        {
          id: "member2",
          eventId: "forum",
          userId: "pavel",
          role: "Участник",
          invitation: "Ожидает ответа",
          joined: "2026-09-18",
        },
        {
          id: "member3",
          eventId: "forum",
          userId: "maria",
          role: "Спикер",
          invitation: "Принято",
          joined: "2026-09-01",
        },
        {
          id: "member4",
          eventId: "forum",
          userId: "igor",
          role: "Участник",
          invitation: "Принято",
          joined: "2026-09-20",
        },
        {
          id: "member5",
          eventId: "school",
          userId: "anna",
          role: "Участник",
          invitation: "Принято",
          joined: "2026-09-18",
        },
      ],
      organizers: [
        {
          id: "org1",
          eventId: "forum",
          name: "Мария Соколова",
          role: "Координатор мероприятия",
          email: "m.sokolova@example.ru",
          phone: "+7 495 000-10-12",
          responsibility: "Программа и работа со спикерами",
        },
        {
          id: "org2",
          eventId: "forum",
          name: "Елена Романова",
          role: "Координатор участников",
          email: "e.romanova@example.ru",
          phone: "+7 495 000-10-14",
          responsibility: "Приглашения, трансферы и проживание",
        },
      ],
      resources: [
        {
          id: "res1",
          eventId: "forum",
          name: "Конференц-зал",
          type: "Помещение",
          quantity: 1,
          owner: "Елена Романова",
          status: "Готово",
          note: "Рассадка: театр, 100 мест",
        },
        {
          id: "res2",
          eventId: "forum",
          name: "Беспроводные микрофоны",
          type: "Оборудование",
          quantity: 4,
          owner: "Мария Соколова",
          status: "В работе",
          note: "Проверка звука 24 сентября в 09:00",
        },
      ],
      trips: [
        {
          id: "trip1",
          eventId: "forum",
          userId: "pavel",
          arrival: "2026-09-23T18:40",
          arrivalPlace: "Шереметьево, терминал B",
          arrivalFlight: "SU 1193",
          departure: "2026-09-25T19:15",
          departurePlace: "Шереметьево, терминал B",
          departureFlight: "SU 1194",
          transfer: "23 сентября, 19:10 · встреча у выхода",
          hotel: "Гостиница «Центральная»",
          address: "Москва, ул. Примерная, 10",
          checkin: "2026-09-23",
          checkout: "2026-09-25",
          room: "Одноместный",
          note: "Демонстрационные сведения; бронирование не выполнено.",
        },
      ],
      speakers: [
        {
          id: "speaker1",
          eventId: "forum",
          name: "Мария Соколова",
          position: "Ассоциация РОСТ",
          topic: "Регионы как пространство возможностей",
          time: "10:30",
          bio: "Эксперт по региональным партнёрствам.",
        },
      ],
      agenda: [
        {
          id: "agenda1",
          eventId: "forum",
          time: "10:00",
          title: "Открытие форума",
          speaker: "Команда Ассоциации РОСТ",
        },
        {
          id: "agenda2",
          eventId: "forum",
          time: "10:30",
          title: "Регионы как пространство возможностей",
          speaker: "Мария Соколова",
        },
      ],
      messages: [
        {
          id: "msg1",
          eventId: "forum",
          userId: "maria",
          text: "Добро пожаловать! Здесь можно задать вопросы организаторам.",
          time: DEMO_TIME,
        },
        {
          id: "msg2",
          eventId: "forum",
          userId: "igor",
          text: "Переходите по ссылке за специальным предложением.",
          time: DEMO_TIME,
        },
      ],
      complaints: [
        {
          id: "complaint1",
          eventId: "forum",
          messageId: "msg2",
          reporter: "Анна Крылова",
          reason: "Рекламное сообщение",
          created: "2026-09-20T17:00:00+03:00",
          status: "Новая",
          resolution: "",
        },
      ],
      news: [
        {
          id: "news1",
          title: "Открыта регистрация на форум",
          summary: "24 сентября встречаемся в Москве и онлайн.",
          text: "В программе — дискуссии, практические сессии и обмен опытом региональных команд.",
          status: "Опубликована",
          date: "2026-09-21",
        },
      ],
      settings: {
        domains: "ru, рф, su",
        support: "support@example.ru",
        stopWords: "спам-ссылка",
        news: true,
        chat: true,
        reminders: true,
      },
      audit: [],
    };
  }

  function validateEvent(event) {
    if (event.name.trim().length < 3)
      throw Error("Название должно содержать не менее 3 символов.");
    if (
      !event.start ||
      !event.end ||
      !Number.isFinite(Date.parse(event.start)) ||
      !Number.isFinite(Date.parse(event.end)) ||
      event.end <= event.start
    )
      throw Error("Окончание должно быть позже начала мероприятия.");
    if (!Number.isInteger(Number(event.capacity)) || event.capacity < 1)
      throw Error("Укажите целое число мест от 1.");
    if (event.stream && !safeUrl(event.stream))
      throw Error("Ссылка на трансляцию должна начинаться с https://.");
    return true;
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function join(state, eventId, userId) {
    const event = state.events.find((item) => item.id === eventId);
    const user = state.users.find((item) => item.id === userId);
    if (!event || !["Опубликовано", "Идёт"].includes(event.status))
      throw Error("Запись на это мероприятие недоступна.");
    if (!user || user.status !== "Активна")
      throw Error("Учётная запись неактивна.");
    if (
      state.memberships.some(
        (item) => item.eventId === eventId && item.userId === userId,
      )
    )
      throw Error("Участник уже записан.");
    if (
      state.memberships.filter((item) => item.eventId === eventId).length >=
      event.capacity
    )
      throw Error("Свободных мест нет.");
    state.memberships.push({
      id: uid(),
      eventId,
      userId,
      role: "Участник",
      invitation: "Ожидает ответа",
      joined: new Date().toISOString().slice(0, 10),
    });
  }

  // CSV: нейтрализуем формулы при открытии файла в табличных редакторах.
  function csv(rows) {
    const cell = (value) => {
      let text = String(value ?? "");
      if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    return "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
  }

  // Введённое время мероприятия — московское (UTC+3), независимо от компьютера.
  function calendar(event, user) {
    const escape = (value) =>
      String(value || "")
        .replaceAll("\\", "\\\\")
        .replace(/\r?\n/g, "\\n")
        .replaceAll(";", "\\;")
        .replaceAll(",", "\\,");
    const stamp = (value) =>
      new Date(value + ":00+03:00")
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ROST//Univer//RU",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${event.id}-${user.id}@rost.local`,
      `DTSTAMP:${new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
      `DTSTART:${stamp(event.start)}`,
      `DTEND:${stamp(event.end)}`,
      `SUMMARY:${escape(event.name)}`,
      `LOCATION:${escape(event.location)}`,
      `DESCRIPTION:${escape(`Приглашение для ${user.name}\n${event.description}\n${event.stream || ""}`)}`,
      "STATUS:" + (event.status === "Отменено" ? "CANCELLED" : "CONFIRMED"),
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    // RFC 5545: перенос строк по 75 октетам, включая кириллицу.
    return (
      lines
        .map((line) => {
          let output = "",
            count = 0;
          for (const character of line) {
            const length = new TextEncoder().encode(character).length;
            if (count + length > 75) {
              output += "\r\n ";
              count = 1;
            }
            output += character;
            count += length;
          }
          return output;
        })
        .join("\r\n") + "\r\n"
    );
  }

  function validateTravel(data) {
    if (data.travelMode !== "Поездка") return;
    if (
      !data.arrival ||
      !data.departure ||
      !Number.isFinite(Date.parse(data.arrival)) ||
      !Number.isFinite(Date.parse(data.departure))
    )
      throw Error("Укажите дату и время прибытия и отъезда.");
    if (data.departure <= data.arrival)
      throw Error("Отъезд должен быть позже прибытия.");
    if (!data.arrivalPlace?.trim() || !data.departurePlace?.trim())
      throw Error("Укажите место прибытия и отправления.");
  }

  function inviteMeeting(state, eventId, from, to, data) {
    const event = state.events.find((e) => e.id === eventId);
    if (!event || !["Опубликовано", "Идёт"].includes(event.status))
      throw Error("Встречи в этом мероприятии закрыты.");
    for (const id of [from, to]) {
      if (
        !state.memberships.some(
          (m) => m.eventId === eventId && m.userId === id,
        ) ||
        state.users.find((u) => u.id === id)?.status !== "Активна"
      )
        throw Error(
          "Оба участника должны быть зарегистрированы на мероприятие.",
        );
    }
    if (from === to) throw Error("Нельзя пригласить себя.");
    if (!data.topic?.trim() || !data.place?.trim())
      throw Error("Укажите тему и место встречи.");
    if (
      !Number.isFinite(Date.parse(data.start)) ||
      !Number.isFinite(Date.parse(data.end)) ||
      data.end <= data.start ||
      data.start < event.start ||
      data.end > event.end
    )
      throw Error(
        "Выберите время встречи в пределах мероприятия; окончание должно быть позже начала.",
      );
    state.meetings ||= [];
    if (
      state.meetings.some(
        (m) =>
          m.eventId === eventId &&
          ["Ожидает ответа", "Принято"].includes(m.status) &&
          [m.from, m.to].includes(from) &&
          [m.from, m.to].includes(to),
      )
    )
      throw Error("У вас уже есть активное приглашение этому участнику.");
    const meeting = {
      ...data,
      id: uid(),
      eventId,
      from,
      to,
      status: "Ожидает ответа",
      created: new Date().toISOString(),
    };
    state.meetings.push(meeting);
    return meeting;
  }

  function respondMeeting(state, id, actor, status) {
    const m = (state.meetings || []).find((m) => m.id === id);
    if (!m || ![m.from, m.to].includes(actor))
      throw Error("Встреча недоступна.");
    if (!["Ожидает ответа", "Принято"].includes(m.status))
      throw Error("Приглашение уже закрыто.");
    if (
      status === "Отменено"
        ? actor !== m.from && m.status !== "Принято"
        : actor !== m.to ||
          m.status !== "Ожидает ответа" ||
          !["Принято", "Отклонено"].includes(status)
    )
      throw Error("Это действие недоступно.");
    if (status === "Принято") {
      const event = state.events.find((e) => e.id === m.eventId);
      if (
        !["Опубликовано", "Идёт"].includes(event?.status) ||
        [m.from, m.to].some(
          (id) =>
            state.users.find(u => u.id === id)?.status !== "Активна" || !state.memberships.some(
              (r) => r.eventId === m.eventId && r.userId === id,
            ),
        )
      )
        throw Error("Участие или мероприятие отменено.");
      if (
        state.meetings.some(
          (r) =>
            r.id !== id &&
            r.status === "Принято" &&
            r.start < m.end &&
            r.end > m.start &&
            [r.from, r.to].some((u) => [m.from, m.to].includes(u)),
        )
      )
        throw Error("В это время у одного из участников уже есть встреча.");
    }
    m.status = status;
    m.updated = new Date().toISOString();
  }

  root.RostDomain = {
    validateTravel,
    inviteMeeting,
    respondMeeting,
    seed,
    clone,
    uid,
    validateEvent,
    safeUrl,
    join,
    csv,
    calendar,
    DEMO_TIME,
  };
  if (typeof module !== "undefined") module.exports = root.RostDomain;
})(globalThis);
