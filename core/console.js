const pad = (label) => label.padEnd(8, ' ');

const now = () => {
  const d = new Date();
  const date = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date}  ·  ${time}`;
};

const line = (label, value) =>
  console.log(`     ⩩  ${pad(label)}  ·  ${value}`);

export const log = {
  banner: () => {
    console.clear();
    console.log();
    console.log('  ╭─────────────────────────────────╮');
    console.log('  │  ᯓ★  WaBot  ·  v1.0             │');
    console.log('  │  ╰─  Un simple bot de WhatsApp    │');
    console.log('  ╰─────────────────────────────────╯');
    console.log();
  },

  mensaje: ({ usuario, numero, tipo, tamaño, mensaje }) => {
    console.log();
    console.log('  ⟩  Mensaje recibido');
    line('Usuario',  usuario);
    line('Número',   numero);
    line('Tipo',     tipo);
    line('Tamaño',   tamaño ?? '-');
    line('Fecha',    now());
    line('Mensaje',  mensaje || '-');
    console.log();
  },

  comando: ({ usuario, numero, tipo, tamaño, comando }) => {
    console.log();
    console.log(' » Comando detectado');
    line('Usuario',  usuario);
    line('Número',   numero);
    line('Tipo',     tipo);
    line('Tamaño',   tamaño ?? '-');
    line('Fecha',    now());
    line('Comando',  comando);
    console.log();
  },

  success: (msg) => console.log(`  ✦  ${msg}`),
  info:    (msg) => console.log(`  ◈  ${msg}`),
  warn:    (msg) => console.log(`  ◇  ${msg}`),
  error:   (msg) => console.log(`  ✗  ${msg}`),
};