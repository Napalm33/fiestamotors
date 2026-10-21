import { DemoProvider } from './providers/demo.js';
import { ApiProvider } from './providers/api.js';
import { ElevenLabsProvider } from './providers/elevenlabs.js';

// Capa de conexión aislada: la interfaz solo conoce este contrato y no el proveedor.
//   connect(ctx) · send(text, ctx) · updateContext(ctx) · isOpen() · disconnect()
//   startVoice(ctx) · stopVoice(ctx) · setMicMuted(bool)   (solo si supportsVoice)
// Eventos hacia la interfaz (handlers):
//   onMessage({role,text}) · onThinking(bool) · onStatus(status) · onError(msg) · onAction(action)
export function createConnection(handlers) {
  // Referencias directas: así Vite las reemplaza al compilar y el paquete del Artifact puede fijarlas (ver vite.embed.config.js).
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
  const apiUrl = import.meta.env.VITE_AGENT_API_URL;
  const textProvider = import.meta.env.VITE_AGENT_TEXT_PROVIDER || (agentId ? 'elevenlabs' : apiUrl ? 'api' : 'demo');

  if (textProvider === 'api' && apiUrl) {
    const provider = new ApiProvider(handlers, { url: apiUrl });
    if (agentId) attachVoice(provider, handlers, agentId);
    return provider;
  }
  if (agentId) return new ElevenLabsProvider(handlers, { agentId });
  return new DemoProvider(handlers);
}

// Texto por backend propio y voz por ElevenLabs en paralelo.
function attachVoice(textProvider, handlers, agentId) {
  const voice = new ElevenLabsProvider(handlers, { agentId });
  textProvider.supportsVoice = true;
  textProvider.startVoice = (ctx) => voice.startVoice(ctx);
  textProvider.stopVoice = async () => {
    await voice.disconnect();
    handlers.onStatus('ended');
  };
  textProvider.setMicMuted = (m) => voice.setMicMuted(m);
  const updateContext = textProvider.updateContext.bind(textProvider);
  textProvider.updateContext = (ctx) => {
    updateContext(ctx);
    voice.updateContext(ctx);
  };
  const disconnect = textProvider.disconnect.bind(textProvider);
  textProvider.disconnect = async () => {
    await voice.disconnect();
    await disconnect();
  };
}
