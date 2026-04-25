import { proto } from '@itsliaaa/baileys';

export interface CommandContext {
    isGroup: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    isBotAdmin: boolean;
    isBot: boolean;
    sender: string;
    from: string;
    body: string;
    text: string;
    usedPrefix: string;
    command: string;
    pushName: string;
    groupMetadata: any | null;
    quotedMsg: proto.IMessage | null | undefined;
}

export interface Command {
    nombre: string;
    comandos: string[];
    categoria: string;
    desc: string;
    usage?: string;
    ownerOnly?: boolean;
    groupOnly?: boolean;
    privateOnly?: boolean;
    adminOnly?: boolean;
    botAdminOnly?: boolean;
    cooldown?: number;
    ejecutar: (sock: any, msg: proto.IWebMessageInfo, args: string[], context: CommandContext) => Promise<void>;
}
