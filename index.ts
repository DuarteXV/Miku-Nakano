import type { Command } from './types.ts';
import { messageHandler } from './lib/handler.ts';
import './config.ts';
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeCacheableSignalKeyStore, 
    fetchLatestBaileysVersion 
} from '@itsliaaa/baileys';
import { Boom } from '@hapi/boom';
import chalk from 'chalk';
import * as fs from 'fs';
import P from 'pino';
import * as readline from 'readline';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadSubBots } from './lib/sockets.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const commands = new Map<string, any>();
export const aliasMap = new Map<string, any>();
const msgRetryCounterCache = new Map();
let usarCodigo = false;
let opcion = '';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const askQuestion = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

const normalizePhoneForPairing = (phone: string) => phone.replace(/[^0-9]/g, '');

const displayLoadingMessage = () => {
    console.log(chalk.bold.redBright(`\n\nPor favor, Ingrese el número de WhatsApp.\n` +
        `${chalk.bold.yellowBright("Ejemplo: +57301******")}\n` +
        `${chalk.bold.magentaBright('---> ')} `));
};

const loadCommands = async (dir: string = path.join(__dirname, 'commands')) => {
    const files = fs.readdirSync(dir);
    await Promise.all(files.map(async (file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            await loadCommands(fullPath);
        } else if (file.endsWith('.ts') && !file.startsWith('_')) {
            try {
                const fileUrl = pathToFileURL(fullPath).href + `?update=${Date.now()}`;
                const { default: command } = await import(fileUrl);

                if (command?.nombre) {
                    commands.set(command.nombre, command);
                    if (Array.isArray(command.comandos)) {
                        command.comandos.forEach((alias: string) => aliasMap.set(alias, command));
                    }
                }
            } catch (e) {
                console.log(chalk.red(`[ ERROR ] cargando comando en ${file}:`), e);
            }
        }
    }));
};

let watchTimeout: NodeJS.Timeout;
async function setupCommandWatcher() {
    fs.watch(path.join(__dirname, 'commands'), { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.ts')) {
            clearTimeout(watchTimeout);
            watchTimeout = setTimeout(async () => {
                commands.clear();
                aliasMap.clear();
                await loadCommands();
                console.log(chalk.cyan(`[ SYSTEM ] Comandos actualizados.`));
            }, 1000);
        }
    });
}

async function startMidnight() {
    const sessionDir = './Sessions/Owner';
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    if (!state.creds.registered && !opcion) {
        let lineM = '⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ 》';
        console.log(chalk.blueBright(`╭${lineM}`));
        opcion = await askQuestion(
            `┊ ${chalk.blue.bgBlue.bold.cyan(' METODO DE VINCULACION ')}\n` +
            `┊ ${chalk.bold.redBright('⇢ Opcion 1:')} ${chalk.blueBright('Codigo QR.')}\n` +
            `┊ ${chalk.bold.redBright('⇢ Opcion 2:')} ${chalk.blueBright('Codigo de 8 digitos.')}\n` +
            `╰${lineM}\n${chalk.bold.magentaBright('---> ')}`
        );
        usarCodigo = opcion === "2";
    }

    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: opcion === '1',
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
        },
        browser: ['Windows', 'Edge', '122.0.2365.92'],
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        msgRetryCounterCache,
        getMessage: async () => ({ conversation: 'Midnight-Service' })
    });

    if (usarCodigo && !sock.authState.creds.registered) {
        displayLoadingMessage();
        const phoneInput = await askQuestion("");
        const numero = normalizePhoneForPairing(phoneInput);

        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(numero);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.black.bgBlue(` CODIGO DE VINCULACION `), chalk.white(`: ${code}`));
            } catch (err) {
                console.log(chalk.red('[ ERROR ] solicitud de codigo:'), err);
            }
        }, 3000);
    }

    await loadCommands();
    setupCommandWatcher();

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
            if (code !== DisconnectReason.loggedOut) {
                startMidnight();
            }
        } else if (connection === 'open') {
            console.log(chalk.cyan(`\n[ Midnight Online ]`));
            await loadSubBots(sock);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;
            messageHandler(sock, msg).catch(e => {
                if (!e.message.includes('conflicting')) {
                    console.error(chalk.red(`[ FATAL ERROR ]`), e);
                }
            });
        }
    });

    return sock;
}

startMidnight().catch(err => console.log(chalk.red("FATAL ERROR: "), err));
