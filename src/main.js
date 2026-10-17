import './styles/base.css';
import './styles/agent.css';
import { initLang } from './i18n/index.js';
import { initAgent } from './agent/index.js';
import { initDevHost } from './dev-host.js';

initLang();
initDevHost();
initAgent();
