# Prueba Práctica de Automatización — QA Automation Engineer en Azurian

Bienvenido/a a la evaluación técnica del rol de **QA Automation Engineer**. La prueba valida que sepas automatizar un flujo real en **dos capas —UI y API—**, con escenarios escritos en Cucumber, pruebas ordenadas, estables y con reportes claros.

El sistema bajo prueba es un portal de documentos tributarios (DTE) con un **CRUD completo**. El contrato de la API, las reglas de validación y el ciclo de vida de los documentos están en el [README](../README.md): léelo antes de empezar.

## 1. Información general y stack obligatorio

- **Rol a evaluar:** QA Automation Engineer.
- **Tiempo límite:** 48 o 72 horas desde la recepción de este documento.
- **Stack tecnológico obligatorio:**
  - **Framework:** Playwright.
  - **Lenguaje:** TypeScript con tipado estricto, sin `any`.
  - **Enfoque BDD:** Cucumber / Gherkin (`@cucumber/cucumber`). Puedes ejecutarlo con cucumber-js o integrarlo con Playwright Test mediante `playwright-bdd`.
  - **Reportabilidad:** Allure Report (`allure-cucumberjs` si usas cucumber-js, o `allure-playwright` si usas `playwright-bdd`).
  - **Diseño:** Page Object Model (POM) para la UI y **cliente API modular** para el backend.

## 2. Entorno y accesos

| Dato | Valor |
|---|---|
| Levantar el laboratorio | `docker compose up --build` |
| URL del portal | `http://localhost:3000` (o la que indique el facilitador) |
| Base URL de la API | `http://localhost:3000/api` |
| Usuario / contraseña | `admin@azurian.com` / `Azurian2026!` |

> En Windows el puerto 3000 puede estar reservado por el sistema. Si Docker no logra publicarlo, usa `APP_PORT=3100` (ver README) y apunta tus pruebas a ese puerto.

Resumen de la API (detalle en el README). Todas las rutas de documentos exigen `Authorization: Bearer <token>` y el encabezado `x-lab-run-id`:

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Devuelve `token` (JWT), `expiresIn` y `user`. |
| `GET` `POST` | `/api/documents` | Listar (filtros `rut`, `tipoDte`, `estado`, paginación) y crear. |
| `GET` `PUT` `PATCH` `DELETE` | `/api/documents/{id}` | Leer, reemplazar, modificar parcialmente y eliminar. |

## 3. Reglas del reto

**Aislamiento por ejecución.** Usa tu propio `runId` (3–80 caracteres alfanuméricos, `_` o `-`) en `x-lab-run-id`. Cada `runId` parte de 48 documentos semilla. Tus escenarios no deben chocar con los de otra ejecución ni depender de un orden: genera folios y RUT únicos por escenario.

**Permitido y esperado**
- `getByRole`, `getByLabel`, `getByText` y relaciones semánticas de tabla.
- `expect`, auto-wait de Playwright y esperas ligadas a un evento observable (respuesta, indicador de carga, diálogo, mensaje).
- POM, cliente API tipado y datos únicos por escenario.

**Se evalúa negativamente**
- XPath absoluto, clases de estilo, IDs internos o posiciones globales (`first()`, `nth()`) para elegir un documento.
- `waitForTimeout`, `sleep` o cualquier pausa fija.
- Leer o modificar PostgreSQL, las latencias o el seed, o usar datos de otra ejecución.
- Dar por buena una prueba porque "la primera fila coincide": valida la fila exacta por folio, RUT y monto.

El portal responde con **latencia aleatoria (0,3 a 3,2 s)**. Tu suite debe ser estable frente a esa variabilidad.

## 4. Escenarios obligatorios

Escribe los escenarios en archivos `.feature` (Gherkin) y automatiza **el mismo ejercicio en las dos capas**: el ciclo de vida de un documento tributario. Cada operación debe tener aserciones que comprueben el resultado.

| Operación | En la UI (`@ui`) | En la API (`@api`) |
|---|---|---|
| **Crear** | Inicia sesión, abre "Nuevo documento", completa el formulario y emite. Verifica el aviso de éxito y que la fila muestra folio, tipo, RUT, monto y estado. | `POST /api/documents` con sesión válida. Verifica `201` y el **cuerpo completo** de la respuesta (datos enviados, `id` y `estado` asignados, fechas), y que `GET /api/documents/{id}` devuelve exactamente lo mismo. |
| **Leer** | Filtra por RUT, identifica **la fila exacta** por su folio (el RUT tiene varios documentos) y abre "Ver detalle". Verifica los datos del detalle. | Lista con filtros (`rut` + `tipoDte`), localiza el folio exacto y lo lee por id. Verifica el **cuerpo completo** del listado y del detalle; un id inexistente responde `404` con su error completo. |
| **Editar** | Abre la edición de un documento propio, cambia datos y guarda. Verifica el aviso, la fila actualizada y que el cambio persiste al recargar. | `PUT` y/o `PATCH` sobre un documento propio. Verifica `200` y el **cuerpo completo** (campos cambiados y los que no deben cambiar), y que un `GET` posterior lo confirma. |
| **Eliminar** | Elimina un documento propio pasando por el diálogo de confirmación. Verifica que **ya no existe**: la fila desaparece, la tabla queda vacía para ese filtro y sigue así al recargar. | `DELETE` sobre un documento propio. Verifica `204` sin cuerpo y que **ya no existe**: `GET /api/documents/{id}` responde `404` con su error completo y no aparece en el listado. |

