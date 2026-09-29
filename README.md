# Azurian QA Evaluation Lab

Laboratorio local para practicar y evaluar automatización **E2E (UI), API y flujos híbridos** con Playwright y TypeScript. Simula un portal de documentos DTE con un **CRUD completo**: login, consulta con filtros y paginación, emisión, edición, envío al SII, eliminación y una API REST con las mismas capacidades.

No contiene datos reales ni se conecta a sistemas tributarios externos.

> El enunciado formal de la prueba (stack, escenarios obligatorios, entrega y rúbrica) está en [`docs/ENUNCIADO_PRUEBA.md`](docs/ENUNCIADO_PRUEBA.md). Este README describe el laboratorio y su contrato.

## Inicio rápido

Requisitos: Docker Desktop con Docker Compose.

```bash
docker compose up --build
```

El portal queda disponible en `http://localhost:3000`. El comando inicia la aplicación Next.js y PostgreSQL; la aplicación espera a que la base de datos esté saludable antes de iniciar.

Para detenerlo:

```bash
docker compose down
```

Para reiniciar por completo los datos locales:

```bash
docker compose down -v
```

> El último comando elimina únicamente el volumen local `qa_lab_data` de este laboratorio.

## Credenciales de laboratorio

| Usuario | Contraseña |
|---|---|
| `admin@azurian.com` | `Azurian2026!` |

## Variables de entorno

Se definen en un archivo `.env` basado en `.env.example`.

| Variable | Por defecto | Uso |
|---|---|---|
| `APP_PORT` | `3000` | Puerto del host donde se publica el portal (el contenedor siempre usa el 3000). |
| `LAB_USERNAME` / `LAB_PASSWORD` | `admin@azurian.com` / `Azurian2026!` | Credenciales válidas. |
| `LAB_DELAY_MIN_MS` / `LAB_DELAY_MAX_MS` | `300` / `3200` | Rango de la latencia aleatoria por petición. |
| `LAB_RESET_KEY` | `local-lab-reset` | Clave del reinicio administrativo. |
| `LAB_TOKEN_SECRET` | `azurian-qa-lab-secret` | Secreto con el que se firman los tokens. |
| `LAB_TOKEN_TTL_SECONDS` | `3600` | Vigencia del token (1–86400). Bajarla, por ejemplo a `5`, permite ejercitar el escenario de token vencido. |

## Contrato de datos y aislamiento

Cada navegador crea un identificador de ejecución y lo conserva en `localStorage` como `azurian_lab_run_id`. La UI lo envía en el encabezado `x-lab-run-id`; el API usa ese identificador para separar los documentos de cada participante.

Para el escenario híbrido API → UI, la suite puede generar un `runId` propio, incluirlo en el encabezado de sus peticiones API y establecer el mismo valor en `localStorage` antes de abrir el portal. El formato permitido es de 3 a 80 caracteres alfanuméricos, `_` o `-`. Si se omite el encabezado se usa `default` (sólo útil para exploración manual).

Cada ejecución se siembra **una sola vez**, la primera vez que se usa, con **48 documentos**:

| Dimensión | Valores |
|---|---|
| Tipo | 16 × `DTE 33`, 16 × `DTE 34`, 16 × `DTE 39` |
| Estado | 17 × `ACEPTADO`, 16 × `PENDIENTE`, 15 × `RECHAZADO` |
| Monto total | `$ 36.546.400` |
| Receptores | 15 RUT; tres de ellos tienen 4 documentos y el resto 3 |

Hay RUT con más de un documento del mismo tipo a propósito: una prueba correcta debe acotar por filtros y validar la fila exacta por folio, monto u otro dato de negocio; no por la primera posición de la tabla. Los documentos eliminados no reaparecen. Todos los RUT del seed tienen dígito verificador válido.

Un folio es único dentro de la misma ejecución; intentar repetirlo devuelve `409`.

## Autenticación

`POST /api/auth/login` devuelve un **JWT firmado (HS256)** con su vigencia. Todas las rutas de `/api/documents` y `/api/auth/me` exigen:

