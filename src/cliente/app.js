const formulario = document.querySelector('#formulario');
const campo = document.querySelector('#consulta');
const aviso = document.querySelector('#aviso');
const galeria = document.querySelector('#galeria');
const coleccion = document.querySelector('#coleccion');
const historial = document.querySelector('#historial');
const tabGaleria = document.querySelector('#tab-galeria');
const tabColeccion = document.querySelector('#tab-coleccion');
const tabHistorial = document.querySelector('#tab-historial');
const cuentaGaleria = document.querySelector('#cuenta-galeria');
const cuentaColeccion = document.querySelector('#cuenta-coleccion');
const cuentaHistorial = document.querySelector('#cuenta-historial');
const estadoDatos = document.querySelector('#estado-datos');

const guardadas = new Set();
let temporizador = 0;
let solicitud = 0;

function tokenCsrf() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') || '' : '';
}

function cabecerasJson() {
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': tokenCsrf(),
  };
}

const mongo = document.body.dataset.mongo === '1';
const espejo = document.body.dataset.espejo === '1';
estadoDatos.textContent = mongo
  ? (espejo ? 'El archivo principal y su copia están disponibles.' : 'El archivo de búsquedas está disponible.')
  : 'Las búsquedas de esta visita no se pueden archivar todavía.';

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  buscar(campo.value);
});

campo.addEventListener('input', () => {
  window.clearTimeout(temporizador);
  const texto = campo.value.trim();
  if (texto.length < 2) return;
  temporizador = window.setTimeout(() => buscar(texto), 450);
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    campo.value = chip.dataset.consulta;
    campo.focus();
    buscar(chip.dataset.consulta);
  });
});

const vistas = ['galeria', 'coleccion', 'historial'];
const tabs = { galeria: tabGaleria, coleccion: tabColeccion, historial: tabHistorial };

tabGaleria.addEventListener('click', () => mostrar('galeria'));
tabColeccion.addEventListener('click', () => mostrar('coleccion'));
tabHistorial.addEventListener('click', () => mostrar('historial'));

document.querySelector('.pestanas').addEventListener('keydown', (evento) => {
  if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
  const actual = vistas.findIndex((nombre) => tabs[nombre] === evento.target);
  if (actual < 0) return;
  evento.preventDefault();
  const paso = evento.key === 'ArrowRight' ? 1 : -1;
  const siguiente = vistas[(actual + paso + vistas.length) % vistas.length];
  mostrar(siguiente);
  tabs[siguiente].focus();
});

pintarVacio(galeria, 'Escribe una palabra o usa una de prueba. Las fotos aparecen aquí.');
cargarColeccion();

