export default {
  name: 'delmeta',
  description: 'Resetea el nombre de tu pack de stickers',
  category: 'Herramientas',

  async execute({ sock, msg, jid, sender }) {
    if (global.stickerPacks?.[sender]) {
      delete global.stickerPacks[sender];
    }

    await sock.sendMessage(jid, {
      text: `✿ Tu pack fue reseteado~ ahora usa *${botName}* ♡`,
    }, { quoted: msg });
  },
};