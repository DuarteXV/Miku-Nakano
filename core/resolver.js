const groupMetadataCache = new Map();
const lidCache = new Map();

const metadataTTL = 5 * 60 * 1000;

const setLidCache = (key, value) => {
  lidCache.set(key, value);
  setTimeout(() => lidCache.delete(key), 30 * 60 * 1000);
};

const normalizeToJid = (phone) => {
  if (!phone) return null;
  const base = typeof phone === 'number' ? phone.toString() : phone.replace(/\D/g, '');
  return base ? base : null;
};

export const resolveLidToRealJid = async (lid, client, groupChatId) => {
  const input = lid?.toString().trim();
  if (!input || !groupChatId?.endsWith('@g.us')) return input;
  if (input.endsWith('@s.whatsapp.net')) return input.replace('@s.whatsapp.net', '');
  if (lidCache.has(input)) return lidCache.get(input);

  let metadata = groupMetadataCache.get(groupChatId)?.metadata;
  if (!metadata || Date.now() - groupMetadataCache.get(groupChatId).timestamp > metadataTTL) {
    try {
      metadata = await client.groupMetadata(groupChatId);
      groupMetadataCache.set(groupChatId, { metadata, timestamp: Date.now() });
    } catch {
      return input;
    }
  }

  const participants = metadata?.participants || [];
  const participant = participants.find(
    (p) =>
      p.id === input ||
      p.id.split(':')[0] === input.split(':')[0] ||
      p.id.split('@')[0] === input.split('@')[0]
  );

  if (participant?.phoneNumber) {
    const realJid = normalizeToJid(participant.phoneNumber);
    setLidCache(input, realJid);
    return realJid;
  }

  const altParticipant = participants.find((p) => p.lid === input || p.id === input);
  if (altParticipant?.phoneNumber) {
    const realJid = normalizeToJid(altParticipant.phoneNumber);
    setLidCache(input, realJid);
    return realJid;
  }

  return input;
};

export const fixLid = async (client, m) => {
  const decodedJid = client.decodeJid(m.key.participant || m.chat || '');
  if (m.chat.endsWith('@g.us')) {
    return await resolveLidToRealJid(decodedJid, client, m.chat);
  }
  if (decodedJid.includes('@lid')) {
    try {
      const result = await client.onWhatsApp(decodedJid);
      if (result && result.length > 0) {
        const realJid = result[0].jid;
        setLidCache(decodedJid, realJid);
        return realJid;
      }
    } catch {
      return decodedJid;
    }
  }
  return decodedJid;
};
