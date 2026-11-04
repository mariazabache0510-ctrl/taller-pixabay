const crypto = require('crypto');

function asegurarVisitante(req) {
  if (!req.session.visitanteId || !/^[a-f0-9]{32}$/.test(req.session.visitanteId)) {
    req.session.visitanteId = crypto.randomBytes(16).toString('hex');
  }
  if (!/^[a-f0-9]{64}$/.test(req.session.csrf || '')) {
    req.session.csrf = crypto.randomBytes(32).toString('hex');
  }
  return req.session.visitanteId;
}

module.exports = { asegurarVisitante };