```http
Authorization: Bearer <token>
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "user": { "id": "user-azurian-01", "email": "admin@azurian.com", "name": "Administrador Azurian", "role": "QA Lab Participant" }
}
```

Un token ausente, mal formado, con firma alterada o vencido devuelve `401` (`UNAUTHORIZED` o `TOKEN_EXPIRED`) con el encabezado `WWW-Authenticate: Bearer`. En la UI, un `401` limpia la sesión y redirige a `/login?expired=1`.

## API disponible

| Método | Ruta | Resultado |
|---|---|---|
| `POST` | `/api/auth/login` | `200` con token · `400` datos faltantes · `401` credenciales inválidas. |
| `GET` | `/api/auth/me` | `200` con el usuario y `expiresAt` · `401`. |
| `GET` | `/api/documents` | `200` con el arreglo de documentos (filtros y paginación opcionales). |
| `POST` | `/api/documents` | `201` con el documento creado (`PENDIENTE`) · `400` · `409` folio duplicado. |
| `GET` | `/api/documents/{id}` | `200` · `404`. |
| `PUT` | `/api/documents/{id}` | `200` reemplazo de los campos editables · `400` · `404` · `409` documento aceptado. |
| `PATCH` | `/api/documents/{id}` | `200` actualización parcial · `400` · `404` · `409`. |
| `DELETE` | `/api/documents/{id}` | `204` sin cuerpo · `404` · `409` documento aceptado. |
| `POST` | `/api/documents/{id}/send` | `200` con el documento ya resuelto por el SII · `404` · `409` si no está `PENDIENTE`. |
| `GET` | `/api/documents/summary` | `200` con totales de la ejecución. |
| `GET` | `/api/health` | Healthcheck del laboratorio. |

### Listado, filtros y paginación

`GET /api/documents?rut=&tipoDte=&estado=&page=&pageSize=`

| Parámetro | Valores | Notas |
|---|---|---|
| `rut` | dígitos, puntos, guion y `K` (máx. 12) | Búsqueda parcial que ignora puntos y guion: `76192584` encuentra `76.192.584-9`. |
| `tipoDte` | `DTE 33`, `DTE 34`, `DTE 39` o `TODOS` | |
| `estado` | `ACEPTADO`, `PENDIENTE`, `RECHAZADO` o `TODOS` | |
| `page`, `pageSize` | enteros ≥ 1 y 1–100 | Si se envía alguno, se pagina (por defecto página 1 de 10). Sin ellos se devuelve todo. |

El cuerpo es siempre un arreglo. Los metadatos van en encabezados: `x-total-count` (siempre) y, al paginar, `x-page`, `x-page-size` y `x-total-pages`. El orden es `fechaEmision` descendente y luego `folio` descendente. Una página fuera de rango devuelve `[]` con `200`.

### Modelo de documento

```json
{
  "id": "1f0c…",
  "tipoDte": "DTE 33",
  "folio": 9901,
  "rutReceptor": "76.543.209-K",
  "monto": 450000,
  "fechaEmision": "2026-09-28",
  "estado": "PENDIENTE",
  "deliveryChannel": "EMAIL",
  "sendCopy": true,
  "contactEmail": "contacto@empresa.cl",
  "observaciones": null,
  "attachmentName": "respaldo.pdf",
  "createdAt": "2026-09-28T22:44:39.000Z",
  "updatedAt": "2026-09-28T22:44:39.000Z"
}
```

`estado`, `id`, `createdAt` y `updatedAt` los asigna el servidor: si se envían en `POST`/`PUT`/`PATCH` se ignoran. Lo mismo ocurre con cualquier campo desconocido.

### Reglas de validación

Se aplican **en el servidor y también en el formulario** (mismas reglas, mismos mensajes). La API valida tipos de forma estricta (`"123"` no es un número) y devuelve **todos** los errores a la vez.

