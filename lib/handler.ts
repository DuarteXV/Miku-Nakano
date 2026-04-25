import { jidNormalizedUser, proto } from '@itsliaaa/baileys';
import { commands, aliasMap } from '../index.ts';
import { resolveLidToPnJid } from './simple.ts';
import { db } from './database.ts';
import { getMessageData } from './utils.ts';
import '../config.ts';
import chalk from 'chalk';

const msgCache = new Set<string>();
const groupMetadataCache = new Map();
const metadataTTL = 5000;

const decodeJid = (jid: string) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        const decode = jid.match(/^(\d+):(\d+)@/gi) || [jid];
        return decode[0].split(':')[0] + '@s.whatsapp.net';
    }
    return jid.split('@')[0] + '@s.whatsapp.net';
};

const getAdmins = (participants: any[]) => {
    return participants
        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        .map(p => decodeJid(p.id));
};

export async function messageHandler(sock: any, msg: proto.IWebMessageInfo) {
    const { key, message, pushName } = msg;
    if (!message || key.fromMe) return;

    if (msgCache.has(key.id!)) return;
    msgCache.add(key.id!);
    setTimeout(() => msgCache.delete(key.id!), 5 * 60 * 1000);

    const from = key.remoteJid!;

    const { body, type, quoted, isImage, isVideo, isSticker, isAudio, isDocument, isAnimated, previewLink } = getMessageData(msg);

    const botName = global.botName;
    const firstName = botName.split(' ')[0];
    const shortName = botName.charAt(0);
    const prefixes = global.prefix;

    const escapedPrefixes = prefixes.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const fullRegex = new RegExp(`^(${botName}|${firstName}|${shortName})(${escapedPrefixes})`, 'i');
    const simpleRegex = new RegExp(`^(${escapedPrefixes})`);

    let usedPrefix = '';
    let commandPart = '';

    const matchFull = body.match(fullRegex);
    if (matchFull) {
        usedPrefix = matchFull[2]; 
        commandPart = body.slice(matchFull[0].length).trim();
    } else {
        const matchSimple = body.match(simpleRegex);
        if (matchSimple) {
            usedPrefix = matchSimple[0];
            commandPart = body.slice(usedPrefix.length).trim();
        } else {
            return;
        }
    }

    const args = commandPart.split(/ +/);
    const commandName = (args.shift() || "").toLowerCase();
    const command = commands.get(commandName) || aliasMap.get(commandName);

    if (!command) {
        return sock.sendMessage(from, { 
            text: `《✧》El comando *${commandName}* no existe.\nPara ver la lista de comandos usa:\n» *${usedPrefix}help*` 
        }, { quoted: msg });
    }

    const rawSender = key.participant || from;
    const sender = await resolveLidToPnJid(sock, from, rawSender);
    const normalizedSender = jidNormalizedUser(sender);
    const isGroup = from.endsWith('@g.us');

    const userPath = `users["${normalizedSender}"]`;
    if (!db.has(userPath).value()) {
        db.set(userPath, { name: pushName || 'User', totalCommands: 1 }).write();
    } else {
        db.get(userPath)
          .assign({ name: pushName || db.get(`${userPath}.name`).value() })
          .update('totalCommands', (n: number) => n + 1)
          .write();
    }

    const isOwner = global.owner.some((num: string) => {
        const cleanNumber = num.replace(/\D/g, '');
        return normalizedSender.includes(cleanNumber);
    });

    const userNumber = normalizedSender.split('@')[0];
    console.log(chalk.blue(isGroup ? '[GRUPO]' : '[PRIVADO]'), chalk.cyan(`${userNumber} - ${pushName || 'User'}:`), chalk.blue(`${usedPrefix}${commandName}`));

    try {
        let isAdmin = false;
        let isBotAdmin = false;

        if (isGroup) {
            let cached = groupMetadataCache.get(from);
            let metadata = (cached && (Date.now() - cached.timestamp < metadataTTL)) ? cached.metadata : null;

            if (!metadata) {
                metadata = await sock.groupMetadata(from).catch(() => null);
                if (metadata) groupMetadataCache.set(from, { metadata, timestamp: Date.now() });
            }

            if (metadata) {
                const admins = getAdmins(metadata.participants);
                const botId = decodeJid(sock.user.id);
                const botLid = sock.user.lid ? decodeJid(sock.user.lid) : null;
                const cleanUserJid = decodeJid(normalizedSender);

                isAdmin = admins.some(admin => admin === cleanUserJid || admin === decodeJid(rawSender));
                isBotAdmin = admins.some(admin => admin === botId || (botLid && admin === botLid));
            }
        }

        if (command.groupOnly && !isGroup) return sock.sendMessage(from, { text: global.msg.group }, { quoted: msg });
        if (command.privateOnly && isGroup) return sock.sendMessage(from, { text: global.msg.private }, { quoted: msg });
        if (command.ownerOnly && !isOwner) return sock.sendMessage(from, { text: global.msg.owner }, { quoted: msg });
        if (command.adminOnly && !isAdmin && !isOwner) return sock.sendMessage(from, { text: global.msg.admin }, { quoted: msg });
        if (command.botAdminOnly && !isBotAdmin) return sock.sendMessage(from, { text: global.msg.botAdmin }, { quoted: msg });

        await command.ejecutar(sock, msg, args, {
            isGroup, isOwner, isAdmin, isBotAdmin,
            sender: normalizedSender, from, body, usedPrefix,
            pushName: pushName || 'User', command: commandName,
            type, quoted, isImage, isVideo, isSticker, isAudio, isDocument, isAnimated, previewLink
        });

    } catch (e: any) {
        console.error(chalk.red(`[ ERROR ]`), e);
        await sock.sendMessage(from, { text: `${global.msg.error}\n\n✿ Error: ${command.nombre} > ${e.message}` });
    }
                           }
