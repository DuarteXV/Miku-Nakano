import os from 'os';

export default {
  name: 'ping',
  description: 'Muestra la latencia con la cual responde el socket.',
  category: 'info',

  async execute({ sock, msg, jid }) {
    const start   = Date.now();
    const sent    = await sock.sendMessage(jid, { text: '🎋 Un momento...' }, { quoted: msg });
    const latency = Date.now() - start;

    const totalMem = os.totalmem();
    const freeMem  = os.freemem();
    const usedMem  = totalMem - freeMem;

    const formatBytes = (bytes) => {
      if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} MB`;
      return `${(bytes / 1024 ** 2).toFixed(2)} GB`;
    };

    const ramUsed  = formatBytes(usedMem);
    const ramTotal = formatBytes(totalMem);
    const ramPerc  = ((usedMem / totalMem) * 100).toFixed(1);

    const uptime   = process.uptime();
    const hours    = Math.floor(uptime / 3600);
    const minutes  = Math.floor((uptime % 3600) / 60);
    const seconds  = Math.floor(uptime % 60);
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

    const text = [
      `🎋 Sigo aquí. ${latency}ms de latencia.`,
      ``,
      `RAM  ${ramUsed} / ${ramTotal} (${ramPerc}%)`,
      `Uptime  ${uptimeStr}`,
    ].join('\n');

    await sock.sendMessage(jid, { text, edit: sent.key });
  },
};
