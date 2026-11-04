const crypto = require('crypto');

function leerCookie(req, nombre) {
  const crudo = req.headers.cookie || '';
  const pareja = crudo.split(';').map((parte) => parte.trim()).find((parte) => parte.startsWith(`${nombre}=`));
  if (!pareja) return '';
  try {
    return decodeURIComponent(pareja.slice(nombre.length + 1));
  } catch {
    return '';
  }
}

function asegurarVisitante(req, res) {
  let id = leerCookie(req, 'vid');
  if (!/^[a-f0-9]{32}$/.test(id)) {
    id = crypto.randomBytes(16).toString('hex');
    const seguro = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `vid=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${seguro}`);
  }
  return id;
}

module.exports = { asegurarVisitante };
