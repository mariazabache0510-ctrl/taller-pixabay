const { etiquetaDescartada } = require('./filtro');
const { urlDePixabay } = require('./fichas');

function urlSegura(valor, clave) {
  const texto = String(valor || '');
  if (clave && texto.includes(clave)) return '';
  return urlDePixabay(texto);
}

function ficha(hit, clave) {
  const vistaUrl = urlSegura(hit.webformatURL, clave) || urlSegura(hit.previewURL, clave);
  const paginaUrl = urlSegura(hit.pageURL, clave);
  if (!vistaUrl || !paginaUrl) return null;
  return {
    pixabayId: hit.id,
    paginaUrl,
    previaUrl: urlSegura(hit.previewURL, clave) || vistaUrl,
    vistaUrl,
    etiquetas: hit.tags || '',
    autor: hit.user || '',
    meGusta: hit.likes || 0,
    vistas: hit.views || 0,
  };
}

async function buscarImagenes(consulta, opciones = {}) {
  const clave = process.env.PIXABAY_API_KEY;
  if (!clave) {
    const error = new Error('sin-clave');
    error.codigo = 'sin-clave';
    throw error;
  }

  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', clave);
  url.searchParams.set('q', consulta);
  url.searchParams.set('image_type', 'photo');
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('lang', 'es');
  url.searchParams.set('per_page', opciones.filtrarPersonas ? '60' : '12');

  let respuesta;
  try {
    respuesta = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (error) {
    const fallo = new Error('pixabay');
    fallo.codigo = 'pixabay';
    fallo.cause = error;
    throw fallo;
  }

  if (!respuesta.ok) {
    const fallo = new Error('pixabay');
    fallo.codigo = 'pixabay';
    fallo.estado = respuesta.status;
    throw fallo;
  }

  const datos = await respuesta.json();
  return (datos.hits || [])
    .filter((hit) => !etiquetaDescartada(hit.tags || '', Boolean(opciones.filtrarPersonas)))
    .slice(0, 12)
    .map((hit) => ficha(hit, clave))
    .filter(Boolean);
}

module.exports = { buscarImagenes };
