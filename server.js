require('dotenv').config();

const { conectar, estado } = require('./src/db');
const { createApp } = require('./src/app');

async function main() {
  await conectar();
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    const info = estado();
    console.log(`Taller Pixabay escuchando en 0.0.0.0:${port}`);
    console.log(`Mongo: ${info.mongo ? 'conectado' : 'sin conexión'} · Espejo: ${info.espejo ? 'conectado' : 'no configurado'} · Pixabay: ${info.pixabay ? 'con clave' : 'sin clave'}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
