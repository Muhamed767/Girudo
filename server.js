// Serve the exported files and forward booking requests to the live backend.
// The Telegram bot token stays on the live backend and is never copied here.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const LIVE_BACKEND = "https://hirudo-care.bziksievmuhamed.chatgpt.site";
const PORT = Number(process.env.PORT || 3000);

const STATIC_FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "text/javascript; charset=utf-8"],
  "/botanical.svg": ["botanical.svg", "image/svg+xml"],
};

async function forwardBookingRequest(request, response, pathname) {
  if (request.method === "POST") {
    const origin = request.headers.origin;
    const requestHost = request.headers.host;

    if (!origin || new URL(origin).host !== requestHost) {
      response.writeHead(403);
      response.end();
      return;
    }
  }

  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (Buffer.byteLength(body) > 4096) {
      response.writeHead(413);
      response.end();
      return;
    }
  }

  const upstreamResponse = await fetch(`${LIVE_BACKEND}${pathname}`, {
    method: request.method,
    headers: {
      Origin: LIVE_BACKEND,
      "Content-Type": "application/json",
    },
    ...(request.method === "POST" ? { body } : {}),
    signal: AbortSignal.timeout(30000),
  });

  response.writeHead(upstreamResponse.status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(await upstreamResponse.text());
}

async function serveStaticFile(response, pathname) {
  const file = STATIC_FILES[pathname];

  if (!file) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const [filename, contentType] = file;
  const fileUrl = new URL(filename, import.meta.url);
  const contents = await readFile(fileURLToPath(fileUrl));

  response.writeHead(200, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  });
  response.end(contents);
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const isSlotsRequest = pathname === "/api/slots" && request.method === "GET";
  const isBookingRequest = pathname === "/api/bookings" && request.method === "POST";

  try {
    if (isSlotsRequest || isBookingRequest) {
      await forwardBookingRequest(request, response, pathname);
      return;
    }

    if (request.method !== "GET") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    await serveStaticFile(response, pathname);
  } catch {
    response.writeHead(502, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(
      JSON.stringify({
        error: "Сервис временно недоступен. Попробуйте позже.",
      }),
    );
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Girudo server is listening on port ${PORT}`);
});
