const mongoose = require('mongoose');
const { definirModelos } = require('./modelos');
const { mensajeSeguro } = require('./registro');

let modelos = null;
let modelosEspejo = null;

async function abrir(uri) {
  const conexion = mongoose.createConnection(uri);
  await conexion.asPromise();
  return definirModelos(conexion);
}

async function conectar() {
  const uri = String(process.env.MONGODB_URI || '').trim();
  const uriEspejo = String(process.env.MONGODB_URI_MIRROR || '').trim();
  if (!uri) throw new Error('Falta MONGODB_URI');
  modelos = await abrir(uri);
  if (!uriEspejo) return;
  try {
    modelosEspejo = await abrir(uriEspejo);
  } catch (error) {
    modelosEspejo = null;
    console.error('No se pudo abrir el espejo:', mensajeSeguro(error));
  }
}

function estado() {
  return {
    mongo: Boolean(modelos),
    espejo: Boolean(modelosEspejo),
    pixabay: Boolean(process.env.PIXABAY_API_KEY),
  };
}

async function enAmbas(accion) {
  if (!modelos) {
    const error = new Error('sin-mongo');
    error.codigo = 'sin-mongo';
    throw error;
  }
  const resultado = await accion(modelos);
  if (modelosEspejo) {
    try {
      await accion(modelosEspejo);
    } catch (error) {
      console.error('El espejo no replicó el cambio:', mensajeSeguro(error));
    }
  }
  return resultado;
}

async function registrarBusqueda(datos) {
  return enAmbas((grupo) => grupo.Busqueda.create(datos));
}

async function listar(visitanteId) {
  if (!modelos) {
    return { imagenes: [], busquedas: [], mongo: false };
  }
  const [imagenes, busquedas] = await Promise.all([
    modelos.ImagenGuardada.find({ visitanteId }).sort({ guardadaEn: -1 }).limit(60).lean(),
    modelos.Busqueda.find({ visitanteId }).sort({ creadaEn: -1 }).limit(30).lean(),
  ]);
  return { imagenes, busquedas, mongo: true };
}

async function guardarImagen(datos) {
  const filtro = { visitanteId: datos.visitanteId, pixabayId: datos.pixabayId };
  return enAmbas((grupo) => grupo.ImagenGuardada.findOneAndUpdate(
    filtro,
    datos,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ));
}

async function quitarImagen(visitanteId, pixabayId) {
  return enAmbas((grupo) => grupo.ImagenGuardada.deleteOne({ visitanteId, pixabayId }));
}

module.exports = {
  conectar,
  estado,
  registrarBusqueda,
  listar,
  guardarImagen,
  quitarImagen,
};
