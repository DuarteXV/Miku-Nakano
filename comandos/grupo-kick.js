export default {
  name: 'kick',
  description: 'Expulsa a un usuario del grupo.',
  category: 'Grupos',
  adminuser: true,
  adminsocket: true,

  async execute({ sock, msg, jid, isGroup }) {
    if (!isGroup) {
      await sock.sendMessage(jid, {
        text: '🌷 Este comando solo funciona dentro de un grupo, ne~ ♡',
      }, { quoted: msg });
      return;
    }

    const context =
      msg.message?.extendedTextMessage?.contextInfo ??
      msg.message?.imageMessage?.contextInfo ??
      msg.message?.videoMessage?.contextInfo ??
      {};

    const mentioned = context.mentionedJid ?? [];
    const quoted    = context.participant ? [context.participant] : [];
    const targets   = [...new Set([...mentioned, ...quoted])].filter(Boolean);

    if (!targets.length) {
      await sock.sendMessage(jid, {
        text: '🌸 Menciona o responde al mensaje de quien quieres expulsar (◕‿◕✿)',
      }, { quoted: msg });
      return;
    }

    const metadata     = await sock.groupMetadata(jid);
    const participants = metadata.participants ?? [];
    const admins       = participants
      .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
      .map(p => p.id);

    const botId    = `${sock.user.id.split(':')[0]}@s.whatsapp.net`;
    const senderId = msg.key.participant ?? msg.key.remoteJid;

    if (targets.includes(senderId)) {
      await sock.sendMessage(jid, {
        text: '🌷 No puedes expulsarte a ti mismo~ (´；ω；`)',
      }, { quoted: msg });
      return;
    }

    if (targets.includes(botId)) {
      await sock.sendMessage(jid, {
        text: '🌸 ¡No me puedes expulsar a mí! >//< ♡',
      }, { quoted: msg });
      return;
    }

    if (targets.some(id => admins.includes(id))) {
      await sock.sendMessage(jid, {
        text: '🌷 No puedo expulsar a un administrador del grupo~ ♡',
      }, { quoted: msg });
      return;
    }

    const removable = targets.filter(id =>
      !admins.includes(id) &&
      id !== botId &&
      id !== senderId
    );

    if (!removable.length) {
      await sock.sendMessage(jid, {
        text: '🌸 No encontré ningún usuario válido para expulsar (◕‿◕✿)',
      }, { quoted: msg });
      return;
    }

    await sock.groupParticipantsUpdate(jid, removable, 'remove');

    const mentions = removable.map(id => `@${id.split('@')[0]}`).join(', ');

    await sock.sendMessage(jid, {
      text: `✿ ¡Listo~ ${mentions} fue expulsado del grupo! ♡`,
      mentions: removable,
    }, { quoted: msg });
  },
};