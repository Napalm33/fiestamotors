// Texto contra el backend del agente (VITE_AGENT_API_URL).
// POST { session_id, message, context } -> { reply: string, actions?: [{type:'open_panel',page}|{type:'whatsapp'}] }
export class ApiProvider {
  kind = 'api';
  supportsVoice = false;

  constructor(handlers, { url }) {
    this.h = handlers;
    this.url = url;
    this.sessionId = crypto.randomUUID();
    this.ctx = null;
  }

  async connect(ctx) {
    this.ctx = ctx;
    this.h.onStatus('ready');
  }

  updateContext(ctx) {
    this.ctx = ctx;
  }

  isOpen() {
    return true;
  }

  async send(text, ctx) {
    this.ctx = ctx;
    this.h.onThinking(true);
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: this.sessionId, message: text, context: this.ctx }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.reply) this.h.onMessage({ role: 'agent', text: String(data.reply) });
      (data.actions || []).forEach((a) => this.h.onAction(a));
    } catch (err) {
      this.h.onError(err.message);
    } finally {
      this.h.onThinking(false);
    }
  }

  async disconnect() {}
}
