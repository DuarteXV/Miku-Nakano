import fs from 'fs';
import path from 'path';
import os from 'os';
import Crypto from 'crypto';
import { spawn } from 'child_process';
import webp from 'node-webpmux';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

async function writeExif(mediaBuffer, { packname, author, categories = [''] }) {
  const tmpFileIn  = path.join(os.tmpdir(), `${Crypto.randomBytes(6).toString('hex')}.webp`);
  const tmpFileOut = path.join(os.tmpdir(), `${Crypto.randomBytes(6).toString('hex')}.webp`);
  fs.writeFileSync(tmpFileIn, mediaBuffer);

  const img  = new webp.Image();
  const json = {
    'sticker-pack-id':        `${packname}-${author}`,
    'sticker-pack-name':       packname,
    'sticker-pack-publisher':  author,
    'android-app-store-link': '',
    'ios-app-store-link':     '',
    emojis: categories,
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
  const exif     = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  await img.load(tmpFileIn);
  fs.unlinkSync(tmpFileIn);
  img.exif = exif;
  await img.save(tmpFileOut);

  const out = fs.readFileSync(tmpFileOut);
  fs.unlinkSync(tmpFileOut);
  return out;
}

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => (err += d.toString()));
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(err))));
  });
}

async function imageToWebp(inputPath, outputPath) {
  const vf = "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1";
  await runFFmpeg(['-y', '-i', inputPath, '-vf', vf, '-c:v', 'libwebp', '-lossless', '1', '-preset', 'default', outputPath]);
}

async function videoToWebp(inputPath, outputPath) {
  const vf = "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15,setsar=1";
  await runFFmpeg([
    '-y', '-i', inputPath,
    '-vf', vf,
    '-c:v', 'libwebp_anim',
    '-loop', '0',
    '-ss', '00:00:00', '-t', '00:00:10',
    '-preset', 'default',
    '-an', '-fps_mode', 'passthrough',
    outputPath,
  ]);
}

export default {
  name: 's',
  description: 'Crea un sticker o reenvía uno con nombre y autor',
  category: 'Herramientas',

  async execute({ sock, msg, jid, args, sender }) {
    const pushName = msg.pushName ?? sender.split('@')[0];
    let packname   = global.stickerPacks?.[sender] ?? global.stickerPack ?? botName ?? 'Miku Nakano';
    let author     = `🎀 ${pushName}`;

    if (args.length > 0) {
      const text  = args.join(' ');
      const parts = text.split(/[•|]/);
      packname    = parts[0].trim() || packname;
      author      = parts.slice(1).join('•').trim() || author;
    }

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg   = contextInfo?.quotedMessage;

    if (!quotedMsg) {
      await sock.sendMessage(jid, {
        text: '🌸 ¡Respóndele a una imagen, video, gif o sticker, ne~ (◕‿◕✿)',
      }, { quoted: msg });
      return;
    }

    const isImage   = !!quotedMsg.imageMessage;
    const isVideo   = !!quotedMsg.videoMessage;
    const isSticker = !!quotedMsg.stickerMessage;

    if (!isImage && !isVideo && !isSticker) {
      await sock.sendMessage(jid, {
        text: '🌷 Ese formato no lo puedo usar... prueba con imagen, video o sticker ♡',
      }, { quoted: msg });
      return;
    }

    const tmpDir     = os.tmpdir();
    const rand       = Crypto.randomBytes(6).toString('hex');
    const inputPath  = path.join(tmpDir, `input_${rand}.${isVideo ? 'mp4' : isSticker ? 'webp' : 'jpg'}`);
    const outputPath = path.join(tmpDir, `output_${rand}.webp`);

    try {
      const fakeMsg = {
        key: {
          remoteJid:   jid,
          fromMe:      false,
          id:          contextInfo.stanzaId,
          participant: contextInfo.participant ?? msg.key.participant,
        },
        message: quotedMsg,
      };

      const buffer = await downloadMediaMessage(
        fakeMsg,
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      if (!buffer || !buffer.length) {
        await sock.sendMessage(jid, {
          text: '🌸 No pude descargar el archivo... intenta de nuevo ♡',
        }, { quoted: msg });
        return;
      }

      let webpBuffer;

      if (isSticker) {
        webpBuffer = buffer;
      } else {
        fs.writeFileSync(inputPath, buffer);
        if (isVideo) await videoToWebp(inputPath, outputPath);
        else         await imageToWebp(inputPath, outputPath);
        webpBuffer = fs.readFileSync(outputPath);
      }

      const finalSticker = await writeExif(webpBuffer, { packname, author });

      await sock.sendMessage(jid, { sticker: finalSticker }, { quoted: msg });

    } catch (e) {
      console.error(e);
      await sock.sendMessage(jid, {
        text: '🌷 Algo salió mal al crear el sticker... gomen ne~ (´；ω；`)',
      }, { quoted: msg });
    } finally {
      if (fs.existsSync(inputPath))  fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  },
};