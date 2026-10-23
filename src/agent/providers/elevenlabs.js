import { contextText, dynamicVariables } from '../context.js';
import { SITE_PAGES } from '../sitePages.js';

// Texto y voz con el SDK de agentes conversacionales de ElevenLabs.
// Texto: sesión textOnly. Voz: sesión nueva con micrófono (el panel conserva la transcripción).
export class ElevenLabsProvider {
  kind = 'elevenlabs';
  supportsVoice = true;

  constructor(handlers, { agentId }) {
    this.h = handlers;
    this.agentId = agentId;
    this.conv = null;
    this.voice = false;
    this.skipGreeting = false;
  }

  async #start(ctx, voice) {
    this.h.onStatus('connecting');
    this.voice = voice;
    // En texto el widget ya mostró su saludo escrito; se descarta el primer mensaje del agente.
    this.skipGreeting = !voice;
    const clientTools = {
      abrir_pagina_sitio: ({ pagina } = {}) => {
        // Si la herramienta no trae el parámetro (o trae un valor que no existe), el agente recibe el motivo y los valores válidos.
        if (!SITE_PAGES[pagina]) {
          return `Error: no se abrió nada. El parámetro "pagina" ${pagina ? `vale "${pagina}", que no existe` : 'no llegó'}. Valores válidos: ${Object.keys(SITE_PAGES).join(', ')}. No le digas al cliente que se abrió.`;
        }
        return this.h.onAction({ type: 'open_panel', page: pagina }) === false
          ? 'Error: no se pudo abrir la página. No le digas al cliente que se abrió.'
          : 'Página abierta en pantalla';
      },
      // El agente decide cuándo la llamada agiliza el proceso; el widget muestra la invitación.
      ofrecer_llamada: () =>
        this.h.onAction({ type: 'offer_call' }) === false
          ? 'No disponible: la voz no está activa en este momento. No menciones la llamada.'
          : 'Invitación a llamar mostrada al cliente. Él decide si la acepta.',
      abrir_whatsapp: () =>
        this.h.onAction({ type: 'whatsapp' }) === false
          ? 'Error: WhatsApp aún no está configurado en este sitio. No digas que se abrió; ofrece que un asesor lo contacte o el teléfono 416-855-6663.'
          : 'Botón de WhatsApp mostrado al cliente: al tocarlo se abre la conversación con el asesor.',
    };
    // El SDK pesa mucho: se descarga solo cuando el cliente abre el agente.
    const { Conversation } = await import('@elevenlabs/client');
    const conv = await Conversation.startSession({
      agentId: this.agentId,
      textOnly: !voice,
      dynamicVariables: dynamicVariables(ctx),
      clientTools,
      onConnect: () => this.h.onStatus(voice ? 'voice-listening' : 'ready'),
      onDisconnect: (details) => {
        if (this.conv !== conv) return;
        this.conv = null;
        this.voice = false;
        this.h.onStatus(details.reason === 'user' ? 'ended' : 'disconnected');
      },
      onError: (message) => this.h.onError(message),
      onModeChange: ({ mode }) => voice && this.h.onStatus(`voice-${mode}`),
      onMessage: ({ role, message }) => {
        if (role === 'user') {
          // En texto el widget ya pintó el mensaje; por voz esto es la transcripción.
          if (voice) this.h.onMessage({ role: 'user', text: message });
          return;
        }
        if (this.skipGreeting) {
          this.skipGreeting = false;
          return;
        }
        this.h.onMessage({ role: 'agent', text: message });
      },
      onAgentToolRequest: () => this.h.onThinking(true),
      onAgentToolResponse: () => this.h.onThinking(false),
    });
    this.conv = conv;
  }

  async connect(ctx) {
    await this.#start(ctx, false);
  }

  isOpen() {
    return Boolean(this.conv?.isOpen());
  }

  updateContext(ctx) {
    if (this.isOpen()) this.conv.sendContextualUpdate(contextText(ctx));
  }

  async send(text, ctx) {
    if (!this.isOpen()) await this.#start(ctx, this.voice);
    this.conv.sendUserMessage(text);
  }

  async startVoice(ctx) {
    await this.#end();
    await this.#start(ctx, true);
  }

  // Al colgar no se abre otra sesión de texto: el widget la crea cuando el cliente escribe.
  // Una sesión vacía se registra en ElevenLabs como una conversación más y genera un reporte sin datos.
  async stopVoice() {
    await this.#end();
    this.voice = false;
  }

  setMicMuted(muted) {
    this.conv?.setMicMuted?.(muted);
  }

  async #end() {
    const conv = this.conv;
    this.conv = null;
    if (conv) await conv.endSession().catch(() => {});
  }

  async disconnect() {
    await this.#end();
  }
}
