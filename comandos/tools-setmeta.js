export default {
  name: 'setmeta',
  description: 'Cambia el nombre del pack de stickers global',
  category: 'Admin',

  async execute({ sock, msg, jid, args, sender }) {
    if (!global.owners.includes(sender.split('@')[0])) {
      await sock.sendMessage(jid, {
        text: '🌷 Solo mis dueños pueden hacer eso, ne~ ♡',
      }, { quoted: msg });
      return;
    }

    if (!args.length) {
      await sock.sendMessage(jid, {
        text: `🌸 Uso: *${prefix}setmeta nombre del pack*\n\nActual: *${global.stickerPack ?? botName}*`,
      }, { quoted: msg });
      return;
    }

    global.stickerPack = args.join(' ').trim();

    await sock.sendMessage(jid, {
      text: `✿ ¡Pack actualizado~ ♡\n\n❥ Pack: *${global.stickerPack}*`,
    }, { quoted: msg });
  },
};