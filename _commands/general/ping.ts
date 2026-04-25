const command = {
    nombre: 'ping',
    comandos: ['p', 'speed', 'ms'],
    categoria: 'main',
    desc: 'Verifica la velocidad de respuesta.',
    async ejecutar(sock, msg, args, context) {
        const { from } = context;
        const start = Date.now();

        const sent = await sock.sendMessage(from, { 
            text: `✰ ¡Ping!\n> *${global.key}*` 
        });

        const latency = Math.floor((Date.now() - start) / 10);

        await sock.sendMessage(from, { 
            text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`,
            edit: sent.key
        });
    }
};

export default command;