| Campo | Requerido | Regla |
|---|---|---|
| `tipoDte` | sí | `DTE 33`, `DTE 34` o `DTE 39`. |
| `folio` | sí | Entero de 1 a 9.999.999. Único por ejecución. |
| `rutReceptor` | sí | Formato `12.345.678-9` (con puntos y guion) y **dígito verificador válido (módulo 11)**. Una `k` minúscula se normaliza a `K`. |
| `monto` | sí | Entero en CLP de 1 a 999.999.999. |
| `fechaEmision` | sí | `YYYY-MM-DD`, fecha real de calendario, entre `2000-01-01` y hoy (se tolera +1 día por zona horaria). |
| `deliveryChannel` | no (`PORTAL`) | `PORTAL` o `EMAIL`. |
| `sendCopy` | no (`false`) | Booleano. |
| `contactEmail` | condicional | **Obligatorio si `sendCopy` es `true` o el canal es `EMAIL`**. Si se envía, debe ser un correo válido (máx. 120). |
| `observaciones` | no | Texto de hasta 300 caracteres. |
| `attachmentName` | no | Nombre con extensión `.pdf`, `.xml` o `.txt` (máx. 120, sin `/` ni `\`). En la UI el archivo no puede superar 2 MB. |

`PUT` es un **reemplazo**: exige los campos obligatorios y los opcionales omitidos vuelven a su valor por defecto. `PATCH` valida sólo lo enviado (combinado con el estado actual, por lo que la regla de `contactEmail` sigue aplicando) y rechaza un cuerpo sin campos editables.

### Ciclo de vida y reglas de estado

| Estado | Editar (`PUT`/`PATCH`) | Eliminar | Enviar al SII |
|---|---|---|---|
| `PENDIENTE` | Sí (sigue `PENDIENTE`) | Sí | Sí |
| `RECHAZADO` | Sí, **vuelve a `PENDIENTE`** | Sí | No |
| `ACEPTADO` | No → `409 DOCUMENT_LOCKED` | No → `409 DOCUMENT_LOCKED` | No |

- Todo documento nuevo nace `PENDIENTE`.
- `tipoDte` y `folio` son **inmutables**: enviarlos con otro valor devuelve `400` (enviarlos con el mismo valor está permitido).
- **Enviar al SII** resuelve el documento de forma determinista: `monto` ≤ 10.000.000 → `ACEPTADO`; mayor → `RECHAZADO`.

### Formato de error

```json
{
  "error": "Datos de entrada inválidos. Revisa los campos indicados.",
  "code": "VALIDATION_ERROR",
  "details": [{ "field": "monto", "message": "El monto es obligatorio." }]
}
```

| Código HTTP | `code` |
|---|---|
| 400 | `VALIDATION_ERROR` (con `details`), `INVALID_JSON`, `INVALID_RUN_ID` |
| 401 | `UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN` (reinicio administrativo) |
| 404 | `NOT_FOUND` |
| 409 | `DUPLICATE_FOLIO`, `DOCUMENT_LOCKED`, `INVALID_STATE` |

Orden de precedencia: `401` → `400` (`x-lab-run-id`) → `404` (documento inexistente) → `400` (cuerpo) → `409` (estado). Es decir, un cuerpo inválido sobre un documento aceptado responde `400`, no `409`.

Todas las respuestas, incluidos los errores, incluyen `x-request-id` y `x-lab-delay-ms` para diagnóstico.

### Resumen

`GET /api/documents/summary` → `{ "total": 48, "montoTotal": 36546400, "porEstado": { "ACEPTADO": 17, "PENDIENTE": 16, "RECHAZADO": 15 } }`. Refleja toda la ejecución (no depende de los filtros de la tabla) y se actualiza con cada alta, edición, envío o baja.

## Interfaz

- **Login** con validación en línea, error de credenciales y aviso de sesión vencida.
- **Dashboard**: tarjetas de resumen, tabla semántica con filtros por RUT, tipo y estado, y paginación de 10 filas.
- **Crear** y **editar** en un diálogo con `select`, `date`, `number`, `text`, `radio`, `checkbox`, `email`, `file` y `textarea` (con contador). El correo de contacto se habilita sólo cuando corresponde; en edición `tipoDte` y `folio` quedan bloqueados.
- **Ver detalle** (consulta el documento por API), **Enviar al SII** y **Eliminar** con diálogo de confirmación (`alertdialog`).
- Las acciones no aplicables aparecen deshabilitadas (por ejemplo, editar o eliminar un documento aceptado).
- Avisos de resultado (`role="status"`), errores (`role="alert"`), estados de carga accesibles y diálogos que se cierran con `Escape`.

Los identificadores internos no constituyen contrato de automatización. El portal está rotulado semánticamente para favorecer `getByRole`, `getByLabel`, `getByText` y relaciones de tabla accesibles.

## Asincronía deliberada

El servidor demora de forma aleatoria cada login, consulta o escritura. Por defecto el rango es entre 300 y 3.200 ms; se puede ajustar con `LAB_DELAY_MIN_MS` y `LAB_DELAY_MAX_MS`. La UI expone un estado de carga y deshabilita acciones mientras la petición está en curso. Si llegan respuestas fuera de orden, la UI conserva siempre la de la consulta más reciente.

Las pruebas deben esperar condiciones observables —respuesta, spinner, diálogo, tabla, mensaje o URL— y no pausas fijas como `waitForTimeout` o `sleep`.

## Reglas de evaluación

| Permitido y esperado | No válido para la evaluación |
|---|---|
| `getByRole`, `getByLabel`, texto visible y relaciones semánticas de tabla. | XPath absoluto, clases de estilo, IDs internos o índices globales como locator. |
| `expect`, auto-wait de Playwright, espera de respuesta o de un estado visible. | `waitForTimeout`, `sleep` o cualquier pausa fija. |
| POM, cliente API modular, datos únicos por `runId` y flujo API → UI. | Leer o modificar directamente PostgreSQL, las latencias, el seed o datos de otra ejecución. |
| Filtrar y validar la fila precisa por datos de negocio. | Aprobar una prueba porque la primera fila o un resultado parcial coincide. |

Los límites de la evaluación se revisan junto con la suite. Una prueba puede usar una espera explícita de Playwright cuando está ligada a un evento observable; el problema es esperar un tiempo arbitrario.

## Reinicio administrativo por ejecución

Sólo el facilitador puede reiniciar una ejecución sin borrar el volumen completo. El endpoint no aplica la latencia simulada:

```bash
curl -X POST http://localhost:3000/api/lab/reset \
  -H "x-lab-run-id: mi-ejecucion" \
  -H "x-lab-reset-key: local-lab-reset"
```

En un uso compartido, cambia `LAB_RESET_KEY`, no lo publiques y asigna un `runId` distinto a cada participante.

## Notas para el facilitador

- Si el volumen `qa_lab_data` viene de una versión anterior del laboratorio, el esquema se migra automáticamente al iniciar (columna `updated_at` y tabla `lab_runs`). Los RUT de esos documentos antiguos pueden no cumplir el dígito verificador y, al editarlos, el API los rechazará: `docker compose down -v` deja el laboratorio con los datos semilla actuales.
- Para practicar el token vencido sin esperar una hora, levanta el laboratorio con `LAB_TOKEN_TTL_SECONDS=5` y espera el `401` con una condición (por ejemplo `expect.poll`), nunca con una pausa fija.
- En Windows, el sistema puede reservar rangos de puertos (Hyper-V/WinNAT) que incluyan el 3000 y Docker falla con `bind: An attempt was made to access a socket in a way forbidden by its access permissions`. Verifícalo con `netsh int ipv4 show excludedportrange protocol=tcp` y publica el portal en otro puerto con `APP_PORT`, por ejemplo `APP_PORT=3100 docker compose up --build` (o `APP_PORT=3100` en tu `.env`). El portal quedará en `http://localhost:3100`.
