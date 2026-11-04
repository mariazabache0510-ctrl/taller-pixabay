const path = require('path');
const express = require('express');
const db = require('./db');
const { evaluar } = require('./filtro');
const { buscarImagenes } = require('./pixabay');
const { asegurarVisitante } = require('./visitante');
const { fichaEntrante } = require('./fichas');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(express.json({ limit: '32kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/', (req, res) => {
    asegurarVisitante(req, res);
    res.render('index', { configuracion: db.estado() });
  });

  app.post('/api/buscar', async (req, res) => {
    const visitanteId = asegurarVisitante(req, res);
    const consulta = String((req.body && req.body.consulta) || '').replace(/\s+/g, ' ').trim();
    if (consulta.length < 2 || consulta.length > 80) {
      res.status(400).json({
        mensaje: 'Escribe entre 2 y 80 caracteres.',
      });
      return;
    }

    const juicio = evaluar(consulta);
    if (juicio.bloqueada) {
      const guardada = await recordar(visitanteId, consulta, juicio, 0, []);
      res.json({
        bloqueada: true,
        motivo: juicio.motivo,
        mensaje: juicio.mensaje,
        consulta,
        imagenes: [],
        persistencia: guardada,
      });
      return;
    }

    let imagenes;
    try {
      imagenes = await buscarImagenes(consulta);
    } catch (error) {
      const codigo = error.codigo === 'sin-clave' ? 'sin-clave' : 'pixabay';
      res.status(503).json({
        codigo,
        mensaje: codigo === 'sin-clave'
          ? 'Falta PIXABAY_API_KEY en el servidor. Sin esa clave no se pueden pedir fotos.'
          : 'Pixabay no respondió. Inténtalo de nuevo en un momento.',
      });
      return;
    }

    const guardada = await recordar(
      visitanteId,
      consulta,
      juicio,
      imagenes.length,
      imagenes.map((imagen) => imagen.pixabayId),
    );

    res.json({
      bloqueada: false,
      consulta,
      imagenes,
      persistencia: guardada,
      mensaje: imagenes.length
        ? ''
        : 'Pixabay no devolvió fotos que pasen el filtro de menores para esa búsqueda.',
    });
  });

  app.get('/api/coleccion', async (req, res) => {
    const visitanteId = asegurarVisitante(req, res);
    try {
      const datos = await db.listar(visitanteId);
      res.json(datos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'No se pudo leer la colección.' });
    }
  });

  app.post('/api/coleccion', async (req, res) => {
    const visitanteId = asegurarVisitante(req, res);
    const ficha = fichaEntrante(req.body);
    if (!ficha) {
      res.status(400).json({ mensaje: 'La ficha no es una imagen válida de Pixabay.' });
      return;
    }
    try {
      await db.guardarImagen({ ...ficha, visitanteId, guardadaEn: new Date() });
      res.status(201).json({ ok: true });
    } catch (error) {
      if (error.codigo === 'sin-mongo') {
        res.status(503).json({ mensaje: 'Define MONGODB_URI para guardar imágenes.' });
        return;
      }
      console.error(error);
      res.status(500).json({ mensaje: 'No se pudo guardar la imagen.' });
    }
  });

  app.delete('/api/coleccion/:pixabayId', async (req, res) => {
    const visitanteId = asegurarVisitante(req, res);
    const pixabayId = Number(req.params.pixabayId);
    if (!Number.isInteger(pixabayId) || pixabayId <= 0) {
      res.status(400).json({ mensaje: 'Identificador inválido.' });
      return;
    }
    try {
      await db.quitarImagen(visitanteId, pixabayId);
      res.json({ ok: true });
    } catch (error) {
      if (error.codigo === 'sin-mongo') {
        res.status(503).json({ mensaje: 'Define MONGODB_URI para editar la colección.' });
        return;
      }
      console.error(error);
      res.status(500).json({ mensaje: 'No se pudo quitar la imagen.' });
    }
  });

  return app;
}

async function recordar(visitanteId, consulta, juicio, cantidad, idsPixabay) {
  try {
    await db.registrarBusqueda({
      visitanteId,
      consulta,
      consultaNormalizada: juicio.normalizada,
      bloqueada: juicio.bloqueada,
      motivo: juicio.motivo,
      cantidad,
      idsPixabay,
    });
    return true;
  } catch (error) {
    if (error.codigo !== 'sin-mongo') console.error(error);
    return false;
  }
}

module.exports = { createApp };
