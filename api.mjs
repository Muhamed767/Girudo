const LIVE_BACKEND = "https://hirudo-care.bziksievmuhamed.chatgpt.site";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  const route = event.path.split("/").filter(Boolean).at(-1);
  const isSlots = route === "slots" && event.httpMethod === "GET";
  const isBooking = route === "bookings" && event.httpMethod === "POST";

  if (!isSlots && !isBooking) return json(404, { error: "Маршрут не найден." });

  if (isBooking) {
    const origin = event.headers.origin || event.headers.Origin;
    const host = event.headers.host || event.headers.Host;
    try {
      if (!origin || new URL(origin).host !== host) {
        return json(403, { error: "Недопустимый источник запроса." });
      }
    } catch {
      return json(403, { error: "Недопустимый источник запроса." });
    }
  }

  let body;
  if (isBooking) {
    if (!event.body || Buffer.byteLength(event.body) > 4096) {
      return json(413, { error: "Проверьте данные заявки." });
    }
    try {
      body = JSON.parse(event.body);
    } catch {
      return json(400, { error: "Не удалось прочитать заявку." });
    }
  }

  try {
    const upstream = await fetch(`${LIVE_BACKEND}/api/${route}`, {
      method: isBooking ? "POST" : "GET",
      headers: {
        Origin: LIVE_BACKEND,
        ...(isBooking ? { "Content-Type": "application/json" } : {}),
      },
      ...(isBooking ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    const text = await upstream.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      return json(502, { error: "Сервер записи вернул некорректный ответ." });
    }
    return json(upstream.status, result);
  } catch (error) {
    console.error("Booking backend request failed:", error?.name || "Error");
    return json(502, { error: "Сервис записи временно недоступен. Попробуйте позже." });
  }
}
