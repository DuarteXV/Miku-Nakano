import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

global.owner = ['573135180876']

global.dev = "Melody"
global.botName = 'Midnight System'
global.key = 'Midnight'
global.prefix = ['#', '.']
global.icono = 'https://cdn.nexylight.xyz/files/saf4w3xw.jpeg'
global.banner = 'https://cdn.nexylight.xyz/files/7ya7h9.jpeg'
global.currency = 'Stars'

global.msg = {
    socket: '《✧》 Este comando solo puede ser ejecutado por un Socket.',
    admin: '《✧》 Este comando solo puede ser ejecutado por los Administradores del Grupo.',
    botAdmin: '《✧》 Este comando solo puede ser ejecutado si el Socket es Administrador del Grupo.',
    owner: '《✧》 Este comando solo puede ser ejecutado por mi creador.',
    group: '《✧》 Este comando solo puede ser ejecutado en Grupos.',
    private: '《✧》 Este comando solo puede ser ejecutado en el Chat Privado.',
    wait: '《✧》 Espere un momento por favor...',
    error: '《✧》 Ha ocurrido un error inesperado.'
}

const file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.bold.white(`Update config.ts`))
  import(`${file}?update=${Date.now()}`)
})