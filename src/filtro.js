const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a' };

const RACIALES = new Set([
  'black', 'negro', 'negra', 'negros', 'negras',
  'white', 'blanco', 'blanca', 'blancos', 'blancas',
  'racist', 'racista', 'racism', 'racismo',
  'nigger', 'nigga', 'chink', 'spic', 'kike', 'wetback', 'gook', 'paki',
  'sudaca', 'mayate',
]);

const SOCIOECONOMICOS = new Set([
  'poor', 'poorer', 'poorest', 'poverty',
  'pobre', 'pobres', 'pobreza',
  'homeless', 'indigente', 'indigentes',
  'ghetto', 'gueto', 'slum', 'slums', 'favela', 'favelas',
  'miseria', 'beggar', 'beggars', 'mendigo', 'mendigos',
]);

const GENERO = new Set([
  'housewife', 'housewives',
]);

const MENORES = new Set([
  'child', 'children', 'kid', 'kids', 'baby', 'babies',
  'infant', 'infants', 'toddler', 'toddlers', 'newborn', 'newborns',
  'boy', 'boys', 'girl', 'girls',
  'nino', 'nina', 'ninos', 'ninas', 'nene', 'nena',
  'bebe', 'bebes', 'menor', 'menores', 'infantil', 'infancia',
  'teen', 'teens', 'teenager', 'teenagers',
  'adolescente', 'adolescentes',
  'schoolboy', 'schoolgirl', 'schoolchild',
  'underage', 'minor', 'minors',
]);

const FRASES = [
  { texto: 'ama de casa', motivo: 'genero' },
  { texto: 'mujer objeto', motivo: 'genero' },
  { texto: 'sexo debil', motivo: 'genero' },
];

const MENSAJES = {
  racial: 'Esa palabra puede sesgar las imágenes hacia un grupo racial. La búsqueda se interceptó y no se envió a Pixabay.',
  socioeconomico: 'Esa palabra puede reforzar un estereotipo de pobreza. La búsqueda se interceptó y no se envió a Pixabay.',
  genero: 'Esa palabra puede reforzar un estereotipo de género. La búsqueda se interceptó y no se envió a Pixabay.',
  menores: 'No mostramos fotografías de niñas, niños ni adolescentes. Esa búsqueda no se envió a Pixabay.',
};

function aplicarLeet(texto) {
  return texto.replace(/[013457@]/g, (letra) => LEET[letra]);
}

function normalizar(texto) {
  return aplicarLeet(
    String(texto || '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase(),
  ).replace(/\s+/g, ' ').trim();
}

function unirLetrasSueltas(lista) {
  const salida = [];
  let acumulado = '';
  const soltar = () => {
    if (acumulado.length > 1) salida.push(acumulado);
    acumulado = '';
  };
  lista.forEach((token) => {
    if (token.length === 1 && /[a-z]/.test(token)) acumulado += token;
    else {
      soltar();
      salida.push(token);
    }
  });
  soltar();
  return salida;
}

function tokens(texto) {
  return unirLetrasSueltas(normalizar(texto).split(/[^a-z0-9]+/).filter(Boolean));
}

function motivoDe(conjunto, frase) {
  if ([...conjunto].some((token) => MENORES.has(token))) return 'menores';
  if ([...conjunto].some((token) => RACIALES.has(token))) return 'racial';
  if ([...conjunto].some((token) => SOCIOECONOMICOS.has(token))) return 'socioeconomico';
  if ([...conjunto].some((token) => GENERO.has(token))) return 'genero';
  const hallada = FRASES.find((entrada) => frase.includes(entrada.texto));
  return hallada ? hallada.motivo : '';
}

function evaluar(consulta) {
  const normalizada = normalizar(consulta);
  const motivo = motivoDe(new Set(tokens(normalizada)), normalizada);
  return {
    normalizada,
    bloqueada: Boolean(motivo),
    motivo,
    mensaje: MENSAJES[motivo] || '',
  };
}

function etiquetaTieneMenor(etiquetas) {
  return tokens(etiquetas).some((token) => MENORES.has(token));
}

module.exports = { evaluar, etiquetaTieneMenor, normalizar };
