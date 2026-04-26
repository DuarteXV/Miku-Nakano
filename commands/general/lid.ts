const command = {
    nombre: 'lid',
    comandos: ['lid', 'lidnum'],
    categoria: 'group',
    desc: 'Obtener JID y LID de un usuario.',
    async ejecutar(sock, msg, args, context) {
        const { from } = context;
        let targetId: string
        let title = '🎵 Miku encontró tu info~'
        let targetLID: string | null = null

        const text = args.join(' ')
        const groupMetadata = msg.isGroup ? await sock.groupMetadata(from).catch(() => ({ participants: [] })) : { participants: [] }

        if (msg.quoted) {
            targetId = msg.quoted.sender
        } else if (text) {
            const mentionMatch = text.match(/@(\d+)/)
            if (mentionMatch) {
                targetId = mentionMatch[1] + '@s.whatsapp.net'
                const participant = groupMetadata.participants.find((p: any) => p.id === targetId)
                if (participant?.lid) targetLID = participant.lid
            } else {
                const number = text.replace(/\D/g, '')
                if (number.length > 7) targetId = number + '@s.whatsapp.net'
            }
        }

        if (!targetId) {
            targetId = msg.sender
            title = '🎵 Aquí está tu info~'
            const participant = groupMetadata.participants.find((p: any) => p.id === msg.sender)
            if (participant?.lid) targetLID = participant.lid
        }

        const numberClean = targetId.split('@')[0]
        if (!targetLID) targetLID = `${numberClean}@lid`

        const fkontak = {
            key: {
                participants: '0@s.whatsapp.net',
                remoteJid: 'status@broadcast',
                fromMe: false,
                id: 'Halo'
            },
            message: {
                contactMessage: {
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${msg.sender.split('@')[0]}:${msg.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                }
            },
            participant: '0@s.whatsapp.net'
        }

        const md = 'https://github.com/dev-fedexyzz'
        const icons = 'https://files.catbox.moe/p0fk5h.jpg'

        let pp: string
        try {
            pp = await sock.profilePictureUrl(targetId, 'image')
        } catch {
            pp = icons
        }

        const caption = `
🎵 *U-um... encontré la información...* 🍓
─────────────────────
🌸 *Número de WhatsApp:*
\`+${numberClean}\`

🌸 *JID (ID de WhatsApp):*
\`${targetId}\`

🌸 *LID (ID Vinculado):*
\`${targetLID}\`
─────────────────────
*...E-espero que te sirva~* 💕
`.trim()

        await sock.sendMessage(from, {
            text: caption,
            contextInfo: {
                mentionedJid: [targetId],
                externalAdReply: {
                    title,
                    body: `~ Miku Nakano 🎵`,
                    thumbnailUrl: pp,
                    sourceUrl: md,
                    mediaType: 1,
                    showAdAttribution: false,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: fkontak })
    }
};

export default command;