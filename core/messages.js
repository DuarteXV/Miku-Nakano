import { readdir } from 'fs/promises';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { log } from './console.js';
import { db } from './database.js';
import { resolveLidToRealJid } from './resolver.js';
import config from './config.js';

const { owners, prefix } = config;

export const commands = new Map();

const errorUser  = `> ⩩ *Lo sentimos* : Este comando es *exclusivo* para *administradores* del grupo.`;
const errorBot   = `> ⩩ *Lo sentimos* : Este comando solo puede ser utilizado si el *bot es administrador* del grupo.`;
const errorOwner = `> ⩩ *Lo sentimos* : Este comando es *exclusivo* para los *owners* del bot.`;

const getType = (msg) => {
  const types = [
    'conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage',
    'audioMessage', 'stickerMessage', 'documentMessage', 'reactionMessage',
    'locationMessage', 'contactMessage',
  ];
  return types.find(t => msg.message?.[t]) ?? 'unknown';
};

const getText = (msg) => {
  const m = msg.message;
  return (
    m?.conversation              ??
    m?.extendedTextMessage?.text ??
    m?.imageMessage?.caption     ??
    m?.videoMessage?.caption     ??
    ''
  );
};

const getSize = (msg) => {
  const m = msg.message;
  const media =
    m?.imageMessage    ??
    m?.videoMessage    ??
    m?.audioMessage    ??
    m?.documentMessage ??
    m?.stickerMessage  ??
    null;

  if (!media?.fileLength) return null;
  const bytes = Number(media.fileLength);
  if (bytes < 1024)      return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return                        `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

// getName mejorado: consulta la DB primero (por número sin sufijo), luego pushName, luego el JID
export const getName = (conn, jid) => {
  if (!jid) return 'Desconocido';
  
  // Normalizar JID a solo número para buscar en DB
  const plainJid = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  
  // 1. Consultar la DB por el JID (usando plainJid como clave)
  const dbUser = db.users[plainJid];
  if (dbUser?.name) return dbUser.name;
  
  // 2. Intentar obtener del store de contactos
  const contact = conn?.store?.contacts?.[jid];
  if (contact?.name)    return contact.name;
  if (contact?.notify)  return contact.notify;
  if (contact?.verifiedName) return contact.verifiedName;
  
  // 3. Extraer del JID como último recurso
  return plainJid;
};

const getNumber = async (sock, msg, jid, isGroup) => {
  const raw = isGroup ? msg.key.participant : msg.key.remoteJid;
  if (!raw) return '-';;
  const resolved = await resolveLidToRealJid(raw, sock, jid);
  return resolved?.replace('@s.whatsapp.net', '').replace('@g.us', '') ?? '-';;
};

const getAdmins = async (sock, jid) => {
  const metadata = await sock.groupMetadata(jid);
  const admins   = [];
  for (const p of metadata.participants) {
    if (p.admin === 'admin' || p.admin === 'superadmin') {
      const resolved = await resolveLidToRealJid(p.id, sock, jid);
      admins.push(resolved);
    }
  }
  return admins;
};

const isUserAdmin = async (sock, jid, number) => {
  const admins = await getAdmins(sock, jid);
  return admins.includes(`${number}@s.whatsapp.net`);
};

const isBotAdmin = async (sock, jid) => {
  const botNumber = sock.user.id.split(':')[0];
  const admins    = await getAdmins(sock, jid);
  return admins.includes(`${botNumber}@s.whatsapp.net`);
};

const isOwner = (number) => owners.includes(number);

const saveUser = (numero, nombre) => {
  if (numero === '-') return;
  if (!db.users[numero]) {
    db.users[numero] = { name: nombre, firstSeen: Date.now(), lastSeen: Date.now() };
  } else {
    db.users[numero].name     = nombre;
    db.users[numero].lastSeen = Date.now();
  }
};

export const loadCommands = async () => {
  commands.clear();

  const savedName = db.settings['config']?.botName;
  if (savedName) global.botName = savedName;

  const files   = await readdir(resolve('comandos'));
  const jsFiles = files.filter(f => f.endsWith('.js'));

  for (const file of jsFiles) {
    const filePath = resolve(`comandos/${file}`);
    const fileUrl  = pathToFileURL(filePath).href + `?v=${Date.now()}`;
    const mod      = await import(fileUrl);

    const exported = mod.default;

    if (!exported) {
      log.warn(`Sin exportación válida  ·  ${file}`);
      continue;
    }

    const cmds = Array.isArray(exported) ? exported : [exported];

    for (const cmd of cmds) {
      if (!cmd?.name) {
        log.warn(`Comando sin nombre  ·  ${file}`);
        continue;
      }
      commands.set(cmd.name, cmd);
      log.success(`Comando cargado  ·  ${cmd.name}`);
    }
  }

  console.log();
  log.info(`${commands.size} comando(s) listo(s)`);
  console.log();
};

export const handleMessage = async (sock, msg) => {
  if (!msg.message || msg.key.fromMe) return;

  const jid     = msg.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');
  const type    = getType(msg);
  const text    = getText(msg).trim();
  const size    = getSize(msg);
  const usuario = getName(sock, msg.key.remoteJid);
  const numero  = await getNumber(sock, msg, jid, isGroup);

  saveUser(numero, usuario);

  if (!text.startsWith(prefix)) {
    log.mensaje({ usuario, numero, tipo: type, tamaño: size, mensaje: text || '-' });
    return;
  }

  const [rawName, ...args] = text.slice(prefix.length).trim().split(/\s+/);
  const commandName        = rawName.toLowerCase();
  const command            = commands.get(commandName);

  log.comando({ usuario, numero, tipo: type, tamaño: size, comando: `${prefix}${commandName}` });

  if (!command) {
    log.warn(`Comando desconocido  ·  ${commandName}`);
    return;
  }

  if (command.owner && !isOwner(numero)) {
    await sock.sendMessage(jid, { text: errorOwner }, { quoted: msg });
    return;
  }

  if (command.adminuser && isGroup) {
    const userAdmin = await isUserAdmin(sock, jid, numero);
    if (!userAdmin) {
      await sock.sendMessage(jid, { text: errorUser }, { quoted: msg });
      return;
    }
  }

  if (command.adminsocket && isGroup) {
    const botAdmin = await isBotAdmin(sock, jid);
    if (!botAdmin) {
      await sock.sendMessage(jid, { text: errorBot }, { quoted: msg });
      return;
    }
  }

  try {
    await command.execute({ sock, msg, jid, args, isGroup, sender: numero, type });
  } catch (err) {
    log.error(`Failed error on: ${commandName}  ·  ${err.message}`);
  }
};
