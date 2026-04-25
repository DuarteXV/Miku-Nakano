import { jidNormalizedUser, proto, downloadContentFromMessage, generateForwardMessageContent, generateWAMessageFromContent } from '@itsliaaa/baileys';
import fs from 'fs';

const groupMetadataCache = new Map();
const lidCache = new Map();
const metadataTTL = 5000;

function decodeJid(jid: string): string {
    if (!jid) return '';
    if (/:\d+@/gi.test(jid)) {
        const decode = jid.match(/(\d+)(:\d+)?@(.+)/);
        return decode ? `${decode[1]}@${decode[3]}` : jid;
    }
    return jid;
}

export async function resolveLidToPnJid(conn: any, chatJid: string, candidateJid: string) {
    const jid = decodeJid(candidateJid);
    if (!jid) return jid;
    if (jid.endsWith('@s.whatsapp.net')) return jid.split(':')[0] + '@s.whatsapp.net';
    if (!jid.endsWith('@lid') || !chatJid?.endsWith('@g.us')) return jid;

    if (lidCache.has(jid)) return lidCache.get(jid);

    try {
        let cached = groupMetadataCache.get(chatJid);
        let meta = (cached && (Date.now() - cached.timestamp < metadataTTL)) ? cached.metadata : null;

        if (!meta) {
            meta = await conn.groupMetadata(chatJid);
            groupMetadataCache.set(chatJid, { metadata: meta, timestamp: Date.now() });
        }

        const participants = Array.isArray(meta?.participants) ? meta.participants : [];

        const found = participants.find(p => {
            const pid = decodeJid(p?.id || '');
            const plid = decodeJid(p?.lid || '');
            return pid === jid || plid === jid;
        });

        if (found) {
            let realNumber = found.phoneNumber || (found.id.endsWith('@s.whatsapp.net') ? found.id : null);
            if (realNumber) {
                const finalPn = decodeJid(realNumber.includes('@') ? realNumber : `${realNumber}@s.whatsapp.net`).split(':')[0] + '@s.whatsapp.net';
                lidCache.set(jid, finalPn);
                return finalPn;
            }
        }

        const [onWa] = await conn.onWhatsApp(jid.split('@')[0]);
        if (onWa && onWa.exists) {
            const fixed = decodeJid(onWa.jid).split(':')[0] + '@s.whatsapp.net';
            lidCache.set(jid, fixed);
            return fixed;
        }

    } catch (e) {}

    if (jid.endsWith('@lid')) {
        const forcePn = jid.split('@')[0] + '@s.whatsapp.net';
        return forcePn;
    }

    return jid;
}

export async function pickTargetJid(m: any, conn: any) {
    const chatJid = decodeJid(m?.chat || m?.key?.remoteJid || m?.from || '');
    const ctx = m?.message?.extendedTextMessage?.contextInfo || m?.msg?.contextInfo || {};

    let raw = '';
    const mentioned = m?.mentionedJid || ctx?.mentionedJid || ctx?.mentionedJidList || [];

    if (Array.isArray(mentioned) && mentioned.length) {
        raw = mentioned[0];
    } else if (m?.quoted || ctx?.participant) {
        raw = m?.quoted?.participant || ctx?.participant || m?.quoted?.key?.participant || m?.quoted?.key?.remoteJid || '';

        const selfJid = decodeJid(m?.key?.participant || m?.key?.remoteJid || '');
        if (!raw || decodeJid(raw) === selfJid) {
            raw = m?.quoted?.key?.remoteJid
               || m?.quoted?.key?.participant
               || raw;
        }
    } else if (conn?.parseMention) {
        const text = m?.text || m?.body || m?.message?.conversation || '';
        const parsed = conn.parseMention(String(text));
        if (parsed?.length) raw = parsed[0];
    }

    if (raw) {
        return await resolveLidToPnJid(conn, chatJid, raw);
    } else {
        const sender = m?.key?.participant || m?.key?.remoteJid || '';
        return await resolveLidToPnJid(conn, chatJid, sender);
    }
}

export const smsg = (sock: any, m: any) => {
    if (!m) return m;
    let res: any = {};
    res.key = m.key;
    res.id = m.key.id;
    res.from = jidNormalizedUser(m.key.remoteJid);
    res.fromMe = m.key.fromMe;
    res.isGroup = res.from.endsWith('@g.us');
    res.sender = jidNormalizedUser(res.isGroup ? m.key.participant : m.key.remoteJid);

    res.mtype = Object.keys(m.message || {})[0];
    res.body = m.message?.conversation || 
               m.message?.extendedTextMessage?.text || 
               m.message?.imageMessage?.caption || 
               m.message?.videoMessage?.caption || 
               m.message?.templateButtonReplyMessage?.selectedId || 
               m.message?.buttonsResponseMessage?.selectedButtonId || "";

    res.mention = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    res.quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage ? m.message.extendedTextMessage.contextInfo.quotedMessage : null;

    if (res.quoted) {
        res.quoted.sender = jidNormalizedUser(m.message.extendedTextMessage.contextInfo.participant);
        res.quoted.id = m.message.extendedTextMessage.contextInfo.stanzaId;
        res.quoted.mtype = Object.keys(res.quoted)[0];
        res.quoted.text = res.quoted.conversation || res.quoted.extendedTextMessage?.text || res.quoted.imageMessage?.caption || "";
        res.quoted.isBot = res.quoted.id.startsWith('BAE5') || res.quoted.id.length === 16;
    }

    res.react = (emoji: string) => sock.sendMessage(res.from, { react: { text: emoji, key: res.key } });
    res.reply = (text: string) => sock.sendMessage(res.from, { text }, { quoted: m });

    return res;
};

export const downloadMedia = async (message: proto.IMessage) => {
    const type = Object.keys(message)[0] as keyof proto.IMessage;
    const mimeMap: any = {
        imageMessage: 'image',
        videoMessage: 'video',
        stickerMessage: 'sticker',
        documentMessage: 'document',
        audioMessage: 'audio'
    };

    if (!mimeMap[type]) return null;

    const stream = await downloadContentFromMessage(message[type] as any, mimeMap[type]);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
};

export const getFile = async (path: string) => {
    if (fs.existsSync(path)) return fs.readFileSync(path);
    return null;
};

export const parseMention = (text: string): string[] => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
};

export async function copyMsg(jid: string, m: any, sock: any) {
    let type = Object.keys(m.message)[0];
    let content = await generateForwardMessageContent(m, { force: true });
    let ctype = Object.keys(content)[0];
    let context = {};
    if (type !== "conversation") context = m.message[type].contextInfo;
    content[ctype].contextInfo = { ...context, ...content[ctype].contextInfo };
    const waMessage = await generateWAMessageFromContent(jid, content, { userJid: sock.user.id });
    await sock.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
    return waMessage;
        }
