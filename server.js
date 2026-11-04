require('dotenv').config();

const { exigirEntorno, mensajeSeguro } = require('./src/registro');
const { conectar, estado } = require('./src/db');
const { createApp } = require('./src/app');

async function main() {
  exigirEntorno();
  await conectar();
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    const info = estado();
    console.log(`Taller Pixabay escuchando en 0.0.0.0:${port}`);
    console.log(`Mongo: ${info.mongo ? 'conectado' : 'sin conexión'} · Espejo: ${info.espejo ? 'conectado' : 'no configurado'}`);
  });
}

main().catch((error) => {
  console.error(mensajeSeguro(error));
  process.exit(1);
});
