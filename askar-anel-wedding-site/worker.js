/**
 * Cloudflare Worker
 * Deploy this file as your /api/rsvp endpoint.
 *
 * Required secrets / variables:
 * - BOT_TOKEN  (secret)
 * - CHAT_ID    (secret or env)
 * - ALLOWED_ORIGIN (optional, e.g. https://wedding.example.com)
 */

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method Not Allowed" }, 405, corsHeaders);
    }

    try {
      const body = await request.json();
      const payload = normalizePayload(body);

      if (!payload.name) {
        return json({ ok: false, error: "Name is required" }, 400, corsHeaders);
      }

      if (!payload.attendance) {
        return json({ ok: false, error: "Attendance is required" }, 400, corsHeaders);
      }

      const telegramResponse = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: env.CHAT_ID,
          parse_mode: "HTML",
          text: formatTelegramMessage(payload)
        })
      });

      const telegramData = await telegramResponse.json();

      if (!telegramResponse.ok || !telegramData.ok) {
        console.error("Telegram API error:", telegramData);
        return json({ ok: false, error: "Telegram delivery failed" }, 502, corsHeaders);
      }

      return json({ ok: true }, 200, corsHeaders);
    } catch (error) {
      console.error("RSVP worker error:", error);
      return json({ ok: false, error: "Invalid request" }, 400, corsHeaders);
    }
  }
};

function normalizePayload(body = {}) {
  return {
    name: String(body.name || "").trim().slice(0, 80),
    guests: String(body.guests || "").trim().slice(0, 400),
    attendance: String(body.attendance || "").trim().slice(0, 80),
    comment: String(body.comment || "").trim().slice(0, 500),
    phone: String(body.phone || "").trim().slice(0, 30),
    sentAt: String(body.sentAt || "").trim().slice(0, 100),
    page: String(body.page || "").trim().slice(0, 300)
  };
}

function formatTelegramMessage(data) {
  const lines = [
    "<b>Жаңа RSVP өтінімі</b>",
    "",
    `<b>Аты-жөні:</b> ${escapeHtml(data.name)}`,
    `<b>Қатысу мәртебесі:</b> ${escapeHtml(data.attendance)}`,
    `<b>Қонақтар:</b> ${escapeHtml(data.guests || "Көрсетілмеген")}`,
    `<b>Телефон:</b> ${escapeHtml(data.phone || "Көрсетілмеген")}`,
    `<b>Пікір:</b> ${escapeHtml(data.comment || "Жоқ")}`,
    `<b>Жіберілген уақыты:</b> ${escapeHtml(data.sentAt || "Белгісіз")}`,
    `<b>Бет:</b> ${escapeHtml(data.page || "Белгісіз")}`
  ];

  return lines.join("\n");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = env.ALLOWED_ORIGIN || "*";
  const responseOrigin = allowedOrigin === "*" ? "*" : (origin === allowedOrigin ? origin : allowedOrigin);

  return {
    "Access-Control-Allow-Origin": responseOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}
