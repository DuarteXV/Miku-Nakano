export default {
  name: 'setmeta',
  description: 'Cambia el nombre de tu pack de stickers',
  category: 'Herramientas',

  async execute({ sock, msg, jid, args, sender }) {
    if (!args.length) {
      await sock.sendMessage(jid, {
        text: `🌸 Uso: *${prefix}setmeta nombre del pack*`,
      }, { quoted: msg });
      return;
    }

    if (!global.stickerPacks) global.stickerPacks = {};

    global.stickerPacks[sender] = args.join(' ').trim();

    await sock.sendMessage(jid, {
      text: `✿ ¡Tu pack quedó como *${global.stickerPacks[sender]}* ~ ♡`,
    }, { quoted: msg });
  },
};