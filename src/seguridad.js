const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { tieneClavePeligrosa } = require('./sanear');

function origenPermitido(req) {
  const origen = req.get('origin');
  if (!origen) return true;
  let url;
  try {
    url = new URL(origen);
  } catch {
    return false;
  }
  if (process.env.APP_ORIGIN && origen === process.env.APP_ORIGIN) return true;
  return url.host === req.get('host');
}

function corsPropio(req, res, next) {
  const origen = req.get('origin');
  if (origen && !origenPermitido(req)) {
    res.status(403).json({ mensaje: 'Origen no permitido.' });
    return;
  }
  if (origen && origenPermitido(req)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}

function rechazarConsultaPeligrosa(req, res, next) {
  if (tieneClavePeligrosa(req.body) || tieneClavePeligrosa(req.query) || tieneClavePeligrosa(req.params)) {
    res.status(400).json({ mensaje: 'La solicitud no es válida.' });
    return;
  }
  next();
}

function sesion() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) {
    throw new Error('Falta SESSION_SECRET');
  }
  const opciones = {
    name: 'sid',
    secret: secreto,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
  };
  if (process.env.MONGODB_URI && process.env.NODE_ENV !== 'test') {
    opciones.store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sesiones',
      ttl: 14 * 24 * 60 * 60,
    });
  }
  return session(opciones);
}

function casco() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        styleSrcAttr: ["'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'https://pixabay.com', 'https://*.pixabay.com', 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
}

function limite(maximo) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: maximo,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensaje: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' },
  });
}

function tokensIguales(recibido, guardado) {
  const a = Buffer.from(String(recibido || ''));
  const b = Buffer.from(String(guardado || ''));
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function exigirCsrf(req, res, next) {
  const guardado = req.session && req.session.csrf;
  if (!tokensIguales(req.get('x-csrf-token'), guardado)) {
    res.status(403).json({ mensaje: 'No se pudo confirmar la solicitud.' });
    return;
  }
  next();
}

function rutaProhibida(req, res, next) {
  let ruta = '';
  try {
    ruta = decodeURIComponent(req.path).toLowerCase();
  } catch {
    res.status(404).type('text/plain').send('No encontrado');
    return;
  }
  const bloqueada = ruta.includes('..')
    || ruta.includes('\\')
    || ruta.endsWith('.map')
    || /\/(\.env|\.git|package\.json|package-lock\.json|server\.js|render\.yaml)(\/|$)/.test(ruta)
    || ruta.startsWith('/src/')
    || ruta.startsWith('/views/')
    || ruta.startsWith('/scripts/');
  if (bloqueada) {
    res.status(404).type('text/plain').send('No encontrado');
    return;
  }
  next();
}

module.exports = {
  corsPropio,
  rechazarConsultaPeligrosa,
  sesion,
  casco,
  limite,
  exigirCsrf,
  rutaProhibida,
};
