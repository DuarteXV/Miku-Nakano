export default {
  name: 'react',
  description: 'Reacciona a un mensaje de un canal de WhatsApp.',
  category: 'utilidad',

  async execute({ sock, msg, jid, args }) {
    const emoji = args[0];
    const link  = args[1];

    if (!emoji || !link) {
      await sock.sendMessage(jid, {
        text: `🌸 Uso: *${prefix}react <emoji> <link del mensaje>* ♡`,
      }, { quoted: msg });
      return;
    }

    // Extraer newsletterJid y messageId del link
    // Formato: https://whatsapp.com/channel/XXXXX/messageId
    const match = link.match(/channel\/([a-zA-Z0-9_-]+)\/(\d+)/);
    if (!match) {
      await sock.sendMessage(jid, {
        text: '🌷 Ese link no es válido... ¿seguro que está bien? (◕‿◕✿)',
      }, { quoted: msg });
      return;
    }

    const channelCode = match[1];
    const serverMsgId = parseInt(match[2]);

    try {
      const meta = await sock.newsletterMetadata('invite', channelCode);
      const newsletterJid = meta.id;

      await sock.newsletterReactMessage(newsletterJid, serverMsgId, emoji);

      await sock.sendMessage(jid, {
        text: `✿ Reaccioné con ${emoji} al mensaje~ ♡`,
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(jid, {
        text: '🌷 No pude reaccionar... gomen ne~ (´;ω;´)\n' + err.message,
      }, { quoted: msg });
    }
  },
};