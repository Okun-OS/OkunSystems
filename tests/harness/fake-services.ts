/**
 * Lokale Test-Doubles für R2 (S3-kompatibel) und Daily.co.
 *
 * Wird ausschließlich von den End-to-End-Tests genutzt und niemals gebaut oder
 * ausgeliefert. Signaturen werden bewusst nicht geprüft — geprüft wird das
 * Verhalten der Anwendung, nicht das des Providers.
 */
import http from "node:http";
import { createHash } from "node:crypto";

export type FakeR2 = {
  server: http.Server;
  port: number;
  objects: Map<string, { body: Buffer; contentType: string }>;
  close: () => Promise<void>;
};

function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export async function startFakeR2(bucket: string): Promise<FakeR2> {
  const objects = new Map<string, { body: Buffer; contentType: string }>();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    // Path-Style: /<bucket>/<key>
    const path = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const key = path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;

    if (req.method === "PUT") {
      const body = await readBody(req);
      objects.set(key, {
        body,
        contentType: req.headers["content-type"] ?? "application/octet-stream",
      });
      res.writeHead(200, { ETag: `"${createHash("md5").update(body).digest("hex")}"` });
      res.end();
      return;
    }
    if (req.method === "HEAD") {
      const object = objects.get(key);
      if (!object) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Length": String(object.body.byteLength),
        "Content-Type": object.contentType,
      });
      res.end();
      return;
    }
    if (req.method === "GET") {
      const object = objects.get(key);
      if (!object) {
        res.writeHead(404, { "Content-Type": "application/xml" });
        res.end("<Error><Code>NoSuchKey</Code></Error>");
        return;
      }
      res.writeHead(200, {
        "Content-Length": String(object.body.byteLength),
        "Content-Type": object.contentType,
      });
      res.end(object.body);
      return;
    }
    if (req.method === "DELETE") {
      objects.delete(key);
      res.writeHead(204);
      res.end();
      return;
    }
    res.writeHead(405);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;

  return {
    server,
    port,
    objects,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export type FakeDaily = {
  server: http.Server;
  port: number;
  /** Steuert das Verhalten für Fehlerfall-Tests. */
  state: {
    rooms: Map<string, { name: string; url: string; exp: number }>;
    recordingId: string;
    status: string;
    failAccessLink: boolean;
    failDownload: boolean;
    deleted: boolean;
    payload: Buffer;
  };
  close: () => Promise<void>;
};

export async function startFakeDaily(): Promise<FakeDaily> {
  /** Bereits angelegte Räume — modelliert Dailys Verhalten bei Namenskollisionen. */
  const rooms = new Map<string, { name: string; url: string; exp: number }>();

  const state = {
    rooms,
    recordingId: "rec_test_0001",
    status: "finished",
    failAccessLink: false,
    failDownload: false,
    deleted: false,
    payload: Buffer.from("FAKE-MP4-CONTENT-FOR-TESTS"),
  };

  // Wird gesetzt, sobald der Server einen Port hat.
  let serverPort = 0;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };

    // POST /rooms/<room>/recordings → Aufzeichnung starten
    if (req.method === "POST" && /^\/rooms\/[^/]+\/recordings$/.test(path)) {
      return json(200, { id: state.recordingId });
    }
    // DELETE /rooms/<room>/recordings/<id> → Aufzeichnung stoppen
    if (req.method === "DELETE" && /^\/rooms\/[^/]+\/recordings\/[^/]+$/.test(path)) {
      return json(200, { ok: true });
    }
    // GET /recordings/<id> → Status
    if (req.method === "GET" && /^\/recordings\/[^/]+$/.test(path)) {
      return json(200, { id: state.recordingId, status: state.status, duration: 42 });
    }
    // GET /recordings/<id>/access-link → Download-Link
    if (req.method === "GET" && /^\/recordings\/[^/]+\/access-link$/.test(path)) {
      if (state.failAccessLink) return json(500, { error: "temporär nicht verfügbar" });
      return json(200, {
        download_link: `http://127.0.0.1:${serverPort}/download/${state.recordingId}`,
      });
    }
    // GET /download/<id> → eigentliche Datei
    if (req.method === "GET" && path.startsWith("/download/")) {
      if (state.failDownload) {
        res.writeHead(502);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": String(state.payload.byteLength),
      });
      res.end(state.payload);
      return;
    }
    // DELETE /recordings/<id> → Daily-Kopie löschen
    if (req.method === "DELETE" && /^\/recordings\/[^/]+$/.test(path)) {
      state.deleted = true;
      return json(200, { deleted: true });
    }
    // POST /rooms → Raum anlegen (Daily lehnt doppelte Namen und exp in der
    // Vergangenheit ab — beides wird hier nachgebildet)
    if (req.method === "POST" && path === "/rooms") {
      const body = JSON.parse((await readBody(req)).toString() || "{}") as {
        name?: string;
        properties?: { exp?: number };
      };
      const name = body.name ?? `room-${rooms.size}`;
      const exp = body.properties?.exp ?? 0;
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        return json(400, {
          error: "invalid-request-error",
          info: "name can only contain letters, numbers, dash and underscore",
        });
      }
      if (exp && exp < Math.floor(Date.now() / 1000)) {
        return json(400, {
          error: "invalid-request-error",
          info: "exp must be in the future",
        });
      }
      if (rooms.has(name)) {
        return json(400, {
          error: "invalid-request-error",
          info: `a room named ${name} already exists`,
        });
      }
      const url = `https://okun.daily.co/${name}`;
      rooms.set(name, { name, url, exp });
      return json(200, { name, url, config: { exp } });
    }
    // GET /rooms/<name> → vorhandenen Raum lesen
    if (req.method === "GET" && /^\/rooms\/[^/]+$/.test(path)) {
      const name = decodeURIComponent(path.split("/")[2]);
      const room = rooms.get(name);
      if (!room) return json(404, { error: "not-found" });
      return json(200, { name: room.name, url: room.url, config: { exp: room.exp } });
    }
    // POST /rooms/<name> → Ablaufzeit verlängern
    if (req.method === "POST" && /^\/rooms\/[^/]+$/.test(path)) {
      const name = decodeURIComponent(path.split("/")[2]);
      const room = rooms.get(name);
      if (!room) return json(404, { error: "not-found" });
      const body = JSON.parse((await readBody(req)).toString() || "{}") as {
        properties?: { exp?: number };
      };
      room.exp = body.properties?.exp ?? room.exp;
      return json(200, { name: room.name, url: room.url, config: { exp: room.exp } });
    }
    return json(404, { error: "not found" });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  serverPort = (server.address() as { port: number }).port;

  return {
    server,
    port: serverPort,
    state,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
