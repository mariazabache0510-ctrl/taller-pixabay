const test = require('node:test');
const assert = require('node:assert/strict');
const { exigirEntorno, mensajeSeguro } = require('./registro');

test('exige las tres variables y no imprime sus valores', () => {
  assert.throws(() => exigirEntorno({}), /PIXABAY_API_KEY, MONGODB_URI, SESSION_SECRET/);
  assert.doesNotThrow(() => exigirEntorno({
    PIXABAY_API_KEY: 'abc',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/taller',
    SESSION_SECRET: 'secreto',
  }));
});

test('los logs no conservan una URI con credenciales', () => {
  const texto = mensajeSeguro(new Error('falló mongodb+srv://usuario:clave@cluster.example.net/db'));
  assert.equal(texto.includes('clave'), false);
  assert.match(texto, /mongodb:\/\/\*\*\*/);
});
