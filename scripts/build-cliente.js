const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const salida = path.join(__dirname, '..', 'public', 'js', 'app.js');

async function construir() {
  const resultado = await esbuild.build({
    entryPoints: [path.join(__dirname, '..', 'src', 'cliente', 'app.js')],
    bundle: true,
    minify: true,
    legalComments: 'none',
    drop: ['console', 'debugger'],
    sourcemap: false,
    write: false,
    format: 'iife',
    target: ['es2020'],
  });
  const minificado = resultado.outputFiles[0].text;
  const ofuscado = JavaScriptObfuscator.obfuscate(minificado, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    selfDefending: false,
    simplify: true,
    sourceMap: false,
    stringArray: true,
    stringArrayThreshold: 0.75,
  }).getObfuscatedCode();
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, ofuscado);
}

construir().catch((error) => {
  console.error(error instanceof Error ? error.message : 'No se pudo construir el cliente.');
  process.exit(1);
});
