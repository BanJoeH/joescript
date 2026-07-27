import { DurableObject } from "cloudflare:workers";

type Session = {
  writer: WritableStreamDefaultWriter<Uint8Array>;
};

const HEARTBEAT_INTERVAL_MS = 25_000;

const encoder = new TextEncoder();

/**
 * One PantryHub Durable Object instance per pantry (looked up by
 * `idFromName(pantryId)`). Holds open SSE connections for that pantry and
 * fans out `pantry:invalidate` events whenever a mutation bumps the
 * pantry's revision, so every open tab can revalidate its loaders live.
 */
export class PantryHub extends DurableObject<Env> {
  private sessions = new Set<Session>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/connect" && request.method === "GET") {
      return this.handleConnect(request);
    }

    if (url.pathname === "/broadcast" && request.method === "POST") {
      return this.handleBroadcast(request);
    }

    return new Response("Not found", { status: 404 });
  }

  private handleConnect(request: Request): Response {
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const session: Session = { writer };
    this.sessions.add(session);

    const send = (chunk: string) => {
      writer.write(encoder.encode(chunk)).catch(() => {
        this.sessions.delete(session);
      });
    };

    send("retry: 2000\n\n");

    const heartbeat = setInterval(() => send(": heartbeat\n\n"), HEARTBEAT_INTERVAL_MS);

    const cleanup = () => {
      clearInterval(heartbeat);
      this.sessions.delete(session);
      writer.close().catch(() => {});
    };

    request.signal.addEventListener("abort", cleanup);

    return new Response(readable, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const body = (await request.json()) as { revision: number; actorId?: string | null };
    const payload = JSON.stringify({
      type: "pantry:invalidate",
      revision: body.revision,
      actorId: body.actorId ?? null,
    });
    const message = encoder.encode(`event: pantry:invalidate\ndata: ${payload}\n\n`);

    for (const session of this.sessions) {
      try {
        await session.writer.write(message);
      } catch {
        this.sessions.delete(session);
      }
    }

    return new Response(null, { status: 204 });
  }
}
