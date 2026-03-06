type SSEClient = {
  userId: string;
  controller: ReadableStreamDefaultController;
};

class SSEManager {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(userId: string, controller: ReadableStreamDefaultController): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    this.clients.get(userId)!.push({ userId, controller });
  }

  removeClient(userId: string, controller: ReadableStreamDefaultController): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const filtered = userClients.filter((c) => c.controller !== controller);
    if (filtered.length === 0) {
      this.clients.delete(userId);
    } else {
      this.clients.set(userId, filtered);
    }
  }

  sendToUser(userId: string, data: unknown): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.length === 0) {
      console.log(`[SSE] No active clients for user ${userId}`);
      return;
    }

    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    let sent = 0;

    for (const client of userClients) {
      try {
        client.controller.enqueue(encoder.encode(message));
        sent++;
      } catch {
        this.removeClient(userId, client.controller);
      }
    }

    if (sent > 0) {
      console.log(`[SSE] Sent to ${sent} client(s) for user ${userId}`);
    }
  }

  sendToUsers(userIds: string[], data: unknown): void {
    for (const userId of userIds) {
      this.sendToUser(userId, data);
    }
  }

  getClientCount(): number {
    let count = 0;
    for (const clients of this.clients.values()) {
      count += clients.length;
    }
    return count;
  }
}

// Singleton — survives Next.js hot reloads
const globalSSE =
  (global as unknown as { __sseManager?: SSEManager }).__sseManager || new SSEManager();
(global as unknown as { __sseManager?: SSEManager }).__sseManager = globalSSE;

export const sseManager: SSEManager = globalSSE;
