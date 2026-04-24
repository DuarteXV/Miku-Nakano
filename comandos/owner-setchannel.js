import { db } from '../core/database.js';

export default {
  name: 'setchannel',
  description: 'Cambia el canal del menú.',
  category: 'config',
  owner: true,

  async execute({ sock, msg, jid, args }) {
    if (!args[0]) return sock.sendMessage(jid, {
      text: `🌸 Uso: *${prefix}setchannel <link del canal>* ♡`,
    }, { quoted: msg });

    const match = args[0].match(/channel\/([a-zA-Z0-9_-]+)/);
    if (!match) return sock.sendMessage(jid, {
      text: '🌷 Ese link no es válido... ¿seguro que está bien? (◕‿◕✿)',
    }, { quoted: msg });

    try {
      const meta = await sock.newsletterMetadata('invite', match[1]);

      const channelJid  = meta.id;
      const channelName = meta.thread_metadata.name.text;

      const current = db.settings['config'] ?? {};
      db.settings['config'] = {
        ...current,
        channelJid,
        channelName,
        channelLink: args[0],
      };

      await sock.sendMessage(jid, {
        text: `✿ ¡Canal actualizado~ ♡\n\n❥ *Nombre* : ${channelName}\n❥ *ID* : ${channelJid}\n❥ *Link* : ${args[0]}`,
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(jid, {
        text: '🌷 Algo salió mal al obtener el canal... gomen ne~ (´;ω;´)\n' + err.message,
      }, { quoted: msg });
    }
  },
};