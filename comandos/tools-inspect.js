import { getUrlFromDirectPath } from "@whiskeysockets/baileys"
import _ from "lodash"

export default {
  name: 'inspect',
  description: 'Inspecciona un grupo o canal y obtiene sus detalles mediante un enlace de invitación.',
  category: 'owner',
  owner: true,

  async execute({ sock, msg, jid, args }) {
    const inputText = args.join(' ')
    if (!inputText) {
      await sock.sendMessage(jid, {
        text: `🌸 Uso: *${prefix}inspect <enlace del grupo o canal>* ♡`
      }, { quoted: msg })
      return
    }

    const code = inputText.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:channel\/|invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1]

    if (!code) {
      await sock.sendMessage(jid, {
        text: '🌷 Ese enlace no es válido... ¿seguro que está bien? (◕‿◕✿)'
      }, { quoted: msg })
      return
    }

    let isGroup = false
    let info = null

    try {
      info = await sock.groupGetInviteInfo(code)
      isGroup = true
    } catch {}

    if (!isGroup) {
      try {
        info = await sock.newsletterMetadata("invite", code)
      } catch (err) {
        console.error(err)
        await sock.sendMessage(jid, {
          text: '🌷 No pude inspeccionar... el enlace puede ser inválido, haber expirado o tener restricciones~ (´；ω；`)'
        }, { quoted: msg })
        return
      }
    }

    if (isGroup) {
      const creationDate = new Date(info.creation * 1000).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      const owner = info.owner ? info.owner.split('@')[0] : 'Desconocido'
      const size  = info.size  ? `${info.size} miembros`  : 'No detectado'
      const desc  = info.desc
        ? info.desc.substring(0, 300).replace(/\n/g, ' ') + (info.desc.length > 300 ? '...' : '')
        : 'Sin descripción'

      const responseText = [
        `✿ *Grupo inspeccionado~ ♡*`,
        '',
        `❥ *Tipo* : Grupo`,
        `❥ *Nombre* : ${info.subject}`,
        `❥ *ID* : ${info.id}`,
        `❥ *Creado* : ${creationDate}`,
        `❥ *Creador* : @${owner}`,
        `❥ *Miembros* : ${size}`,
        `❥ *Descripción* : ${desc}`,
      ].join('\n')

      const mentions = info.owner ? [info.owner] : []
      await sock.sendMessage(jid, { text: responseText, mentions }, { quoted: msg })

    } else {
      const caption = "✿ *Canal inspeccionado~ ♡*\n\n" + processObject(info, "", info?.preview)
      const pp = info?.preview ? getUrlFromDirectPath(info.preview) : null

      await sock.sendMessage(jid, {
        text: caption,
        contextInfo: {
          externalAdReply: {
            title: `♡ ${botName}`,
            body: '🎀 Inspector de Canales',
            thumbnailUrl: pp,
            sourceUrl: args[0],
            mediaType: 1,
            showAdAttribution: false,
            renderLargerThumbnail: false,
          }
        }
      }, { quoted: msg })

      if (info.id) {
        await sock.sendMessage(jid, { text: info.id })
      }
    }
  },
}

function formatDate(n, locale = "es", includeTime = true) {
  if (n > 1e12)      n = Math.floor(n / 1000)
  else if (n < 1e10) n = Math.floor(n * 1000)
  const date = new Date(n)
  if (isNaN(date)) return "Fecha no válida"
  const optionsDate  = { day: '2-digit', month: '2-digit', year: 'numeric' }
  const formattedDate = date.toLocaleDateString(locale, optionsDate)
  if (!includeTime) return formattedDate
  const hours   = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const period  = hours < 12 ? 'AM' : 'PM'
  return `${formattedDate}, ${hours}:${minutes}:${seconds} ${period}`
}

function newsletterKey(key) {
  return _.startCase(key.replace(/_/g, " "))
    .replace("Id",                    "🆔 Identificador")
    .replace("State",                 "📌 Estado")
    .replace("Creation Time",         "📅 Fecha de creación")
    .replace("Name Time",             "✏️ Fecha de modificación del nombre")
    .replace("Name",                  "🏷️ Nombre")
    .replace("Description Time",      "📝 Fecha de modificación de la descripción")
    .replace("Description",           "📜 Descripción")
    .replace("Invite",                "📩 Invitación")
    .replace("Handle",                "👤 Alias")
    .replace("Picture",               "🖼️ Imagen")
    .replace("Preview",               "👀 Vista previa")
    .replace("Reaction Codes",        "😃 Reacciones")
    .replace("Subscribers",           "👥 Suscriptores")
    .replace("Verification",          "✅ Verificación")
    .replace("Viewer Metadata",       "🔍 Datos avanzados")
}

function formatValue(key, value, preview) {
  switch (key) {
    case "subscribers":
      return value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "No hay suscriptores"
    case "creation_time":
    case "nameTime":
    case "descriptionTime":
      return formatDate(value)
    case "description":
    case "name":
      return value || "No hay información disponible"
    case "state":
      return ({ ACTIVE: "Activo", GEOSUSPENDED: "Suspendido por región", SUSPENDED: "Suspendido" })[value] ?? "Desconocido"
    case "reaction_codes":
      return ({ ALL: "Todas las reacciones permitidas", BASIC: "Reacciones básicas permitidas", NONE: "No se permiten reacciones" })[value] ?? "Desconocido"
    case "verification":
      return ({ VERIFIED: "Verificado", UNVERIFIED: "No verificado" })[value] ?? "Desconocido"
    case "mute":
      return ({ ON: "Silenciado", OFF: "No silenciado", UNDEFINED: "Sin definir" })[value] ?? "Desconocido"
    case "view_role":
      return ({ ADMIN: "Administrador", OWNER: "Propietario", SUBSCRIBER: "Suscriptor", GUEST: "Invitado" })[value] ?? "Desconocido"
    case "picture":
      return preview ? getUrlFromDirectPath(preview) : "No hay imagen disponible"
    default:
      return value !== null && value !== undefined ? value.toString() : "No hay información disponible"
  }
}

function processObject(obj, prefix = "", preview) {
  let caption = ""
  Object.keys(obj).forEach(key => {
    const value = obj[key]
    if (typeof value === "object" && value !== null) {
      if (Object.keys(value).length > 0) {
        caption += `\n*\`${newsletterKey(prefix + key)}\`*\n`
        caption += processObject(value, `${prefix}${key}_`)
      }
    } else {
      const shortKey      = prefix ? prefix.split("_").pop() + "_" + key : key
      const displayValue  = formatValue(shortKey, value, preview)
      const translatedKey = newsletterKey(shortKey)
      caption += `❥ *${translatedKey}:*\n${displayValue}\n`
    }
  })
  return caption
}