const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluar, etiquetaTieneMenor, etiquetaDescartada } = require('./filtro');

test('reencuadra BLACK, POOR y sus equivalentes hacia objetos y colores', () => {
  const black = evaluar('BLACK');
  assert.equal(black.motivo, 'racial');
  assert.equal(black.bloqueada, false);
  assert.equal(black.filtrarPersonas, true);
  assert.equal(black.consultaPixabay.includes('black'), false);
  assert.equal(black.consultaPixabay.includes('color negro'), true);
  const gato = evaluar('gato negro');
  assert.equal(gato.bloqueada, false);
  assert.equal(gato.consultaPixabay, 'gato color negro');
  const poor = evaluar('POOR');
  assert.equal(poor.motivo, 'socioeconomico');
  assert.equal(poor.bloqueada, false);
  assert.equal(poor.consultaPixabay.includes('poor'), false);
  assert.equal(evaluar('gente pobre').consultaPixabay.includes('pobre'), false);
  assert.equal(evaluar('pobre').consultaPixabay.includes('casa sencilla'), true);
  assert.equal(evaluar('pobre').consultaPixabay.includes('paisaje'), false);
  assert.equal(evaluar('POOR').consultaPixabay.includes('luna'), false);
  assert.equal(evaluar('NATURE').bloqueada, false);
  assert.equal(evaluar('NATURE').filtrarPersonas, false);
  assert.equal(evaluar('technology').bloqueada, false);
  assert.equal(evaluar('ciudad de noche').consultaPixabay, 'ciudad de noche');
  assert.equal(evaluar('  POOR   people').consultaPixabay.includes('poor'), false);
  assert.equal(evaluar('bl4ck').consultaPixabay.includes('black'), false);
  assert.equal(evaluar('p0or').motivo, 'socioeconomico');
  assert.equal(evaluar('b.l.a.c.k').consultaPixabay.includes('color negro'), true);
  assert.equal(evaluar('niña').bloqueada, true);
  assert.equal(evaluar('nigger').consultaPixabay.includes('nigger'), false);
});

test('intercepta menores y revisa etiquetas por palabra', () => {
  assert.equal(evaluar('niño sonriendo').motivo, 'menores');
  assert.equal(evaluar('baby animals').motivo, 'menores');
  assert.equal(evaluar('ama de casa').motivo, 'genero');
  assert.equal(etiquetaTieneMenor('cat, kitten, pet'), false);
  assert.equal(etiquetaTieneMenor('child, smile, portrait'), true);
  assert.equal(etiquetaTieneMenor('kidney, medicine'), false);
  assert.equal(etiquetaDescartada('black, texture, background', true), false);
  assert.equal(etiquetaDescartada('black, man, portrait', true), true);
  assert.equal(etiquetaDescartada('homeless, person', true), true);
  assert.equal(etiquetaDescartada('man, portrait', false), false);
});
