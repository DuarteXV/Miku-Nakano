import { db } from '../core/database.js';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
  name: 'setbanner',
  description: 'Cambia el banner del menú.',
  category: 'config',
  owner: true,

  async execute({ sock, msg, jid, args }) {
    const quoted  = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mediaMsg = msg.message?.imageMessage ?? quoted?.imageMessage;

    let bannerUrl;

    if (args[0]?.startsWith('http')) {
      bannerUrl = args[0];
    } else {
      if (!mediaMsg) return sock.sendMessage(jid, {
        text: `🎋 Manda una imagen con el comando, responde a una, o usa: ${prefix}setbanner <url>`,
      }, { quoted: msg });

      const stream = await downloadContentFromMessage(mediaMsg, 'image');
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const base64  = buffer.toString('base64');
      const mimetype = mediaMsg.mimetype ?? 'image/png';
      const ext     = mimetype.split('/')[1] ?? 'png';

      const uploadRes = await fetch('https://cdn.adoolab.xyz/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `banner.${ext}`,
          data: base64,
          mimetype,
          expiration: 'never',
        }),
      });

      const json = await uploadRes.json();
      console.log('[setbanner] CDN:', JSON.stringify(json));

      if (!json.url) return sock.sendMessage(jid, {
        text: `🎋 El CDN no devolvió una URL. Respuesta: ${JSON.stringify(json)}`,
      }, { quoted: msg });

      bannerUrl = json.url;
    }

    const current = db.settings['config'] ?? {};
    db.settings['config'] = { ...current, bannerUrl };

    await sock.sendMessage(jid, {
      text: `🎋 Banner actualizado.\n${bannerUrl}`,
    }, { quoted: msg });
  },
};