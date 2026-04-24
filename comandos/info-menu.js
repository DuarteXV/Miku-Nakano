import { commands } from '../core/messages.js';
import { db } from '../core/database.js';

export default {
  name: 'menu',
  description: 'Muestra la lista de comandos disponibles.',
  category: 'info',

  async execute({ sock, msg, jid, sender }) {
    const config      = db.settings['config'] ?? {};
    const bannerUrl   = config.bannerUrl   ?? 'https://raw.githubusercontent.com/DuarteXV/Yotsuba-MD-Premium/main/uploads/056a29477e84a33e.jpg';
    const channelJid  = config.channelJid  ?? global.channelJid  ?? null;
    const channelName = config.channelName ?? global.channelName ?? botName;
    const channelLink = config.channelLink ?? global.channelLink ?? null;

    const pushName = msg.pushName ?? sender.split('@')[0];

    // 🕐 Hora Colombia (UTC-5)
    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
    );
    const hours   = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const greeting =
      hours >= 5  && hours < 12 ? '🌸 ¡Buenos días!'   :
      hours >= 12 && hours < 18 ? '🌺 ¡Buenas tardes!' :
                                   '🌙 ¡Buenas noches!';

    // 📱 Dispositivo
    const msgId = msg.key?.id ?? '';
    const device =
      msgId.startsWith('3A') || msgId.startsWith('3E') ? '🍎 iPhone'       :
      msgId.startsWith('BA')                            ? '🖥️ WhatsApp Web' :
      msgId.length === 16                               ? '🤖 Android'      :
                                                          '📱 Dispositivo';

    // 📋 Categorías
    const categories = {};
    for (const [name, cmd] of commands) {
      const cat = cmd.category ?? 'otros';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({
        name,
        description: cmd.description ?? 'Sin descripción.',
      });
    }

    const catEmojis = {
      info:      '🎀',
      utilidad:  '🌸',
      juegos:    '🎮',
      descargas: '💾',
      admin:     '👑',
      ia:        '✨',
      nsfw:      '🔞',
      otros:     '🌷',
    };

    // 💌 Mensaje
    let text =
`${greeting} ${pushName} ♡

🕐 *${timeStr}* • Colombia  •  ${device}

✿ *${botName}*
Hola~ soy Miku, la quinta quintilliza.
Anota bien todito, ¿sí? (◕‿◕✿)
`;

    for (const [cat, cmds] of Object.entries(categories)) {
      const emoji = catEmojis[cat.toLowerCase()] ?? '🌷';
      text += `\n${emoji} *${cat.charAt(0).toUpperCase() + cat.slice(1)}*\n`;
      for (const cmd of cmds) {
        text += `  ❥ ${prefix}${cmd.name} — ${cmd.description}\n`;
      }
    }

    text += `\n♡ *${botName}* • Siempre aquí para ti~`;

    // contextInfo
    const contextInfo = {
      mentionedJid: [sender],
      externalAdReply: {
        title: `♡ ${botName}`,
        body: '🎀 La quinta quintilliza • Asistente',
        thumbnailUrl: bannerUrl,
        mediaType: 1,
        renderLargerThumbnail: true,
        ...(channelLink && { sourceUrl: channelLink }),
      },
      ...(channelJid && {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channelJid,
          newsletterName: channelName,
          serverMessageId: -1,
        },
      }),
    };

    await sock.sendMessage(jid, {
      text: text.trim(),
      contextInfo,
    }, { quoted: msg });
  },
};