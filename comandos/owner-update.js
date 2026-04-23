import { exec } from 'child_process';
import { promisify } from 'util';
import { loadCommands } from '../core/messages.js';

const execAsync = promisify(exec);

export default {
  name: 'update',
  description: 'Ejecuta git pull y recarga los comandos del bot.',
  category: 'owner',
  owner: true,

  async execute({ sock, msg, jid }) {
    try {
      await sock.sendMessage(jid, { text: '🎋 Revisando actualizaciones...' }, { quoted: msg });

      const { stdout, stderr } = await execAsync('bash -c "git pull"');

      if (stdout.includes('Already up to date') || stdout.includes('Already up-to-date')) {
        await sock.sendMessage(jid, { text: '🎋 Ya estás en la última versión. No hay nada que hacer.' }, { quoted: msg });
        return;
      }

      let response = '🎋 Actualización completada.\n\n';
      if (stdout) response += `\`\`\`\n${stdout.trim()}\n\`\`\``;
      if (stderr) response += `\n\nAdvertencia:\n\`\`\`\n${stderr.trim()}\n\`\`\``;

      if (stdout.includes('Updating') || stdout.includes('Fast-forward')) {
        await sock.sendMessage(jid, { text: response + '\n\nRecargando comandos...' }, { quoted: msg });
        await loadCommands();
        await sock.sendMessage(jid, { text: '🎋 Listo. Los comandos están al día.' }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: response }, { quoted: msg });
      }

    } catch (error) {
      await sock.sendMessage(jid, {
        text: `🎋 Algo salió mal.\n\`\`\`\n${error.message}\n\`\`\``,
      }, { quoted: msg });
    }
  },
};