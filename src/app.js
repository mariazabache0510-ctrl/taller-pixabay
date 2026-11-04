const path = require('path');
const express = require('express');
const db = require('./db');
const { evaluar } = require('./filtro');
const { buscarImagenes } = require('./pixabay');
const { asegurarVisitante } = require('./visitante');
const { fichaEntrante } = require('./fichas');
const { esObjetoPlano, enteros } = require('./sanear');
const { mensajeSeguro } = require('./registro');
const {
  casco,
  corsPropio,
  rechazarConsultaPeligrosa,
  sesion,
  limite,
  exigirCsrf,
  rutaProhibida,
} = require('./seguridad');

const PUBLICO = path.join(__dirname, '..', 'public');
const MENSAJE_IMAGENES = 'No se pudieron obtener imágenes en este momento.';

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.set('query parser', 'simple');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));

  app.use(casco());
  app.use(corsPropio);
  app.use(rutaProhibida);
  app.use(express.json({ limit: '16kb' }));
  app.use(sesion());
  app.use(rechazarConsultaPeligrosa);
  app.use(express.static(PUBLICO, {
    dotfiles: 'deny',
    index: false,
    redirect: false,
  }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/', (req, res) => {
    asegurarVisitante(req);
    res.render('index', {
      configuracion: db.estado(),
      csrf: req.session.csrf,
    });
  });

  const buscar = limite(30);
  app.get('/api/buscar', buscar, (req, res) => responderBusqueda(req, res, false));
  app.post('/api/buscar', buscar, exigirCsrf, (req, res) => responderBusqueda(req, res, true));
  app.post('/api/historial', limite(30), exigirCsrf, archivar);

  app.get('/api/coleccion', limite(60), async (req, res) => {
    const visitanteId = asegurarVisitante(req);
    try {
      res.json(await db.listar(visitanteId));
    } catch (error) {
      console.error(mensajeSeguro(error));
      res.status(500).json({ mensaje: 'No se pudo leer la colección.' });
    }
  });

  app.post('/api/coleccion', limite(60), exigirCsrf, async (req, res) => {
    const visitanteId = asegurarVisitante(req);
    const ficha = fichaEntrante(req.body);
    if (!ficha) {
      res.status(400).json({ mensaje: 'La ficha no es una imagen válida de Pixabay.' });
      return;
    }
    try {
      await db.guardarImagen({ ...ficha, visitanteId, guardadaEn: new Date() });
      res.status(201).json({ ok: true });
    } catch (error) {
      console.error(mensajeSeguro(error));
      const codigo = error.codigo === 'sin-mongo' ? 503 : 500;
      res.status(codigo).json({ mensaje: 'No se pudo guardar la imagen.' });
    }
  });

  app.delete('/api/coleccion/:pixabayId', limite(60), exigirCsrf, async (req, res) => {
    const visitanteId = asegurarVisitante(req);
    const pixabayId = Number(req.params.pixabayId);
    if (!Number.isInteger(pixabayId) || pixabayId <= 0) {
      res.status(400).json({ mensaje: 'La solicitud no es válida.' });
      return;
    }
    try {
      await db.quitarImagen(visitanteId, pixabayId);
      res.json({ ok: true });
    } catch (error) {
      console.error(mensajeSeguro(error));
      const codigo = error.codigo === 'sin-mongo' ? 503 : 500;
      res.status(codigo).json({ mensaje: 'No se pudo quitar la imagen.' });
    }
  });

  app.use((error, _req, res, _next) => {
    console.error(mensajeSeguro(error));
    if (res.headersSent) return;
    res.status(500).json({ mensaje: 'No se pudo completar la solicitud.' });
  });

  return app;
}

function leerConsulta(valor) {
  if (typeof valor !== 'string') return { error: 'La solicitud no es válida.' };
  const consulta = valor.replace(/\s+/g, ' ').trim();
  if (consulta.length < 2 || consulta.length > 100) {
    return { error: 'Escribe entre 2 y 100 caracteres.' };
  }
  return { consulta };
}

async function responderBusqueda(req, res, persistir) {
  const crudo = req.method === 'GET' ? req.query.q : (esObjetoPlano(req.body) ? req.body.consulta : undefined);
  const lectura = leerConsulta(crudo);
  if (lectura.error) {
    res.status(400).json({ mensaje: lectura.error });
    return;
  }
  const visitanteId = asegurarVisitante(req);
  const juicio = evaluar(lectura.consulta);
  if (juicio.bloqueada) {
    const persistencia = persistir
      ? await recordar(visitanteId, lectura.consulta, juicio, 0, [])
      : false;
    res.json({
      bloqueada: true,
      motivo: juicio.motivo,
      mensaje: juicio.mensaje,
      consulta: lectura.consulta,
      imagenes: [],
      persistencia,
    });
    return;
  }

  let imagenes;
  try {
    imagenes = await buscarImagenes(lectura.consulta);
  } catch (error) {
    console.error(mensajeSeguro(error));
    res.status(503).json({ mensaje: MENSAJE_IMAGENES });
    return;
  }

  const ids = imagenes.map((imagen) => imagen.pixabayId);
  const persistencia = persistir
    ? await recordar(visitanteId, lectura.consulta, juicio, imagenes.length, ids)
    : false;
  res.json({
    bloqueada: false,
    consulta: lectura.consulta,
    imagenes,
    persistencia,
    mensaje: imagenes.length
      ? ''
      : 'No quedaron fotos que pasen el filtro de contenido para esa búsqueda.',
  });
}

async function archivar(req, res) {
  if (!esObjetoPlano(req.body)) {
    res.status(400).json({ mensaje: 'La solicitud no es válida.' });
    return;
  }
  const lectura = leerConsulta(req.body.consulta);
  if (lectura.error) {
    res.status(400).json({ mensaje: lectura.error });
    return;
  }
  const juicio = evaluar(lectura.consulta);
  const ids = juicio.bloqueada ? [] : enteros(req.body.idsPixabay || [], 20);
  if (ids === null) {
    res.status(400).json({ mensaje: 'La solicitud no es válida.' });
    return;
  }
  const persistencia = await recordar(
    asegurarVisitante(req),
    lectura.consulta,
    juicio,
    ids.length,
    ids,
  );
  res.json({ persistencia });
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
    if (error.codigo !== 'sin-mongo') console.error(mensajeSeguro(error));
    return false;
  }
}

module.exports = { createApp };
