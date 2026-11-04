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

const COLORES = new Map([
  ['black', 'color negro'],
  ['negro', 'color negro'],
  ['negra', 'color negro'],
  ['negros', 'color negro'],
  ['negras', 'color negro'],
  ['white', 'color blanco'],
  ['blanco', 'color blanco'],
  ['blanca', 'color blanco'],
  ['blancos', 'color blanco'],
  ['blancas', 'color blanco'],
]);

const PERSONAS = new Set([
  'person', 'people', 'man', 'woman', 'men', 'women', 'human', 'humans',
  'portrait', 'face', 'faces', 'model', 'crowd', 'guy', 'lady',
  'persona', 'personas', 'gente', 'hombre', 'hombres', 'mujer', 'mujeres',
  'retrato', 'cara', 'rostro', 'multitud',
]);

const ESTEREOTIPOS = new Set([
  'homeless', 'beggar', 'beggars', 'slum', 'slums', 'ghetto', 'poverty',
  'favela', 'favelas', 'mendigo', 'mendigos', 'indigente', 'indigentes', 'miseria',
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

const MENSAJE_MENORES = 'No mostramos fotografías de niñas, niños ni adolescentes. Esa búsqueda no se envió a Pixabay.';

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

function reencuadrar(normalizada, motivo) {
  let frase = normalizada;
  FRASES.forEach((entrada) => {
    frase = frase.replaceAll(entrada.texto, ' ');
  });
  const restos = [];
  let color = '';
  tokens(frase).forEach((token) => {
    if (COLORES.has(token)) {
      color = COLORES.get(token);
      return;
    }
    if (RACIALES.has(token) || SOCIOECONOMICOS.has(token) || GENERO.has(token) || MENORES.has(token) || PERSONAS.has(token)) return;
    restos.push(token);
  });
  if (restos.length && color) return `${restos.join(' ')} ${color}`.slice(0, 100).trim();
  if (color) return `${color} textura objeto fondo`;
  if (motivo === 'genero') return 'hogar objeto';
  if (motivo === 'socioeconomico') return 'paisaje objeto';
  return 'textura abstracta color';
}

function evaluar(consulta) {
  const normalizada = normalizar(consulta);
  const motivo = motivoDe(new Set(tokens(normalizada)), normalizada);
  const bloqueada = motivo === 'menores';
  const filtrarPersonas = motivo === 'racial' || motivo === 'socioeconomico' || motivo === 'genero';
  return {
    normalizada,
    bloqueada,
    motivo,
    filtrarPersonas,
    consultaPixabay: filtrarPersonas ? reencuadrar(normalizada, motivo) : String(consulta || '').replace(/\s+/g, ' ').trim(),
    mensaje: bloqueada ? MENSAJE_MENORES : '',
  };
}

function etiquetaTieneMenor(etiquetas) {
  return tokens(etiquetas).some((token) => MENORES.has(token));
}

function etiquetaDescartada(etiquetas, filtrarPersonas) {
  const lista = tokens(etiquetas);
  if (lista.some((token) => MENORES.has(token) || (RACIALES.has(token) && !COLORES.has(token)))) return true;
  if (!filtrarPersonas) return false;
  return lista.some((token) => PERSONAS.has(token) || ESTEREOTIPOS.has(token) || SOCIOECONOMICOS.has(token));
}

module.exports = { evaluar, etiquetaTieneMenor, etiquetaDescartada, normalizar };
