import { demoReply } from '../demoEngine.js';

// Sin claves: responde solo con datos de inventory.json.
export class DemoProvider {
  kind = 'demo';
  supportsVoice = false;

  constructor(handlers) {
    this.h = handlers;
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
    await new Promise((r) => setTimeout(r, 450));
    const { text: reply, actions = [] } = demoReply(text, this.ctx);
    this.h.onThinking(false);
    this.h.onMessage({ role: 'agent', text: reply });
    actions.forEach((a) => this.h.onAction(a));
  }

  async disconnect() {}
}
