export class SSEBroadcaster {
    clients = new Set();
    addClient(reply) {
        reply.raw.setHeader("Content-Type", "text/event-stream");
        reply.raw.setHeader("Cache-Control", "no-cache");
        reply.raw.setHeader("Connection", "keep-alive");
        reply.raw.setHeader("Access-Control-Allow-Origin", "*");
        reply.raw.flushHeaders();
        this.clients.add(reply);
        reply.raw.on("close", () => {
            this.clients.delete(reply);
        });
        // Send initial handshake
        this.sendEvent(reply, "connected", { status: "ready" });
    }
    broadcast(event) {
        for (const reply of this.clients) {
            this.sendEvent(reply, "progress", event);
        }
    }
    sendEvent(reply, type, data) {
        try {
            reply.raw.write(`event: ${type}\n`);
            reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        }
        catch {
            this.clients.delete(reply);
        }
    }
}
export const sseBroadcaster = new SSEBroadcaster();
