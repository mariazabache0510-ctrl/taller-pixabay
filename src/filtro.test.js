const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluar, etiquetaTieneMenor } = require('./filtro');

test('intercepta BLACK, POOR y sus equivalentes', () => {
  assert.equal(evaluar('BLACK').motivo, 'racial');
  assert.equal(evaluar('black cat').bloqueada, true);
  assert.equal(evaluar('POOR').motivo, 'socioeconomico');
  assert.equal(evaluar('gente pobre').motivo, 'socioeconomico');
  assert.equal(evaluar('gato negro').bloqueada, true);
  assert.equal(evaluar('NATURE').bloqueada, false);
  assert.equal(evaluar('technology').bloqueada, false);
  assert.equal(evaluar('ciudad de noche').bloqueada, false);
  assert.equal(evaluar('  POOR   people').motivo, 'socioeconomico');
  assert.equal(evaluar('bl4ck').motivo, 'racial');
  assert.equal(evaluar('p0or').motivo, 'socioeconomico');
  assert.equal(evaluar('b.l.a.c.k').motivo, 'racial');
  assert.equal(evaluar('niña').motivo, 'menores');
});

test('intercepta menores y revisa etiquetas por palabra', () => {
  assert.equal(evaluar('niño sonriendo').motivo, 'menores');
  assert.equal(evaluar('baby animals').motivo, 'menores');
  assert.equal(evaluar('ama de casa').motivo, 'genero');
  assert.equal(etiquetaTieneMenor('cat, kitten, pet'), false);
  assert.equal(etiquetaTieneMenor('child, smile, portrait'), true);
  assert.equal(etiquetaTieneMenor('kidney, medicine'), false);
});
