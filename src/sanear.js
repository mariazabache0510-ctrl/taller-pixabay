function esObjetoPlano(valor) {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

function tieneClavePeligrosa(valor) {
  if (Array.isArray(valor)) return valor.some((item) => tieneClavePeligrosa(item));
  if (!esObjetoPlano(valor)) return false;
  return Object.keys(valor).some((clave) => (
    clave.includes('$') || clave.includes('.') || tieneClavePeligrosa(valor[clave])
  ));
}

function enteros(lista, maximo) {
  if (!Array.isArray(lista) || lista.length > maximo) return null;
  const numeros = [];
  for (const item of lista) {
    if (typeof item === 'object') return null;
    const numero = Number(item);
    if (!Number.isInteger(numero) || numero <= 0 || numero > 999999999999) return null;
    numeros.push(numero);
  }
  return numeros;
}

module.exports = { esObjetoPlano, tieneClavePeligrosa, enteros };
