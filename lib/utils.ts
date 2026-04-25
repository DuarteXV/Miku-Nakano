import axios from 'axios';

export const formatSize = (bytes: number) => {
    if (bytes >= 1000000000) return (bytes / 1000000000).toFixed(2) + ' GB';
    if (bytes >= 1000000) return (bytes / 1000000).toFixed(2) + ' MB';
    if (bytes >= 1000) return (bytes / 1000).toFixed(2) + ' KB';
    return bytes + ' B';
};

export const runtime = (seconds: number) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
};

export const getBuffer = async (url: string) => {
    const res = await axios({ method: 'get', url, responseType: 'arraybuffer' });
    return res.data;
};

export const getMessageData = (msg: any) => {
    const type = Object.keys(msg.message || {})[0];
    const messageContent = msg.message;
    const quoted = messageContent?.extendedTextMessage?.contextInfo?.quotedMessage;

    const body = (type === 'conversation') ? messageContent.conversation :
                 (type === 'extendedTextMessage') ? messageContent.extendedTextMessage.text :
                 (type === 'imageMessage' || type === 'videoMessage' || type === 'documentMessage') ? messageContent[type].caption :
                 (type === 'buttonsResponseMessage') ? messageContent.buttonsResponseMessage.selectedButtonId :
                 (type === 'listResponseMessage') ? messageContent.listResponseMessage.singleSelectReply.selectedRowId :
                 (type === 'templateButtonReplyMessage') ? messageContent.templateButtonReplyMessage.selectedId :
                 (type === 'interactiveResponseMessage') ? (
                     JSON.parse(messageContent.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson || '{}').id || 
                     messageContent.interactiveResponseMessage.body?.text
                 ) : 
                 (type === 'buttonsMessage') ? messageContent.buttonsMessage.buttons[0].buttonId :
                 (type === 'templateMessage') ? messageContent.templateMessage.hydratedTemplate.hydratedButtons[0].quickReplyButton.id :
                 (messageContent[type]?.text || messageContent[type]?.caption || messageContent[type]?.selectedId || messageContent[type]?.id || '');

    const isImage = !!(messageContent?.imageMessage || quoted?.imageMessage);
    const isVideo = !!(messageContent?.videoMessage || quoted?.videoMessage);
    const isSticker = !!(messageContent?.stickerMessage || quoted?.stickerMessage);
    const isDocument = !!(messageContent?.documentMessage || quoted?.documentMessage);
    const isAnimated = !!(quoted?.stickerMessage?.isAnimated || messageContent?.stickerMessage?.isAnimated);
    const isLocation = !!(messageContent?.locationMessage || quoted?.locationMessage);
    const isContact = !!(messageContent?.contactMessage || messageContent?.contactsArrayMessage || quoted?.contactMessage || quoted?.contactsArrayMessage);
    const isAudio = !!(messageContent?.audioMessage || quoted?.audioMessage);

    const previewLink = (type === 'extendedTextMessage' && messageContent.extendedTextMessage.matchedText) 
                        ? messageContent.extendedTextMessage.matchedText 
                        : null;

    return {
        type,
        body,
        quoted,
        isImage,
        isVideo,
        isSticker,
        isDocument,
        isAnimated,
        isLocation,
        isContact,
        isAudio,
        previewLink
    };
};
