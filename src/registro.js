function mensajeSeguro(error) {
  return String((error && error.message) || error || '')
    .replace(/mongodb(\+srv)?:\/\/\S+/gi, 'mongodb://***')
    .replace(/([?&]key=)[^&\s]+/gi, '$1***');
}

function exigirEntorno(env = process.env) {
  const faltan = ['PIXABAY_API_KEY', 'MONGODB_URI', 'SESSION_SECRET'].filter((clave) => !String(env[clave] || '').trim());
  if (faltan.length) {
    const error = new Error(`Faltan variables obligatorias: ${faltan.join(', ')}`);
    error.faltan = faltan;
    throw error;
  }
}

module.exports = { mensajeSeguro, exigirEntorno };