**Cómo validar la API.** No basta con revisar algunos campos: cada respuesta debe compararse por su **cuerpo completo** (todos los campos, ninguno de más ni de menos). Los valores que cambian en cada ejecución (`id`, fechas, token) se validan por su forma en lugar de por su valor.

**Cómo debe explicarse el reporte.** Cada verificación de tu reporte Allure debe dejar claro qué se esperaba y qué se obtuvo (por ejemplo, adjuntando el cuerpo esperado y el recibido), para que quien lo lea entienda por qué la prueba está bien sin abrir el código.

**Cómo escribir el Gherkin.** Los escenarios describen el comportamiento de negocio (*qué* ocurre), no la implementación (*cómo*): sin selectores, URLs ni rutas de API dentro del `.feature`. Reutiliza las mismas frases en varios escenarios, usa `Antecedentes` para lo común, tablas de datos para los datos de negocio y `Esquema del escenario` con `Ejemplos` para los casos repetidos.

### Extras que suman puntos (opcionales)

- **Validaciones de API:** campo obligatorio ausente, RUT con dígito verificador inválido, folio duplicado (`409`), petición sin token (`401`), con el `code` y el `field` esperados.
- **Validaciones de UI:** errores del formulario junto a cada campo, correo de contacto habilitado solo cuando corresponde, acciones bloqueadas de un documento aceptado.
- **Flujo híbrido:** crear por API y verificar en pantalla (o al revés).
- **Buenas prácticas adicionales:** casos parametrizados, fixtures propios, paralelismo seguro, manejo de la vigencia del token.

## 5. Orden del código

Cada escenario debe poder **identificarse y ejecutarse por separado**. Se espera:

- Un **título único y descriptivo**, idealmente con un ID (`UI-CRUD-01 · Crear un documento tributario`).
- Los `.feature`, las definiciones de los pasos, las páginas y los clientes en carpetas separadas por capa (`api/` y `ui/`).
- **Tags** que permitan ejecutar una capa (`@api`, `@ui`) o una operación (`@crear`, `@leer`, `@editar`, `@eliminar`).
- Definiciones de pasos delgadas: cada frase solo llama a un Page Object, a un cliente API o a un verificador.
- Configuración (URL, credenciales) centralizada, no repartida entre los escenarios.

## 6. Instrucciones de entrega

1. Sube tu solución a un repositorio público o privado en **GitHub / GitLab** (si es privado, otorga acceso a la cuenta indicada por el facilitador).
2. El `README.md` de tu solución debe incluir los comandos exactos para:
   - Instalar dependencias y configurar el entorno.
   - Ejecutar la suite completa.
   - Ejecutar **solo API** o **solo UI**.
   - Ejecutar por **tag** o un escenario individual.
   - **Generar y abrir el reporte Allure** localmente.
3. Agrega scripts de `npm` como atajos para lo anterior.
4. Envía el enlace de tu repositorio antes de la fecha límite respondiendo al correo de la convocatoria.

### Estructura de proyecto sugerida

```text
tu-solucion/
├── api/
│   ├── features/         # escenarios Gherkin de la API (*.feature)
│   ├── steps/            # definición de cada frase
│   ├── clients/          # cliente API modular
│   ├── models/           # tipos de las respuestas
│   └── fixtures/
├── ui/
│   ├── features/         # escenarios Gherkin de la UI (*.feature)
│   ├── steps/
│   ├── pages/            # Page Objects
│   └── fixtures/
├── shared/               # configuración y datos de prueba
├── playwright.config.ts  # (o cucumber.js si usas cucumber-js)
├── tsconfig.json
├── package.json          # scripts (atajos)
└── README.md
```

## 7. Cómo se evalúa

La evaluación es **acumulativa**: no existen requisitos eliminatorios. Cada incumplimiento solo resta los puntos del indicador correspondiente. Tu puntaje final (sobre 100, más hasta 10 puntos extra) resulta de:

| Criterio | Puntos |
|---|:---:|
| 1. Cobertura funcional del CRUD (crear, leer, editar y eliminar en UI y API) | 16 |
| 2. Calidad de las aserciones (datos de negocio, cuerpo completo de la API, persistencia y comprobación de lo eliminado) | 16 |
| 3. Localizadores de la UI (semánticos, fila exacta, sin selectores frágiles) | 10 |
| 4. Manejo de asincronía y estabilidad (sin pausas fijas, esperas observables, suite estable) | 10 |
| 5. Datos de prueba e independencia (datos únicos, escenarios independientes) | 6 |
| 6. Arquitectura y organización del código (POM, cliente API, identificación de cada escenario) | 12 |
| 7. BDD con Cucumber / Gherkin (Gherkin declarativo, frases reutilizables, recursos de Gherkin, escenarios atómicos) | 10 |
| 8. TypeScript y calidad de código (estricto, sin `any`, tipos) | 6 |
| 9. Allure y evidencias (reporte configurado, legible y explicativo —lo esperado frente a lo obtenido—, con evidencia de fallos y de las llamadas API) | 10 |
| 10. Documentación y ejecución (README, ejecución por tags, scripts) | 4 |
| **Total base** | **100** |
| Puntos extra (validaciones de API y UI, flujo híbrido, buenas prácticas) | hasta +10 |

Niveles: **90–100** Sobresaliente · **70–89** Aprobado · **50–69** Por reforzar · **0–49** No alcanza el nivel esperado.

> **Cucumber y Allure son obligatorios.** Sin Cucumber, el criterio 7 queda en 0 puntos; sin Allure, el criterio 9 queda en 0 puntos. En ninguno de los dos casos hay otra consecuencia.
