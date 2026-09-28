# Portal de Gestión de Documentos Azurian — Banco de Pruebas QA Automation

Este repositorio contiene la aplicación **Portal de Gestión de Documentos Azurian**, un entorno web interactivo full-stack desarrollado en **Next.js (App Router, TypeScript, TailwindCSS)** con rutas de **API Serverless** integradas. El proyecto está diseñado específicamente como el banco de pruebas técnico corporativo para la evaluación práctica de postulantes al cargo de **QA Automatizador** en **Azurian**.

---

## 1. Descripción General y Contexto

El objetivo principal de esta prueba técnica es evaluar las competencias prácticas y arquitectónicas de los candidatos en la automatización de pruebas integradas (API REST, Interfaz UI de usuario y Flujos Híbridos E2E).

La aplicación simula un sistema empresarial real de facturación electrónica (DTE 33, 34, 39) en Chile, incluyendo desafíos deliberados de ingeniería de software diseñados para retar la resiliencia de los scripts de automatización:
- **Atributos de ID Dinámicos en Componentes UI:** Los identificadores `id` en inputs y botones cambian sus sufijos en cada renderizado/recarga (ej. `id="input-user-8f92"`, `id="btn-login-3k1x"`).
- **Comportamiento Asíncrono y Spinners Deliberados:** Las peticiones de la grilla de documentos y creación de registros simulan retardos aleatorios entre **1.8 y 2.5 segundos** con estados de carga explícitos (`role="status"`).
- **Consistencia Híbrida API/UI:** Los datos creados mediante los endpoints serverless persisten en memoria durante el runtime y se reflejan inmediatamente en la interfaz gráfica.

---

## 2. Instrucciones para el Evaluador / Administrador

### 2.1 Requisitos Previos
- **Node.js**: v18.0.0 o superior.
- **npm**: v9.0.0 o superior.

### 2.2 Ejecución Local
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/azurian-repo/azurian-qa-evaluation.git
   cd azurian-qa-evaluation
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abrir en el navegador: `http://localhost:3000`

### 2.3 Ejecución con Docker / Docker Compose (Recomendado para Evaluados)
Para levantar el entorno completo de pruebas en un solo comando mediante Docker Desktop:
```bash
docker compose up --build -d
```
- **Verificar estado y Healthcheck del contenedor:**
  ```bash
  docker compose ps
  ```
  El contenedor estará completamente listo cuando su estado indique `healthy`.
- **Detener el entorno:**
  ```bash
  docker compose down
  ```

### 2.4 Despliegue en Vercel (1-Click)
La arquitectura unificada (Frontend + API Routes) permite desplegar este repositorio directamente en Vercel sin configuración adicional:
1. Subir el repositorio a GitHub / GitLab.
2. Importar el proyecto en el dashboard de Vercel.
3. Presionar **Deploy**. Vercel detectará Next.js automáticamente.

### 2.4 Credenciales Predeterminadas de Prueba
| Usuario / Email | Contraseña | Rol |
| :--- | :--- | :--- |
| `admin@azurian.com` | `Azurian2026!` | QA Lead / Administrador |

### 2.5 Endpoints Serverless Disponibles
- `POST /api/auth/login`: Autenticación de usuario. Retorna token JWT simulado (`200 OK`) o error (`401 Unauthorized`).
- `GET /api/documents`: Retorna el listado de documentos DTE en JSON (`200 OK`). Soporta query param `?rut=76.192.584-9`.
- `POST /api/documents`: Crea un nuevo documento DTE.
  - **Payload Requerido:**
    ```json
    {
      "tipoDte": "DTE 33",
      "folio": 1004,
      "rutReceptor": "77.341.920-5",
      "monto": 250000
    }
    ```
  - Retorna `201 Created` en caso de éxito o `400 Bad Request` si faltan campos obligatorios.

---

## 3. Instrucciones Formales para el Postulante / Evaluado

