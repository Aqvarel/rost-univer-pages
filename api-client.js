/* Сетевой слой: сессия хранится в HttpOnly cookie, CSRF-токен — только в памяти. */
(() => {
  "use strict";
  let csrfToken = "";
  let socket = null;
  let reconnectTimer = null;
  let currentEvent = "";
  let listener = null;
  const apiBase = String(window.ROST_CONFIG?.apiBase || "").replace(/\/$/, "");
  const endpoint = (path) => `${apiBase}${path}`;

  async function request(path, options = {}) {
    const headers = { ...(options.body ? { "content-type": "application/json" } : {}), ...(apiBase ? { "bypass-tunnel-reminder": "true" } : {}), ...(options.headers || {}) };
    if (csrfToken && !["GET", "HEAD"].includes(options.method || "GET")) headers["x-csrf-token"] = csrfToken;
    const response = await fetch(endpoint(path), { ...options, headers, credentials: "include" });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data?.error || "Сервис временно недоступен.");
    if (data?.csrfToken) csrfToken = data.csrfToken;
    return data;
  }

  async function session() {
    try { return await request("/api/auth/session"); } catch { return null; }
  }

  async function login(email, password, otp) {
    return request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password, ...(otp ? { otp } : {}) }) });
  }

  async function logout() {
    try { await request("/api/auth/logout", { method: "POST" }); } finally { closeSocket(); csrfToken = ""; }
  }

  function closeSocket() {
    clearTimeout(reconnectTimer);
    currentEvent = "";
    listener = null;
    socket?.close();
    socket = null;
  }

  async function subscribe(eventId, onEvent) {
    if (currentEvent && currentEvent !== eventId && socket) { socket.onclose = null; socket.close(); socket = null; }
    currentEvent = eventId;
    listener = onEvent;
    const history = await request(`/api/events/${encodeURIComponent(eventId)}/messages`);
    onEvent({ type: "history", messages: history.messages });
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "subscribe", eventId }));
    else connectSocket();
  }

  function connectSocket() {
    if (!currentEvent || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
    const target = new URL(apiBase || location.origin);
    target.protocol = target.protocol === "https:" ? "wss:" : "ws:";
    target.pathname = "/ws";
    socket = new WebSocket(target);
    socket.onopen = () => { socket.send(JSON.stringify({ type: "subscribe", eventId: currentEvent })); listener?.({ type: "status", status: "Подключено" }); };
    socket.onmessage = (event) => { try { listener?.(JSON.parse(event.data)); } catch {} };
    socket.onclose = () => { listener?.({ type: "status", status: "Переподключение…" }); reconnectTimer = setTimeout(connectSocket, 1500); };
    socket.onerror = () => socket.close();
  }

  function sendMessage(eventId, text) {
    if (!socket || socket.readyState !== WebSocket.OPEN) throw Error("Чат переподключается. Повторите через несколько секунд.");
    socket.send(JSON.stringify({ type: "chat.send", eventId, text, clientId: crypto.randomUUID() }));
  }

  const createRoom = (eventId) => request(`/api/admin/events/${encodeURIComponent(eventId)}/room`, { method: "POST", body: "{}" });
  const roomToken = (eventId) => request(`/api/events/${encodeURIComponent(eventId)}/room-token`, { method: "POST", body: "{}" });

  window.RostAPI = { session, login, logout, subscribe, sendMessage, closeSocket, createRoom, roomToken };
})();
