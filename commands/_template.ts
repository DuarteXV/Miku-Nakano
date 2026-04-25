import { Command } from '../types';

const command: Command = {
    nombre: 'nombre_del_comando',
    comandos: ['alias1', 'alias2'],
    categoria: 'categoria_aqui',
    desc: 'Descripción corta.',
    async ejecutar(sock, msg, args, context) {
        const { from } = context;
        await sock.sendMessage(from, { text: '✿ Comando funcionando.' }, { quoted: msg });
    }
};

export default command;
