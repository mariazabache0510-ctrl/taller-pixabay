const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');

async function conServidor(prueba) {
  const servidor = await new Promise((resolver) => {
    const creado = createApp().listen(0, '127.0.0.1', () => resolver(creado));
  });
  const { port } = servidor.address();
  try {
    await prueba(port);
  } finally {
    await new Promise((resolver, rechazar) => {
      servidor.close((error) => (error ? rechazar(error) : resolver()));
    });
  }
}

test('la salud responde y BLACK no sale de la aplicación', async () => {
  await conServidor(async (port) => {
    const salud = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(salud.status, 200);
    const respuesta = await fetch(`http://127.0.0.1:${port}/api/buscar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consulta: 'BLACK' }),
    });
    const datos = await respuesta.json();
    assert.equal(respuesta.status, 200);
    assert.equal(datos.bloqueada, true);
    assert.equal(datos.motivo, 'racial');
    assert.deepEqual(datos.imagenes, []);
  });
});

test('una búsqueda permitida explica si falta la clave', async () => {
  const anterior = process.env.PIXABAY_API_KEY;
  delete process.env.PIXABAY_API_KEY;
  try {
    await conServidor(async (port) => {
      const respuesta = await fetch(`http://127.0.0.1:${port}/api/buscar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consulta: 'nature' }),
      });
      const datos = await respuesta.json();
      assert.equal(respuesta.status, 503);
      assert.equal(datos.codigo, 'sin-clave');
    });
  } finally {
    if (anterior === undefined) delete process.env.PIXABAY_API_KEY;
    else process.env.PIXABAY_API_KEY = anterior;
  }
});

test('rechaza fichas que no vienen de Pixabay', async () => {
  await conServidor(async (port) => {
    const respuesta = await fetch(`http://127.0.0.1:${port}/api/coleccion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pixabayId: 10,
        paginaUrl: 'https://ejemplo.com/foto',
        vistaUrl: 'https://ejemplo.com/foto.jpg',
      }),
    });
    assert.equal(respuesta.status, 400);
  });
});
