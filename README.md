# Taller Pixabay

Galería web que busca fotos en la API de Pixabay, detiene consultas que pueden reforzar sesgos o mostrar menores, y guarda el historial en MongoDB.

Stack: Node.js, Express, EJS, CSS y Mongoose. La clave de Pixabay vive solo en el servidor.

## Arranque local

```bash
npm install
cp .env.example .env
npm start
```

Abre `http://localhost:3000`. El proceso escucha en `0.0.0.0` y en el puerto de `PORT`.

## Variables

El proceso no arranca si falta `PIXABAY_API_KEY`, `MONGODB_URI` o `SESSION_SECRET`. No hay valores de reserva en el código.

| Variable | Uso |
| --- | --- |
| `MONGODB_URI` | Base principal. Lectura y escritura. En Render, una URI de Atlas. |
| `MONGODB_URI_MIRROR` | Opcional. Cada búsqueda y cada foto guardada se copia aquí. Si falla, la aplicación sigue con la principal. |
| `PIXABAY_API_KEY` | Clave de [Pixabay](https://pixabay.com/api/docs/). Solo la usa el servidor. |
| `SESSION_SECRET` | Firma la cookie de sesión (`httpOnly`, `SameSite=Lax`, `Secure` en producción). |
| `APP_ORIGIN` | Opcional. Origen extra permitido, además del host de la propia petición. |

En tu computador la principal puede ser Mongo local (`mongodb://127.0.0.1:27017/taller_pixabay`) y el espejo Atlas, o al revés. Render no alcanza el Mongo de tu máquina: allí las dos URI, si quieres espejo, tienen que ser de Atlas.

No subas el archivo `.env`.

## Filtro

Antes de llamar a Pixabay se revisa la frase, sin tildes y por palabra completa.

- `black`, `negro`, `poor`, `pobre` y los demás términos de sesgo racial, socioeconómico o de género no se bloquean. La consulta que sale hacia Pixabay habla de color, objeto, textura o paisaje, y se descartan las fotos cuya etiqueta nombra a una persona o un estereotipo. Un insulto no se reenvía tal cual.
- Las búsquedas de menores (`child`, `baby`, `niño`, `niña`, `adolescente`, y equivalentes) sí se interceptan y no se envían.
- Las búsquedas piden `safesearch=true` y fotos. Si una etiqueta nombra a un menor, esa foto se descarta.
- El intento bloqueado igual se archiva, marcado como interceptado.

`NATURE` y `TECHNOLOGY` pasan el filtro. El navegador llama a `GET /api/buscar?q=` en este mismo servidor; Pixabay no se consulta desde el cliente. Cada visita queda en una sesión firmada, sin registro. El JavaScript público se genera minificado y ofuscado con `npm run build` (también corre antes de `npm start`). No se publican source maps.

## Seguridad

- La lista de términos vive solo en `src/filtro.js`.
- `POST` y `DELETE` exigen el token CSRF de la página. `GET` no borra ni guarda datos; el historial se archiva con `POST /api/historial`.
- `/.env`, `/server.js`, `/package.json` y el código de `src/` responden 404.
- Los errores hacia el navegador son genéricos. El detalle queda en el log, sin la URI ni la clave.

## Pruebas

```bash
npm test
```
