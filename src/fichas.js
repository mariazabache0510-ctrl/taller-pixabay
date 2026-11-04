function urlDePixabay(valor) {
  let url;
  try {
    url = new URL(String(valor || ''));
  } catch {
    return '';
  }
  if (url.protocol !== 'https:') return '';
  const host = url.hostname.toLowerCase();
  if (host !== 'pixabay.com' && !host.endsWith('.pixabay.com')) return '';
  return url.toString();
}

function entero(valor, maximo) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 0 || numero > maximo) return null;
  return numero;
}

function texto(valor, maximo) {
  return String(valor || '').replace(/\s+/g, ' ').trim().slice(0, maximo);
}

function fichaEntrante(cuerpo) {
  const pixabayId = entero(cuerpo && cuerpo.pixabayId, 999999999999);
  const paginaUrl = urlDePixabay(cuerpo && cuerpo.paginaUrl);
  const previaUrl = urlDePixabay(cuerpo && cuerpo.previaUrl);
  const vistaUrl = urlDePixabay(cuerpo && cuerpo.vistaUrl);
  if (!pixabayId || !paginaUrl || !vistaUrl) return null;
  return {
    pixabayId,
    paginaUrl,
    previaUrl: previaUrl || vistaUrl,
    vistaUrl,
    etiquetas: texto(cuerpo.etiquetas, 240),
    autor: texto(cuerpo.autor, 80),
    meGusta: entero(cuerpo.meGusta, 100000000) ?? 0,
    vistas: entero(cuerpo.vistas, 1000000000) ?? 0,
  };
}

module.exports = { fichaEntrante, urlDePixabay };