### 3.1 Objetivo de la Prueba
Construir y entregar un repositorio independiente o una suite de pruebas automatizadas que ejecute pruebas sobre este portal utilizando el stack técnico oficial de Azurian:
- **Framework E2E:** [Playwright](https://playwright.dev/) con [TypeScript](https://www.typescriptlang.org/)
- **Metodología:** [Cucumber (BDD / Gherkin)](https://cucumber.io/)
- **Reportabilidad:** [Allure Report](https://allurereport.org/)

### 3.2 Desafíos Técnicos a Superar

> [!WARNING]
> **Prohibición de XPath Estáticos y Selectores por ID Frágiles:**
> Debido a que la aplicación genera atributivos `id` aleatorios en cada render (ej. `#input-user-x9a2`), **quedan estrictamente prohibidos los selectores frágiles basados en IDs fijos o XPath absolutos**.
>
> Se exige el uso estricto de **Page Object Model (POM)** y localizadores semánticos recomendados por Playwright:
> - `page.getByRole(...)`
> - `page.getByLabel(...)`
> - `page.getByPlaceholder(...)`
> - `page.locator('tr').filter({ hasText: '...' })`

> [!IMPORTANT]
> **Manejo de Asincronía:**
> Se prohíbe el uso de pausas estáticas o fijas (como `page.waitForTimeout()`, `sleep()` o `Thread.sleep()`). La suite debe validar el ocultamiento del loader/spinner mediante esperas explícitas y auto-waitings nativos de Playwright (`expect(locator).toBeVisible()`).

---

### 3.3 Escenarios BDD / Gherkin Mínimos Solicitados

El candidato debe implementar como mínimo los siguientes escenarios distribuidos en sus respectivos archivos `.feature`:

#### Feature 1: Validación de API REST Backend (`features/api_documents.feature`)
```gherkin
# language: es
Característica: Gestión de Autenticación y Documentos vía API REST

  Escenario: Autenticación exitosa mediante API Login
    Dado que consumo el servicio de login con usuario "admin@azurian.com" y clave "Azurian2026!"
    Entonces la respuesta debe tener el código de estado 200
    Y la respuesta debe contener un token JWT válido y los datos del usuario

  Escenario: Intentar autenticación con credenciales inválidas
    Dado que consumo el servicio de login con usuario "user@invalido.com" y clave "ClaveErronea"
    Entonces la respuesta debe tener el código de estado 401
    Y la respuesta debe incluir el mensaje de error "Credenciales inválidas"

  Escenario: Creación exitosa de un documento DTE vía API REST
    Dado que envío una solicitud POST a "/api/documents" con los siguientes datos:
      | tipoDte | folio | rutReceptor   | monto  |
      | DTE 33  | 9901  | 76.543.210-K  | 450000 |
    Entonces el código de respuesta debe ser 201
    Y el cuerpo de la respuesta debe incluir el ID generado y estado "ACEPTADO"
```

#### Feature 2: Autenticación e Interacción UI (`features/ui_login_dashboard.feature`)
```gherkin
# language: es
Característica: Autenticación de Usuario y Filtrado en Interfaz Gráfica (UI)

  Escenario: Inicio de sesión exitoso y visualización del Dashboard
    Dado que navego a la página de login
    Cuando ingreso el usuario "admin@azurian.com" y la contraseña "Azurian2026!" usando localizadores accesibles
    Y hago clic en el botón "Iniciar Sesión"
    Entonces debo ser redirigido al dashboard de documentos
    Y debo ver el mensaje de bienvenida "Bienvenido, Administrador Azurian"

  Escenario: Filtrado dinámico de documentos por RUT en la grilla
    Dado que me encuentro autenticado en el dashboard de documentos
    Cuando busco por el RUT Receptor "76.192.584-9" en la barra de herramientas
    Y espero a que el indicador de carga finalice
    Entonces la tabla debe mostrar únicamente la fila correspondiente al RUT "76.192.584-9"
```

#### Feature 3: Prueba Híbrida E2E (API + UI) (`features/hybrid_e2e.feature`)
```gherkin
# language: es
Característica: Verificación Híbrida E2E de Documentos (API a UI)

  Escenario: Crear un documento por API y verificar su presencia visual en la interfaz de usuario
    Dado que creo un documento DTE vía API REST con folio 8899, RUT "99.888.777-6" y monto 120000
    Cuando el postulante se autentica en la aplicación web e ingresa al dashboard
    Y realiza la búsqueda del RUT "99.888.777-6"
    Entonces la tabla de la interfaz gráfica debe mostrar la fila con el Folio "8899" y el monto "$ 120.000 CLP"
```

---

## 4. Plantilla de Estructura de Proyecto Sugerida para el Postulante

Se sugiere que la solución entregada por el candidato posea la siguiente estructura de archivos:

```text
azurian-qa-automation-suite/
├── features/
│   ├── api_documents.feature
│   ├── ui_login_dashboard.feature
│   └── hybrid_e2e.feature
├── src/
│   ├── pages/                   # Page Object Model (POM)
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   └── DashboardPage.ts
│   ├── steps/                   # Step Definitions (Cucumber)
│   │   ├── apiSteps.ts
│   │   ├── loginSteps.ts
│   │   └── dashboardSteps.ts
│   ├── api/                     # Clientes API / API Request Helpers
│   │   └── DocumentsApiClient.ts
│   └── utils/                   # Utilities, Hooks y Allure Reporters
│       └── hooks.ts
├── cucumber.js                  # Configuración de Cucumber Runner
├── playwright.config.ts         # Configuración de Playwright
├── tsconfig.json
├── package.json
└── README.md
```

---

## 5. Rúbrica y Criterios de Evaluación Azurian

Los postulantes serán evaluados por el equipo de QA Leads & Architects de Azurian conforme a los siguientes parámetros cuantitativos y cualitativos:

| Criterio de Evaluación | Pesaje | Excelente (100%) | Aceptable (70%) | Insuficiente (0-40%) |
| :--- | :---: | :--- | :--- | :--- |
| **Arquitectura Page Object Model (POM)** | **25%** | Separación limpia entre definición de elementos, acciones de página y steps de Cucumber. Clases reutilizables y bien estructuradas. | POM implementado pero con acoplamiento menor de aserciones dentro de las páginas. | No se usa POM o los selectores están incrustados directamente en los step definitions. |
| **Resiliencia de Localizadores (IDs Dinámicos)** | **25%** | Uso exclusivo de selectores semánticos (`getByRole`, `getByLabel`, `getByPlaceholder`, `filter({ hasText })`). Inmune a cambios de ID. | Uso mayoritario de selectores semánticos, con algún selector por clase CSS genérico. | Fracaso por uso de IDs fijos (`#input-user`) o XPath frágiles e inestables. |
| **Manejo de Asincronía y Esperas** | **20%** | Cero uso de pausas estáticas (`waitForTimeout` / `sleep`). Uso impecable de auto-waitings de Playwright y validación de spinners. | Raras pausas estáticas aisladas, pero la mayoría de las esperas son dinámicas. | Abuso de `waitForTimeout()` o fallos intermitentes por condiciones de carrera (*flaky tests*). |
| **Calidad BDD / Gherkin** | **15%** | Redacción declarativa centrada en el negocio, reutilización de steps y uso correcto de Datatables y Backgrounds. | Redacción orientada al negocio pero con algunos detalles demasiado imperativos ("hago click en el botón X"). | Gherkin técnico/imperativo que describe la implementación en lugar del comportamiento. |
| **Tipado TypeScript y Clean Code** | **10%** | Código estrictamente tipado (sin uso de `any`), modular, limpio y bajo principios SOLID/DRY. | Uso menor de `any`, pero código entendible y bien formateado. | Código JavaScript disfrazado de TypeScript con `any` en todas partes y duplicación. |
| **Reportabilidad Allure** | **5%** | Allure Report integrado correctamente, generando métricas y adjuntando capturas de pantalla (*screenshots*) automáticamente en fallos. | Allure Report generado pero sin evidencias de captura en caso de fallo. | Sin reporte Allure o fallos en la configuración de la ejecución. |

---

## 6. Licencia y Soporte

Este proyecto es propiedad intelectual de **Azurian**. Queda estrictamente prohibida su distribución no autorizada fuera del proceso de selección técnica corporativa.

Para consultas técnicas o reporte de inconsistencias en la plataforma de prueba, contactar a **qa-lead@azurian.com**.
