# Azurian QA Evaluation Lab

Laboratorio local para practicar y evaluar automatización E2E con Playwright y TypeScript. Simula un portal de documentos DTE: login, consulta, filtros, emisión y API REST.

No contiene datos reales ni se conecta a sistemas tributarios externos.

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

Se pueden cambiar mediante `LAB_USERNAME` y `LAB_PASSWORD` en un archivo `.env` basado en `.env.example`.

## Contrato de datos y aislamiento

Cada navegador crea un identificador de ejecución y lo conserva en `localStorage` como `azurian_lab_run_id`. La UI lo envía en el encabezado `x-lab-run-id`; el API usa ese identificador para separar los documentos de cada participante.

Para el escenario híbrido API → UI, la suite puede generar un `runId` propio, incluirlo en el encabezado de su petición API y establecer el mismo valor en `localStorage` antes de abrir el portal. El formato permitido es de 3 a 80 caracteres alfanuméricos, `_` o `-`.

Cada ejecución comienza con **48 documentos semilla**: 16 DTE 33, 16 DTE 34 y 16 DTE 39, distribuidos entre varios RUT, montos, fechas y estados. Hay RUT con más de un documento del mismo tipo a propósito: una prueba correcta debe acotar por filtros y validar la fila exacta por folio, monto u otro dato de negocio; no por la primera posición de la tabla.

Un folio es único dentro de la misma ejecución; intentar repetirlo devuelve `409`.

## API disponible

| Método | Ruta | Resultado esperado |
|---|---|---|
| `POST` | `/api/auth/login` | `200` con token para credenciales correctas; `401` para credenciales inválidas. |
| `GET` | `/api/documents?rut=&tipoDte=` | `200` con documentos de la ejecución indicada. `tipoDte` acepta `DTE 33`, `DTE 34`, `DTE 39` o se omite. |
| `POST` | `/api/documents` | `201` para una emisión válida, `400` para validaciones y `409` para un folio duplicado. |
| `GET` | `/api/health` | Healthcheck del laboratorio. |

Las rutas de documentos requieren el encabezado recomendado `x-lab-run-id`. Si se omite, se usa `default`, útil sólo para exploración manual local.

Un documento válido requiere `tipoDte`, `folio` entero positivo, `rutReceptor` con formato `12.345.678-9`, `monto` no negativo y `fechaEmision` en formato `YYYY-MM-DD`. Si `sendCopy` es `true`, `contactEmail` debe ser válido.

## Asincronía deliberada

El servidor demora de forma aleatoria cada login, consulta o emisión. Por defecto el rango es entre 300 y 3.200 ms; se puede ajustar con `LAB_DELAY_MIN_MS` y `LAB_DELAY_MAX_MS`.

La UI expone un estado de carga accesible y deshabilita acciones mientras la petición está en curso. Las respuestas incluyen `x-request-id` y `x-lab-delay-ms` para diagnósticos, no para condicionar las pruebas.

Las pruebas deben esperar condiciones observables —respuesta, spinner, diálogo, tabla, mensaje o URL— y no pausas fijas como `waitForTimeout` o `sleep`.

## Reglas de evaluación

| Permitido y esperado | No válido para la evaluación |
|---|---|
| `getByRole`, `getByLabel`, texto visible y relaciones semánticas de tabla. | XPath absoluto, clases de estilo, IDs internos o índices globales como locator. |
| `expect`, auto-wait de Playwright, espera de respuesta o de un estado visible. | `waitForTimeout`, `sleep` o cualquier pausa fija. |
| POM, datos únicos por `runId` y flujo API → UI. | Leer o modificar directamente PostgreSQL, las latencias, el seed o datos de otra ejecución. |
| Filtrar y validar la fila precisa por datos de negocio. | Aprobar una prueba porque la primera fila o un resultado parcial coincide. |

Los límites de la evaluación se revisan junto con la suite. Una prueba puede usar una espera explícita de Playwright cuando está ligada a un evento observable; el problema es esperar un tiempo arbitrario.

## Superficies del reto

- Login exitoso y fallido.
- Tabla semántica, consulta por RUT y filtro DTE realizados por API.
- 48 documentos semilla con estados Aceptado, Pendiente y Rechazado para validar resultados exactos.
- Diálogos accesibles, alertas y estados de carga.
- Formulario con `select`, `date`, `number`, `text`, `radio`, `checkbox`, `email`, `file` y `textarea`.
- Validación cliente/servidor, emisión válida y folio duplicado.
- Flujo híbrido: crear por API y comprobar la fila correcta en UI.

Los identificadores internos no constituyen contrato de automatización. El portal está rotulado semánticamente para favorecer `getByRole`, `getByLabel`, `getByText` y relaciones de tabla accesibles.

## Reinicio administrativo por ejecución

Sólo el facilitador puede reiniciar una ejecución sin borrar el volumen completo:

```bash
curl -X POST http://localhost:3000/api/lab/reset \
  -H "x-lab-run-id: mi-ejecucion" \
  -H "x-lab-reset-key: local-lab-reset"
```

En un uso compartido, cambia `LAB_RESET_KEY`, no lo publiques y asigna un `runId` distinto a cada participante.
