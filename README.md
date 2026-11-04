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

| Variable | Uso |
| --- | --- |
| `MONGODB_URI` | Base principal. Lectura y escritura. En Render, una URI de Atlas. |
| `MONGODB_URI_MIRROR` | Opcional. Cada búsqueda y cada foto guardada se copia aquí. Si falla, la aplicación sigue con la principal. |
| `PIXABAY_API_KEY` | Clave de [Pixabay](https://pixabay.com/api/docs/). |

En tu computador la principal puede ser Mongo local (`mongodb://127.0.0.1:27017/taller_pixabay`) y el espejo Atlas, o al revés. Render no alcanza el Mongo de tu máquina: allí las dos URI, si quieres espejo, tienen que ser de Atlas.

No subas el archivo `.env`.

## Filtro

Antes de llamar a Pixabay se revisa la frase, sin tildes y por palabra completa.

- Siempre se interceptan `black`, `poor`, `pobre` y equivalentes de sesgo racial, socioeconómico o de género (`negro`, `white`, `blanco`, `pobreza`, `homeless`, `ama de casa`, y otros del mismo grupo). Da igual que vayan acompañados de otra palabra: `black cat` también se detiene, como pide la nota del taller.
- También se interceptan búsquedas de menores (`child`, `baby`, `niño`, `niña`, `adolescente`, y equivalentes).
- Las búsquedas permitidas piden `safesearch=true` y fotos. Si una etiqueta nombra a un menor, esa foto se descarta.
- El intento bloqueado igual se archiva, marcado como interceptado.

`NATURE` y `TECHNOLOGY` pasan el filtro. Cada visitante queda separado por una cookie httpOnly, sin registro.

## Pruebas

```bash
npm test
```