function mostrar(cual, desplazar) {
  const paneles = { galeria, coleccion, historial };
  vistas.forEach((nombre) => {
    const activo = nombre === cual;
    paneles[nombre].hidden = !activo;
    tabs[nombre].setAttribute('aria-selected', String(activo));
    tabs[nombre].tabIndex = activo ? 0 : -1;
  });
  if (cual !== 'galeria') cargarColeccion();
  if (desplazar) {
    document.querySelector('#ventana-resultados').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function buscar(texto) {
  const consulta = texto.trim();
  if (consulta.length < 2) {
    decir('Escribe al menos 2 caracteres.', true);
    return;
  }
  const id = ++solicitud;
  decir('', false);
  aviso.hidden = true;
  galeria.setAttribute('aria-busy', 'true');
  galeria.replaceChildren();
  for (let i = 0; i < 4; i += 1) {
    const hueco = document.createElement('div');
    hueco.className = 'esqueleto';
    galeria.append(hueco);
  }
  mostrar('galeria');
  try {
    const respuesta = await fetch(`/api/buscar?q=${encodeURIComponent(consulta)}`);
    const datos = await respuesta.json();
    if (id !== solicitud) return;
    if (!respuesta.ok) {
      pintarVacio(galeria, datos.mensaje || 'No se pudo buscar.');
      decir(datos.mensaje || 'No se pudo buscar.', true);
      return;
    }
    const persistencia = await archivar(consulta, datos);
    if (persistencia) cargarColeccion();
    if (datos.bloqueada) {
      const extra = persistencia ? '' : ' No se pudo archivar esta búsqueda.';
      pintarVacio(galeria, `${datos.mensaje}${extra}`);
      decir(`${datos.mensaje}${extra}`, true);
      cuentaGaleria.textContent = '(0)';
      return;
    }
    if (!persistencia) {
      decir(datos.mensaje ? `${datos.mensaje} No se pudo archivar esta búsqueda.` : 'La búsqueda se hizo, pero no se pudo archivar.', true);
    } else if (datos.mensaje) {
      decir(datos.mensaje, false);
    }
    pintarGaleria(datos.imagenes || []);
  } catch {
    if (id !== solicitud) return;
    pintarVacio(galeria, 'No hay conexión con el servidor.');
    decir('No hay conexión con el servidor.', true);
  } finally {
    if (id === solicitud) galeria.removeAttribute('aria-busy');
  }
}

async function archivar(consulta, datos) {
  try {
    const respuesta = await fetch('/api/historial', {
      method: 'POST',
      headers: cabecerasJson(),
      body: JSON.stringify({
        consulta,
        idsPixabay: datos.bloqueada ? [] : (datos.imagenes || []).map((imagen) => imagen.pixabayId),
      }),
    });
    if (!respuesta.ok) return false;
    const cuerpo = await respuesta.json();
    return Boolean(cuerpo.persistencia);
  } catch {
    return false;
  }
}

function pintarGaleria(imagenes) {
  cuentaGaleria.textContent = `(${imagenes.length})`;
  if (!imagenes.length) {
    pintarVacio(galeria, 'No quedaron fotos para mostrar.');
    return;
  }
  galeria.replaceChildren();
  imagenes.forEach((imagen, indice) => galeria.append(tarjeta(imagen, indice, false)));
}

function tarjeta(imagen, indice, enColeccion) {
  const articulo = document.createElement('article');
  articulo.className = `tarjeta entra tono-${indice % 3}`;
  articulo.tabIndex = 0;
  articulo.style.animationDelay = `${indice * 45}ms`;
  articulo.dataset.id = String(imagen.pixabayId);

  const foto = document.createElement('div');
  foto.className = 'foto';
  const img = document.createElement('img');
  img.src = imagen.vistaUrl || imagen.previaUrl;
  img.alt = imagen.etiquetas ? `Fotografía: ${imagen.etiquetas}` : 'Fotografía de Pixabay';
  const id = document.createElement('span');
  id.className = 'id-foto';
  id.textContent = `ID ${imagen.pixabayId}`;
  foto.append(img, id);

  const cuerpo = document.createElement('div');
  cuerpo.className = 'cuerpo';
  const etiquetas = document.createElement('div');
  etiquetas.className = 'etiquetas';
  presentarEtiquetas(imagen.etiquetas).forEach((texto) => {
    const pill = document.createElement('span');
    pill.textContent = texto;
    etiquetas.append(pill);
  });
  const autor = document.createElement('p');
  autor.className = 'autor';
  autor.textContent = `Autor: ${imagen.autor || 'Pixabay'}`;
  const stats = document.createElement('p');
  stats.className = 'stats';
  stats.append(stat('Me gusta', imagen.meGusta), stat('Vistas', imagen.vistas));

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton boton-guardar';
  const ya = enColeccion || guardadas.has(imagen.pixabayId);
  marcarBoton(boton, ya);
  boton.addEventListener('click', () => alternar(imagen, boton));

  cuerpo.append(etiquetas, autor, stats, boton);
  articulo.append(foto, cuerpo);
  return articulo;
}

function stat(nombre, valor) {
  const span = document.createElement('span');
  span.className = 'stat';
  const numero = document.createElement('strong');
  numero.textContent = Number(valor || 0).toLocaleString('es-CO');
  span.append(numero, document.createTextNode(` ${nombre}`));
  return span;
}

function presentarEtiquetas(texto) {
  return String(texto || 'Pixabay')
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function marcarBoton(boton, guardada) {
  boton.classList.toggle('esta-guardada', guardada);
  boton.textContent = guardada ? 'Quitar de Mongo' : 'Guardar en Mongo';
}

async function alternar(imagen, boton) {
  const guardada = guardadas.has(imagen.pixabayId);
  boton.disabled = true;
  try {
    const respuesta = guardada
      ? await fetch(`/api/coleccion/${imagen.pixabayId}`, {
        method: 'DELETE',
        headers: cabecerasJson(),
      })
      : await fetch('/api/coleccion', {
        method: 'POST',
        headers: cabecerasJson(),
        body: JSON.stringify(imagen),
      });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      decir(datos.mensaje || 'No se pudo actualizar la colección.', true);
      return;
    }
    if (guardada) guardadas.delete(imagen.pixabayId);
    else guardadas.add(imagen.pixabayId);
    document.querySelectorAll(`.tarjeta[data-id="${imagen.pixabayId}"] .boton-guardar`).forEach((otro) => {
      marcarBoton(otro, !guardada);
    });
    cuentaColeccion.textContent = `(${guardadas.size})`;
    if (guardada) {
      decir('Se quitó de la colección.', false);
      if (!coleccion.hidden) cargarColeccion();
    } else {
      decir('', false);
      mostrar('coleccion', true);
    }
  } catch {
    decir('No hay conexión con el servidor.', true);
  } finally {
    boton.disabled = false;
  }
}

async function cargarColeccion() {
  try {
    const respuesta = await fetch('/api/coleccion');
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      const mensaje = datos.mensaje || 'No se pudo leer la colección.';
      coleccion.replaceChildren(parrafo(mensaje));
      historial.replaceChildren(parrafo(mensaje));
      return;
    }
    guardadas.clear();
    (datos.imagenes || []).forEach((imagen) => guardadas.add(imagen.pixabayId));
    cuentaColeccion.textContent = `(${guardadas.size})`;
    pintarColeccion(datos);
    pintarHistorial(datos);
    document.querySelectorAll('.tarjeta .boton-guardar').forEach((boton) => {
      const id = Number(boton.closest('.tarjeta').dataset.id);
      marcarBoton(boton, guardadas.has(id));
    });
  } catch {
    const mensaje = parrafo('No hay conexión con el servidor.');
    coleccion.replaceChildren(mensaje);
    historial.replaceChildren(mensaje.cloneNode(true));
  }
}

function pintarColeccion(datos) {
  coleccion.replaceChildren();
  const intro = document.createElement('p');
  intro.className = 'intro-coleccion';
  intro.textContent = 'Aquí queda lo que eliges conservar en esta visita. MongoDB no guarda el archivo de la foto: guarda la ficha, con su identificador, etiquetas, autor y enlace.';
  coleccion.append(intro);
  const cuadricula = document.createElement('div');
  cuadricula.className = 'cuadricula';
  const imagenes = datos.imagenes || [];
  if (!imagenes.length) {
    const vacio = document.createElement('p');
    vacio.className = 'vacio';
    vacio.textContent = datos.mongo
      ? 'Todavía no guardas fotos. Elige una en la galería: se archiva la ficha, no el archivo.'
      : 'El archivo de esta visita todavía no está disponible.';
    cuadricula.append(vacio);
  } else {
    imagenes.forEach((imagen, indice) => cuadricula.append(tarjeta(imagen, indice, true)));
  }
  coleccion.append(cuadricula);
}

function pintarHistorial(datos) {
  historial.replaceChildren();
  const intro = document.createElement('p');
  intro.className = 'intro-coleccion';
  intro.textContent = 'Cada búsqueda de esta visita queda en su propia ventana. Pulsa una tarjeta para repetirla en la galería.';
  historial.append(intro);
  const lista = document.createElement('div');
  lista.className = 'lista-historial';
  const busquedas = datos.busquedas || [];
  cuentaHistorial.textContent = `(${busquedas.length})`;
  if (!busquedas.length) {
    const vacio = document.createElement('p');
    vacio.className = 'vacio';
    vacio.textContent = datos.mongo
      ? 'Esta visita aún no tiene búsquedas archivadas.'
      : 'El archivo de esta visita todavía no está disponible.';
    lista.append(vacio);
  } else {
    busquedas.forEach((busqueda, indice) => lista.append(filaHistorial(busqueda, indice)));
  }
  historial.append(lista);
}

function filaHistorial(busqueda, indice) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = `item-historial entra tono-${indice % 3}`;
  item.style.animationDelay = `${indice * 45}ms`;
  const texto = document.createElement('div');
  const fuerte = document.createElement('strong');
  fuerte.textContent = busqueda.consulta;
  const fecha = document.createElement('div');
  fecha.className = 'cuando';
  fecha.textContent = new Date(busqueda.creadaEn).toLocaleString('es-CO');
  texto.append(fuerte, fecha);
  const marca = document.createElement('span');
  marca.className = busqueda.bloqueada ? 'marca bloqueo' : 'marca';
  marca.textContent = busqueda.bloqueada ? 'Interceptada' : `${busqueda.cantidad} fotos`;
  item.append(texto, marca);
  item.addEventListener('click', () => {
    campo.value = busqueda.consulta;
    buscar(busqueda.consulta);
  });
  return item;
}

function pintarVacio(contenedor, mensaje) {
  contenedor.replaceChildren();
  const parrafoVacio = document.createElement('p');
  parrafoVacio.className = 'vacio';
  parrafoVacio.textContent = mensaje;
  contenedor.append(parrafoVacio);
}

function parrafo(mensaje) {
  const nodo = document.createElement('p');
  nodo.className = 'vacio';
  nodo.textContent = mensaje;
  return nodo;
}

function decir(mensaje, alerta) {
  if (!mensaje) {
    aviso.hidden = true;
    aviso.textContent = '';
    return;
  }
  aviso.hidden = false;
  aviso.textContent = mensaje;
  aviso.classList.toggle('calmo', !alerta);
}
