import { commands } from '../core/messages.js';
import { db } from '../core/database.js';

export default {
  name: 'menu',
  description: 'Muestra la lista de comandos disponibles.',
  category: 'info',

  async execute({ sock, msg, jid, sender }) {
    const config = db.settings['config'] ?? {};
    const bannerUrl   = config.bannerUrl   ?? 'https://ryzecodes.xyz/files/2';
    const channelJid  = config.channelJid  ?? null;
    const channelName = config.channelName ?? botName;
    const channelLink = config.channelLink ?? null;

    const categories = {};
    for (const [name, cmd] of commands) {
      const cat = cmd.category ?? 'sin categoría';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({ name, description: cmd.description ?? 'Sin descripción.' });
    }

    let text = `🎋 @${sender.split('@')[0]}, aquí está lo que puedo hacer.\n`;
    for (const [cat, cmds] of Object.entries(categories)) {
      text += `\n✦ *${cat.charAt(0).toUpperCase() + cat.slice(1)}*\n`;
      for (const cmd of cmds) {
        text += `  ${prefix}${cmd.name} — ${cmd.description}\n`;
      }
    }

    const contextInfo = {
      mentionedJid: [`${sender}@s.whatsapp.net`],
      externalAdReply: {
        title: botName,
        body: '🎋 Miku Nakano • Asistente',
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