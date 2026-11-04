process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'solo-para-la-suite-de-pruebas-32bytes!!';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
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

async function sesion(port) {
  const inicio = await fetch(`http://127.0.0.1:${port}/`);
  const html = await inicio.text();
  const token = html.match(/name="csrf-token" content="([a-f0-9]{64})"/);
  const cookie = (inicio.headers.getSetCookie?.() || []).map((parte) => parte.split(';')[0]).join('; ');
  return { html, token: token && token[1], cookie };
}

test('la salud responde', async () => {
  await conServidor(async (port) => {
    const salud = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(salud.status, 200);
    assert.equal(salud.headers.get('x-powered-by'), null);
  });
});

test('poor, variantes y una búsqueda sin clave no revelan secretos', async () => {
  const anterior = process.env.PIXABAY_API_KEY;
  delete process.env.PIXABAY_API_KEY;
  try {
    await conServidor(async (port) => {
      const poor = await fetch(`http://127.0.0.1:${port}/api/buscar?q=${encodeURIComponent('poor people')}`);
      const variante = await fetch(`http://127.0.0.1:${port}/api/buscar?q=bl4ck`);
      const cuerpoPoor = await poor.json();
      const cuerpoVariante = await variante.json();
      assert.equal(poor.status, 503);
      assert.equal(variante.status, 503);
      assert.equal(cuerpoPoor.bloqueada, undefined);
      assert.equal(JSON.stringify(cuerpoVariante).includes('bl4ck'), false);
      const nature = await fetch(`http://127.0.0.1:${port}/api/buscar?q=nature`);
      const datos = await nature.json();
      assert.equal(nature.status, 503);
      assert.equal(JSON.stringify(datos).includes('PIXABAY'), false);
      const larga = await fetch(`http://127.0.0.1:${port}/api/buscar?q=${'a'.repeat(101)}`);
      assert.equal(larga.status, 400);
    });
  } finally {
    if (anterior === undefined) delete process.env.PIXABAY_API_KEY;
    else process.env.PIXABAY_API_KEY = anterior;
  }
});

test('rechaza fichas ajenas y escrituras sin CSRF', async () => {
  await conServidor(async (port) => {
    const { token, cookie } = await sesion(port);
    assert.ok(token);
    const sinToken = await fetch(`http://127.0.0.1:${port}/api/coleccion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({
        pixabayId: 10,
        paginaUrl: 'https://ejemplo.com/foto',
        vistaUrl: 'https://ejemplo.com/foto.jpg',
      }),
    });
    assert.equal(sinToken.status, 403);
    const respuesta = await fetch(`http://127.0.0.1:${port}/api/coleccion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie, 'X-CSRF-Token': token },
      body: JSON.stringify({
        pixabayId: 10,
        paginaUrl: 'https://ejemplo.com/foto',
        vistaUrl: 'https://ejemplo.com/foto.jpg',
      }),
    });
    assert.equal(respuesta.status, 400);
    const objeto = await fetch(`http://127.0.0.1:${port}/api/historial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie, 'X-CSRF-Token': token },
      body: JSON.stringify({ consulta: { $gt: '' } }),
    });
    assert.equal(objeto.status, 400);
  });
});

test('los archivos sensibles del proyecto responden 404', async () => {
  await conServidor(async (port) => {
    for (const ruta of ['/.env', '/server.js', '/package.json', '/src/filtro.js', '/.git/config']) {
      const respuesta = await fetch(`http://127.0.0.1:${port}${ruta}`);
      assert.equal(respuesta.status, 404, ruta);
      const texto = await respuesta.text();
      assert.equal(texto.includes('SESSION_SECRET'), false);
    }
  });
});

test('la página y el cliente no incluyen la lista ni credenciales', async () => {
  const cliente = fs.readFileSync(path.join(__dirname, 'cliente', 'app.js'), 'utf8');
  const vista = fs.readFileSync(path.join(__dirname, '..', 'views', 'index.ejs'), 'utf8');
  for (const prohibido of ['nigger', 'PIXABAY_API_KEY', 'mongodb+srv', 'SESSION_SECRET', 'MONGODB_URI']) {
    assert.equal(cliente.includes(prohibido), false, prohibido);
    assert.equal(vista.includes(prohibido), false, prohibido);
  }
  await conServidor(async (port) => {
    const { html } = await sesion(port);
    assert.equal(html.includes('nigger'), false);
    assert.equal(html.includes('PIXABAY_API_KEY'), false);
    assert.match(html, /csrf-token/);
  });
});
