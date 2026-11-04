const mongoose = require('mongoose');

const busquedaSchema = new mongoose.Schema(
  {
    visitanteId: { type: String, required: true, index: true },
    consulta: { type: String, required: true },
    consultaNormalizada: { type: String, required: true },
    bloqueada: { type: Boolean, required: true },
    motivo: { type: String, default: '' },
    cantidad: { type: Number, default: 0 },
    idsPixabay: { type: [Number], default: [] },
    creadaEn: { type: Date, default: Date.now },
  },
  { collection: 'busquedas' },
);

const imagenSchema = new mongoose.Schema(
  {
    visitanteId: { type: String, required: true },
    pixabayId: { type: Number, required: true },
    paginaUrl: { type: String, required: true },
    previaUrl: { type: String, required: true },
    vistaUrl: { type: String, required: true },
    etiquetas: { type: String, default: '' },
    autor: { type: String, default: '' },
    meGusta: { type: Number, default: 0 },
    vistas: { type: Number, default: 0 },
    guardadaEn: { type: Date, default: Date.now },
  },
  { collection: 'imagenes_guardadas' },
);

imagenSchema.index({ visitanteId: 1, pixabayId: 1 }, { unique: true });

function definirModelos(conexion) {
  return {
    Busqueda: conexion.model('Busqueda', busquedaSchema),
    ImagenGuardada: conexion.model('ImagenGuardada', imagenSchema),
  };
}

module.exports = { definirModelos };
