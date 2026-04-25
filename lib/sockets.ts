import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    jidNormalizedUser
} from '@itsliaaa/baileys';
import pino from 'pino';
import { rmSync, existsSync, readdirSync } from 'fs';
import chalk from 'chalk';
import { smsg, resolveLidToPnJid } from './simple.ts';
import { messageHandler } from './handler.ts';

// -- © 2026 AzamiJs - Zam

if (!(global as any).conns) (global as any).conns = [];
const cooldowns = new Map();
const MAX_SUBBOTS = 30;

export async function startSubBot(sockPrincipal: any, msg: any, phone: string) {
    const from = msg?.key?.remoteJid;
    const rawSender = msg?.key?.participant || msg?.key?.remoteJid;

    const sender = await resolveLidToPnJid(sockPrincipal, from, rawSender);
    const userId = phone.replace(/[^0-9]/g, '');
    const sessionPath = `./Sessions/Subbots/${userId}`;

    const now = Date.now();
    if (cooldowns.has(sender)) {
        const expirationTime = cooldowns.get(sender) + 120000;
        if (now < expirationTime) {
            const timeLeft = Math.ceil((expirationTime - now) / 1000);
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            return sockPrincipal.sendMessage(from, { 
                text: `《✧》 Debes esperar \`${minutes} minuto ${seconds} segundos\` para volver a intentar registrar un bot.` 
            }, { quoted: msg });
        }
    }

    if ((global as any).conns.length >= MAX_SUBBOTS) {
        return sockPrincipal.sendMessage(from, { 
            text: `《✧》 No se han encontrado espacios disponibles para registrar un \`Sub-Bot\`.\n> Por favor intenta en unos minutos.` 
        }, { quoted: msg });
    }

    cooldowns.set(sender, now);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Midnight SubBot', 'Edge', '122.0.2365.92'],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        getMessage: async () => ({ conversation: 'Midnight-Service' })
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(userId);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                const rtx = '✿ `Vincula tu cuenta usando el codigo.`\n\nSigue las instrucciones:\n✎ *Mas opciones » Dispositivos vinculados » Vincular nuevo dispositivo » Vincular usando numero.*\n\n_Recuerda que es recomendable no usar tu cuenta principal para registrar bots._\n↺ El codigo es valido por 60 segundos.';

                await sockPrincipal.sendMessage(from, { 
                    text: `${rtx}\n\n# ${code}` 
                }, { quoted: msg });
            } catch (err) {
                console.log(chalk.red(`[ ERROR ] SubBot Pairing:`), err);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            const botJid = jidNormalizedUser(sock.user?.id || '');
            (sock as any).userId = botJid;
            console.log(chalk.cyan(`[ SUBBOT ONLINE ] ${botJid}`));

            if (!(global as any).conns.some((c: any) => c.userId === botJid)) {
                (global as any).conns.push(sock);
            }

            if (from) {
                await sockPrincipal.sendMessage(from, { text: `Sub-bot conectado exitosamente.` });
            }
        }

        if (connection === 'close') {
            const code = (lastDisconnect?.error as any)?.output?.statusCode;
            const botId = (sock as any).userId || userId;

            if (code !== DisconnectReason.loggedOut) {
                startSubBot(sockPrincipal, msg, userId);
            } else {
                console.log(chalk.red(`[ SUBBOT CLOSED ] ${botId}`));
                if (existsSync(sessionPath)) {
                    rmSync(sessionPath, { recursive: true, force: true });
                }
                (global as any).conns = (global as any).conns.filter((c: any) => c.userId !== botId);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const raw of messages) {
            if (!raw.message) continue;
            const m = smsg(sock, raw);
            await messageHandler(sock, m);
        }
    });

    return sock;
}

export async function loadSubBots(sockPrincipal: any) {
    const subbotDir = './Sessions/Subbots';
    if (!existsSync(subbotDir)) return;

    const folders = readdirSync(subbotDir);
    for (const folder of folders) {
        console.log(chalk.yellow(`[ RECONNECTING SUBBOT ] ${folder}`));
        await startSubBot(sockPrincipal, null, folder);
    }
    }
