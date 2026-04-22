import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { createInterface } from 'readline';

import './core/config.js';
import { log } from './core/console.js';
import { loadCommands, handleMessage } from './core/messages.js';

const ask = (prompt) =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => { rl.close(); resolve(answer.trim()); });
  });

function formatPhoneNumber(raw) {
  let num = raw.replace(/[^0-9]/g, '');
  num = num.replace(/^\+/, '');
  if (num.startsWith("00")) {
    num = num.substring(2);
  }
  if (num.startsWith("52") && num.length === 12 && !num.startsWith("521")) {
    num = "521" + num.substring(2);
  }
  if (num.length === 10) {
    num = "521" + num;
  }
  if (num.startsWith("54") && !num.startsWith("549") && num.length <= 13) {
    num = "549" + num.substring(2);
  }
  if (num.startsWith("55") && num.length === 12) {
    num = "55" + num.substring(2, 4) + "9" + num.substring(4);
  }
  if (num.length === 10 && !num.startsWith("57")) {
    num = "57" + num;
  }
  return num;
}

async function startWaBot() {
  log.banner();

  const { state, saveCreds } = await useMultiFileAuthState('./Sesiones');
  const { version }          = await fetchLatestBaileysVersion();
  const logger               = pino({ level: 'silent' });

  const needsPairing = !state.creds.registered;
  let phoneNumber    = null;

  if (needsPairing) {
    const raw   = await ask('  ◈  Número de teléfono: ');
    phoneNumber = formatPhoneNumber(raw);
  }

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.macOS('Chrome'),
    logger,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    getMessage: async () => "",
    keepAliveIntervalMs: 45000,
    maxIdleTimeMs: 60000,
  });

  if (needsPairing && phoneNumber) {
    setTimeout(async () => {
      try {
        if (!state.creds.registered) {
          const code = await sock.requestPairingCode(phoneNumber);
          const fmt  = code?.match(/.{1,4}/g)?.join(' · ') || code;

          console.log();
          console.log(`  ✦  Código de vinculación  ›  ${fmt}`);
          console.log();
          log.info('WhatsApp  →  Dispositivos vinculados  →  Vincular con número');
          console.log();
        }
      } catch (err) {
        log.error(`Error al solicitar código: ${err.message}`);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (connection === 'open') {
      await loadCommands();
      log.success(`${botName} conectado · en línea`);
      console.log();

      try {
        const { startRyzeMonitor } = await import('./comandos/owner-ryzecodes.js');
        await startRyzeMonitor(sock);
      } catch (err) {
        log.warn('No se pudo iniciar el monitor RyzeCodes');
      }
    }

    if (connection === 'close') {
      const status          = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = status !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        log.warn(`Conexión perdida (${status}) · reconectando…`);
        startWaBot();
      } else {
        log.error('Sesión cerrada · elimina /Sesiones y vuelve a vincular');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      await handleMessage(sock, msg);
    }
  });

  return sock;
}

startWaBot().catch((err) => {
  log.error(`Error fatal · ${err.message}`);
  process.exit(1);
});
