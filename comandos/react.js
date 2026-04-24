export default {
  name: 'react',
  description: 'Reacciona a un mensaje de un canal de WhatsApp.',
  category: 'utilidad',

  async execute({ sock, msg, jid, args }) {
    const raw   = args.join(' ');
    const parts = raw.split(',');
    const emoji = parts[0]?.trim();
    const link  = parts[1]?.trim();

    const debug = [
      `❥ emoji: ${emoji ?? 'undefined'}`,
      `❥ link: ${link ?? 'undefined'}`,
      `❥ match: ${link ? JSON.stringify(link.match(/channel\/([a-zA-Z0-9_-]+)\/(\d+)/)) : 'sin link'}`,
    ].join('\n');

    await sock.sendMessage(jid, { text: debug }, { quoted: msg });

    if (!emoji || !link) {
      await sock.sendMessage(jid, {
        text: `🌸 Uso: *${prefix}react <emoji>, <link del mensaje>* ♡`,
      }, { quoted: msg });
      return;
    }

    const match = link.match(/channel\/([a-zA-Z0-9_-]+)\/(\d+)/);
    if (!match) {
      await sock.sendMessage(jid, {
        text: '🌷 Ese link no es válido... ¿seguro que está bien? (◕‿◕✿)',
      }, { quoted: msg });
      return;
    }

    const channelCode = match[1];
    const serverMsgId = parseInt(match[2]);

    await sock.sendMessage(jid, {
      text: `❥ channelCode: ${channelCode}\n❥ serverMsgId: ${serverMsgId}`,
    }, { quoted: msg });

    try {
      const meta = await sock.newsletterMetadata('invite', channelCode);
      await sock.sendMessage(jid, {
        text: `❥ newsletterJid: ${meta.id}`,
      }, { quoted: msg });

      await sock.newsletterReactMessage(meta.id, serverMsgId, emoji);

      await sock.sendMessage(jid, {
        text: `✿ Reaccioné con ${emoji} al mensaje~ ♡`,
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(jid, {
        text: '🌷 Error:\n' + err.message,
      }, { quoted: msg });
    }
  },
};