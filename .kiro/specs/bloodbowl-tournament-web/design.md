# Documento de Diseño: bloodbowl-tournament-web

## Visión General

La plataforma web de torneos de Blood Bowl para "El Dragón de Madera" es una aplicación de acceso público que permite gestionar y visualizar torneos, jugadores, brackets y estadísticas. El sistema se divide en dos componentes principales:

1. **Scraper (Fase 0)**: Script standalone que extrae datos de referencia del juego desde fuentes externas y los persiste en la base de datos. Se ejecuta una vez antes de usar la plataforma.
2. **Aplicación Web**: Servidor web + frontend que consume exclusivamente los datos almacenados en la base de datos, sin acceder a fuentes externas durante el uso normal.

El sistema es completamente público: no requiere autenticación para ninguna operación (lectura ni escritura). Soporta torneos con formato mixto (Fase de Grupos + Fase Eliminatoria), visualización gráfica de brackets y diseño responsive.

---

## Arquitectura

### Diagrama de Alto Nivel

```mermaid
graph TB
    subgraph "Fase 0 - Scraper (standalone)"
        SC[Scraper Script] -->|HTTP GET| FZ[nufflezone.com]
        SC -->|HTTP GET| FN[jonasbusk.github.io/nuflheim]
        SC -->|INSERT/UPSERT| DB[(PostgreSQL)]
    end

    subgraph "Servidor Personal"
        subgraph "Aplicación Web"
            FE[Frontend React/Vite - archivos estáticos] -->|HTTP/REST| API[API Backend Express/Fastify]
            API -->|SQL queries via Prisma| DB
        end
        NX[Nginx reverse proxy] -->|/api/*| API
        NX -->|/* archivos estáticos| FE
    end

    Browser[Navegador / Móvil] -->|HTTPS| NX
```

### Decisiones de Arquitectura

| Decisión | Elección | Justificación |
|---|---|---|
| Framework frontend | React + Vite (SPA) | Build rápido, archivos estáticos servidos por Nginx, sin SSR necesario para este caso de uso |
| Framework backend | Express o Fastify (Node.js) | Servidor API separado, ligero, compatible con Prisma |
| Base de datos | PostgreSQL + Prisma ORM | Robustez y fiabilidad para datos relacionales; instalado en el servidor personal |
| Scraper | Script Node.js standalone | Desacoplado del servidor, ejecutable con `node scraper.js` |
| Visualización de brackets | React Flow o librería SVG custom | Renderizado gráfico de árboles de eliminación |
| Estilos | Tailwind CSS | Responsive out-of-the-box, desarrollo rápido |
| Despliegue | Servidor personal con Nginx + PM2 | Control total, sin dependencias de plataformas externas |

### Flujo de Datos

```mermaid
sequenceDiagram
    participant Admin as Organizador
    participant SC as Scraper
    participant DB as Base de Datos
    participant API as API Express/Fastify
    participant FE as Frontend

    Note over SC,DB: Fase 0 (prerequisito)
    Admin->>SC: node scraper.js
    SC->>DB: UPSERT razas, habilidades, fichas
    SC->>Admin: Resumen importación

    Note over Admin,FE: Uso normal
    Admin->>FE: Crear torneo
    FE->>API: POST /api/tournaments
    API->>DB: INSERT tournament
    API->>FE: 201 Created

    Admin->>FE: Registrar resultado
    FE->>API: POST /api/matches/:id/result
    API->>DB: UPDATE match + recalcular standings
    API->>FE: 200 OK + standings actualizados
```

### Arquitectura de Despliegue en Servidor Personal

```
Servidor Personal
├── PostgreSQL                  # Base de datos (puerto 5432, solo acceso local)
├── Node.js (backend)           # Gestionado con PM2
│   └── pm2 start backend/src/server.js --name bloodbowl-api
├── Nginx (reverse proxy)       # Puerto 80/443
│   ├── /api/*  → proxy_pass http://localhost:3001
│   └── /*      → root /var/www/bloodbowl/frontend/dist (archivos estáticos Vite)
└── .env                        # Variables de entorno (DATABASE_URL, PORT, etc.)
```

**Flujo de despliegue:**
1. Compilar el frontend: `cd frontend && npm run build` → genera `frontend/dist/`
2. Copiar `frontend/dist/` a `/var/www/bloodbowl/frontend/dist/`
3. Reiniciar el backend: `pm2 restart bloodbowl-api`
4. Nginx sirve los estáticos directamente y hace proxy de `/api/*` al backend Node.js

**Configuración Nginx (fragmento):**
```nginx
server {
    listen 80;
    server_name tudominio.com;

    # Frontend estático (Vite build)
    root /var/www/bloodbowl/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;  # SPA fallback
    }

    # API backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Componentes e Interfaces

### Estructura del Proyecto

El proyecto se divide en dos paquetes independientes dentro de un monorepo:

```
bloodbowl-tournament-web/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos (PostgreSQL)
├── scripts/
│   └── scraper.js             # Script standalone de scraping (Fase 0)
├── frontend/                  # React + Vite (SPA)
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx           # Punto de entrada
│       ├── App.tsx            # Router principal
│       ├── pages/
│       │   ├── Home.tsx           # Página de inicio
│       │   ├── TournamentList.tsx # Lista de torneos
│       │   ├── TournamentNew.tsx  # Crear torneo
│       │   ├── TournamentDetail.tsx # Detalle (bracket + clasificación)
│       │   ├── PlayerList.tsx
│       │   ├── PlayerNew.tsx
│       │   └── PlayerDetail.tsx   # Perfil de jugador
│       ├── components/
│       │   ├── bracket/
│       │   │   ├── BracketView.tsx
│       │   │   ├── GroupStageTable.tsx
│       │   │   └── EliminationBracket.tsx
│       │   ├── tournament/
│       │   ├── player/
│       │   └── ui/            # Componentes genéricos
│       ├── api/               # Funciones cliente para llamar al backend
│       │   └── client.ts
│       └── types/
│           └── index.ts       # Tipos TypeScript compartidos
├── backend/                   # Express/Fastify + Node.js
│   └── src/
│       ├── server.ts          # Punto de entrada del servidor
│       ├── routes/
│       │   ├── tournaments.ts
│       │   ├── players.ts
│       │   ├── matches.ts
│       │   └── reference.ts
│       ├── lib/
│       │   ├── prisma.ts      # Cliente Prisma singleton
│       │   ├── bracket.ts     # Lógica de generación de brackets
│       │   ├── standings.ts   # Cálculo de clasificaciones
│       │   └── validation.ts  # Validaciones de alineación
│       └── types/
│           └── index.ts
└── .env                       # Variables de entorno (DATABASE_URL, PORT, etc.)
```

### API REST — Endpoints Principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/tournaments` | Lista de torneos (ordenada por fecha desc) |
| POST | `/api/tournaments` | Crear torneo |
| GET | `/api/tournaments/:id` | Detalle de torneo |
| PUT | `/api/tournaments/:id` | Actualizar torneo |
| DELETE | `/api/tournaments/:id` | Eliminar torneo |
| GET | `/api/tournaments/:id/bracket` | Bracket completo del torneo |
| GET | `/api/tournaments/:id/standings` | Clasificación del torneo |
| POST | `/api/tournaments/:id/generate-bracket` | Generar bracket inicial |
| GET | `/api/players` | Lista de jugadores |
| POST | `/api/players` | Crear jugador |
| GET | `/api/players/:id` | Perfil de jugador con historial |
| POST | `/api/tournaments/:id/participants` | Inscribir jugador en torneo |
| PUT | `/api/participants/:id/roster` | Actualizar alineación |
| POST | `/api/matches/:id/result` | Registrar resultado de partido |
| GET | `/api/reference/races` | Lista de razas (datos de referencia) |
| GET | `/api/reference/skills` | Lista de habilidades |
| GET | `/api/stats/global` | Ranking histórico global |
| GET | `/api/stats/factions` | Estadísticas por facción |

---

## Modelos de Datos

### Esquema de Base de Datos (Prisma)

El provider de Prisma es `postgresql`. La cadena de conexión se configura mediante la variable de entorno `DATABASE_URL` en el archivo `.env`:

```
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/bloodbowl"
```

PostgreSQL debe estar instalado y en ejecución en el servidor personal antes de ejecutar las migraciones (`npx prisma migrate deploy`).

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Datos de referencia (poblados por el Scraper)
model Race {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  positions   Position[]
  updatedAt   DateTime  @updatedAt
  scrapedAt   DateTime
}

model Position {
  id          Int       @id @default(autoincrement())
  raceId      Int
  race        Race      @relation(fields: [raceId], references: [id])
  name        String
  cost        Int
  ma          Int       // Movement Allowance
  st          Int       // Strength
  ag          Int       // Agility
  pa          Int?      // Passing Ability
  av          Int       // Armour Value
  maxCount    Int
  skills      PositionSkill[]
  updatedAt   DateTime  @updatedAt
  scrapedAt   DateTime
}

model Skill {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  category    String    // General, Agility, Passing, Strength, Mutation, Trait
  description String
  positions   PositionSkill[]
  updatedAt   DateTime  @updatedAt
  scrapedAt   DateTime
}

model PositionSkill {
  positionId  Int
  skillId     Int
  position    Position  @relation(fields: [positionId], references: [id])
  skill       Skill     @relation(fields: [skillId], references: [id])
  @@id([positionId, skillId])
}

// Torneos
model Tournament {
  id            Int       @id @default(autoincrement())
  name          String
  edition       String
  year          Int
  startDate     DateTime
  endDate       DateTime?
  description   String?
  status        TournamentStatus @default(DRAFT)
  format        TournamentFormat @default(MIXED)
  groupCount    Int?      // Para formato MIXED o GROUP_STAGE
  qualifiersPerGroup Int? // Clasificados por grupo que pasan a eliminatoria
  participants  Participant[]
  rounds        Round[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([name, year])
}

enum TournamentStatus {
  DRAFT
  ACTIVE
  COMPLETED
}

enum TournamentFormat {
  MIXED           // Fase de Grupos + Eliminatoria
  SINGLE_ELIMINATION
  ROUND_ROBIN
}

// Jugadores
model Player {
  id           Int       @id @default(autoincrement())
  name         String
  alias        String?
  email        String?
  phone        String?
  participants Participant[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

// Participación de un jugador en un torneo
model Participant {
  id           Int       @id @default(autoincrement())
  playerId     Int
  tournamentId Int
  player       Player    @relation(fields: [playerId], references: [id])
  tournament   Tournament @relation(fields: [tournamentId], references: [id])
  raceId       Int
  race         Race      @relation(fields: [raceId], references: [id])
  teamName     String?
  groupNumber  Int?      // Grupo asignado en Fase de Grupos
  roster       RosterEntry[]
  rosterHistory RosterHistory[]
  homeMatches  Match[]   @relation("HomeParticipant")
  awayMatches  Match[]   @relation("AwayParticipant")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@unique([playerId, tournamentId])
}

// Jugadores de la alineación
model RosterEntry {
  id            Int       @id @default(autoincrement())
  participantId Int
  participant   Participant @relation(fields: [participantId], references: [id])
  positionId    Int
  position      Position  @relation(fields: [positionId], references: [id])
  playerName    String?
  skills        RosterEntrySkill[]
  spp           Int       @default(0) // Star Player Points
  injuries      String?
}

model RosterEntrySkill {
  rosterEntryId Int
  skillId       Int
  rosterEntry   RosterEntry @relation(fields: [rosterEntryId], references: [id])
  skill         Skill       @relation(fields: [skillId], references: [id])
  @@id([rosterEntryId, skillId])
}

model RosterHistory {
  id            Int       @id @default(autoincrement())
  participantId Int
  participant   Participant @relation(fields: [participantId], references: [id])
  snapshot      Json      // Snapshot completo de la alineación en ese momento
  changedAt     DateTime  @default(now())
  reason        String?
}

// Rondas y partidos
model Round {
  id           Int       @id @default(autoincrement())
  tournamentId Int
  tournament   Tournament @relation(fields: [tournamentId], references: [id])
  number       Int
  phase        RoundPhase
  matches      Match[]
  createdAt    DateTime  @default(now())
}

enum RoundPhase {
  GROUP_STAGE
  ELIMINATION
}

model Match {
  id              Int       @id @default(autoincrement())
  roundId         Int
  round           Round     @relation(fields: [roundId], references: [id])
  homeParticipantId Int?
  awayParticipantId Int?
  homeParticipant Participant? @relation("HomeParticipant", fields: [homeParticipantId], references: [id])
  awayParticipant Participant? @relation("AwayParticipant", fields: [awayParticipantId], references: [id])
  homeTDs         Int?
  awayTDs         Int?
  status          MatchStatus @default(PENDING)
  winnerId        Int?      // participantId del ganador (null en empate)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum MatchStatus {
  PENDING
  COMPLETED
}
```

### Modelo de Clasificación (calculado, no persistido)

```typescript
interface StandingsEntry {
  participantId: number;
  playerName: string;
  teamName: string;
  raceName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;       // wins*3 + draws*1
  tdFor: number;
  tdAgainst: number;
  tdDiff: number;
  groupNumber?: number; // Para fase de grupos
}
```

---

## Algoritmos Clave

### Generación de Brackets

#### Fase de Grupos (Round-Robin)

Para N jugadores divididos en G grupos:
1. Distribuir jugadores en grupos de forma equitativa (round-robin o aleatoria).
2. Para cada grupo de tamaño K, generar K*(K-1)/2 partidos (todos contra todos).
3. Crear una ronda por cada jornada usando el algoritmo de rotación circular.

```
Algoritmo de rotación circular para K jugadores:
- Fijar jugador 0, rotar los demás K-1 posiciones en cada ronda
- Ronda i: emparejar posición j con posición (K-1-j) para j=0..K/2-1
- Total de rondas = K-1 (o K si K es impar, con bye)
```

#### Fase Eliminatoria

1. Tomar los Q clasificados de cada grupo (ordenados por puntos, luego diferencia de TDs).
2. Generar el árbol de eliminación directa con 2^⌈log2(total_clasificados)⌉ posiciones.
3. Sembrar el bracket cruzando grupos (1º grupo A vs último grupo B, etc.) para evitar que jugadores del mismo grupo se enfrenten en semifinales.
4. Generar byes automáticos si el número de clasificados no es potencia de 2.

```typescript
function generateEliminationBracket(qualifiers: Participant[]): Match[] {
  const size = nextPowerOf2(qualifiers.length);
  const seeded = seedBracket(qualifiers); // cruza grupos
  const matches: Match[] = [];
  for (let i = 0; i < size / 2; i++) {
    matches.push({
      home: seeded[i] ?? null,  // null = bye
      away: seeded[size - 1 - i] ?? null,
    });
  }
  return matches;
}
```

### Cálculo de Clasificaciones

```typescript
function calculateStandings(matches: Match[], participants: Participant[]): StandingsEntry[] {
  // Inicializar entradas con ceros
  // Para cada partido COMPLETED: sumar TDs, calcular puntos (W=3, D=1, L=0)
  // Ordenar: puntos DESC, tdDiff DESC, tdFor DESC
}
```

### Avance Automático en Eliminatoria

Cuando todos los partidos de una ronda eliminatoria están `COMPLETED`:
1. Recoger los `winnerId` de cada partido.
2. Crear los partidos de la siguiente ronda emparejando ganadores consecutivos.
3. Si solo queda un partido completado → el ganador es el campeón del torneo.

---

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquinas.*

### Property 1: Parsing de datos de referencia extrae campos requeridos

*Para cualquier* documento HTML válido con el formato de las fuentes externas (nufflezone.com o nuflheim), el parser del scraper debe extraer todos los campos requeridos (nombre, estadísticas, coste/categoría) sin valores nulos para los campos obligatorios.

**Validates: Requirements 6.2, 6.3, 6.4**

---

### Property 2: Round-trip de persistencia de datos de referencia

*Para cualquier* conjunto de datos de referencia (razas, habilidades, posiciones) generado aleatoriamente, persistirlos en la base de datos y recuperarlos debe producir un conjunto equivalente al original.

**Validates: Requirements 6.5, 6.8**

---

### Property 3: Resiliencia del scraper ante fallos parciales

*Para cualquier* lista de elementos a scrapear donde un subconjunto falla, los elementos que no fallan deben procesarse y persistirse correctamente, y el número de errores registrados debe ser igual al número de elementos fallidos.

**Validates: Requirements 6.7**

---

### Property 4: Bloqueo de creación sin datos de referencia

*Para cualquier* intento de crear un torneo o registrar una alineación cuando la base de datos no contiene datos de referencia, el sistema debe rechazar la operación con un mensaje de error apropiado.

**Validates: Requirements 6.11**

---

### Property 5: Unicidad de identificadores de torneo

*Para cualquier* conjunto de torneos creados con distintos nombres o años, todos deben tener identificadores únicos; y para cualquier par de torneos con el mismo nombre y año, el segundo intento de creación debe ser rechazado.

**Validates: Requirements 1.3, 1.8**

---

### Property 6: Ordenación de torneos por fecha descendente

*Para cualquier* conjunto de torneos con distintas fechas de inicio, la lista devuelta por el sistema debe estar ordenada de forma que para todo par de torneos adyacentes en la lista, la fecha del primero sea mayor o igual que la del segundo.

**Validates: Requirements 1.6**

---

### Property 7: Round-trip de actualización de torneo

*Para cualquier* torneo existente y cualquier actualización válida de sus campos (nombre, edición, año, fechas, configuración de grupos), leer el torneo después de la actualización debe devolver los valores actualizados.

**Validates: Requirements 1.4, 1.10**

---

### Property 8: Control de estado para registro de resultados

*Para cualquier* partido en un torneo con estado distinto de `ACTIVE`, el intento de registrar un resultado debe ser rechazado; y para cualquier partido en un torneo `ACTIVE`, el registro debe ser aceptado.

**Validates: Requirements 1.7**

---

### Property 9: Participación múltiple de jugadores

*Para cualquier* jugador y cualquier conjunto de torneos distintos, el jugador puede ser inscrito en cada torneo con razas y alineaciones independientes, y todas las inscripciones deben persistir y ser recuperables de forma independiente.

**Validates: Requirements 2.2, 2.3, 2.4**

---

### Property 10: Validación de alineación contra datos de referencia

*Para cualquier* alineación que contenga al menos una posición no válida para la raza seleccionada según los datos de referencia, el sistema debe rechazar el registro de esa alineación.

**Validates: Requirements 2.5**

---

### Property 11: Historial de cambios de alineación

*Para cualquier* alineación actualizada en un torneo activo, el historial debe contener al menos una entrada con un timestamp posterior al momento anterior a la actualización.

**Validates: Requirements 2.6**

---

### Property 12: Perfil de jugador contiene historial completo

*Para cualquier* jugador con N participaciones en torneos, el endpoint de perfil debe devolver exactamente N entradas de historial, cada una con torneo, raza y resultados.

**Validates: Requirements 2.8**

---

### Property 13: Validez del bracket generado

*Para cualquier* lista de N jugadores inscritos en un torneo, el bracket generado debe cumplir: (a) cada jugador aparece exactamente una vez en la primera ronda, (b) no hay dos partidos en la misma ronda con el mismo jugador, (c) el número de partidos en la primera ronda es ⌊N/2⌋.

**Validates: Requirements 3.1**

---

### Property 14: Avance de ganador y generación de siguiente ronda

*Para cualquier* ronda donde todos los partidos están completados, el sistema debe: (a) asignar el ganador correcto a cada partido según los TDs registrados, (b) generar automáticamente los partidos de la siguiente ronda con los ganadores como participantes.

**Validates: Requirements 3.3, 3.4**

---

### Property 15: Bracket mixto — clasificados correctos pasan a eliminatoria

*Para cualquier* torneo con formato mixto donde la fase de grupos está completada, los participantes del bracket eliminatorio deben ser exactamente los Q mejores clasificados de cada grupo según la clasificación de la fase de grupos.

**Validates: Requirements 3.5**

---

### Property 16: Acceso sin autenticación a todos los endpoints

*Para cualquier* endpoint de la API (lectura y escritura), una petición sin cabeceras de autenticación debe recibir una respuesta con código HTTP distinto de 401 y 403.

**Validates: Requirements 4.1, 4.2**

---

### Property 17: Consistencia de clasificaciones con resultados

*Para cualquier* conjunto de resultados de partidos registrados en un torneo, la clasificación calculada debe ser consistente: los puntos de cada participante deben ser exactamente 3×victorias + 1×empates, y la diferencia de TDs debe ser la suma de (TDs_a_favor - TDs_en_contra) de todos sus partidos.

**Validates: Requirements 5.1, 5.2, 5.4**

---

### Property 18: Ranking global es agregación correcta

*Para cualquier* jugador con participaciones en múltiples torneos, sus estadísticas globales deben ser la suma exacta de sus estadísticas individuales en cada torneo.

**Validates: Requirements 5.3, 5.5**

---

## Manejo de Errores

### Estrategia General

| Situación | Comportamiento |
|---|---|
| Recurso no encontrado (torneo, jugador, partido) | HTTP 404 con mensaje descriptivo |
| Datos de entrada inválidos | HTTP 400 con detalle de campos inválidos |
| Conflicto de unicidad (torneo duplicado) | HTTP 409 con mensaje de conflicto |
| Error interno del servidor | HTTP 500 con mensaje genérico (sin exponer detalles internos) |
| Datos de referencia no disponibles | HTTP 503 con mensaje indicando ejecutar el scraper |

### Scraper — Manejo de Errores

- Cada elemento se procesa en un bloque try/catch independiente.
- Los errores se acumulan en un array y se muestran en el resumen final.
- Si una fuente completa no está disponible (timeout, 404), se registra el error y se conservan los datos previos (no se ejecuta DELETE/TRUNCATE antes de confirmar la descarga).
- El scraper usa transacciones de base de datos: si la persistencia falla a mitad, se hace rollback para no dejar datos parciales.

### Validación de Alineaciones

- Antes de persistir una alineación, se verifica contra los datos de referencia:
  - Cada posición debe pertenecer a la raza del participante.
  - El número de jugadores por posición no supera `maxCount`.
  - El coste total no supera el límite configurado (si aplica).
- Los errores de validación devuelven HTTP 422 con la lista de infracciones.

---

## Estrategia de Testing

### Enfoque Dual

Se utilizan dos tipos de tests complementarios:

**Tests unitarios / de integración**: verifican ejemplos concretos, casos límite y condiciones de error.
**Tests de propiedades (property-based testing)**: verifican propiedades universales sobre rangos amplios de entradas generadas aleatoriamente.

### Librería de Property-Based Testing

Para TypeScript/Node.js se utilizará **fast-check** (`npm install --save-dev fast-check`).

Cada test de propiedad debe ejecutarse con un mínimo de **100 iteraciones**.

El formato de etiqueta para cada test es:
```
Feature: bloodbowl-tournament-web, Property {N}: {texto de la propiedad}
```

### Tests Unitarios — Casos Clave

- Creación de torneo con campos válidos e inválidos.
- Inscripción de jugador con alineación válida e inválida.
- Registro de resultado en torneo activo vs. no activo.
- Generación de bracket para 4, 8 y 6 jugadores (con bye).
- Cálculo de clasificación con resultados conocidos.
- Endpoint de perfil de jugador con historial.
- Respuesta 404 para torneo/jugador inexistente.
- Respuesta 409 para torneo duplicado (mismo nombre y año).
- Respuesta 503 cuando no hay datos de referencia.

### Tests de Propiedades — Implementación

Cada propiedad del documento se implementa como un único test de propiedad:

```typescript
// Feature: bloodbowl-tournament-web, Property 5: Unicidad de identificadores de torneo
test('tournaments have unique IDs', () => {
  fc.assert(fc.asyncProperty(
    fc.array(validTournamentArb, { minLength: 2, maxLength: 10 }),
    async (tournaments) => {
      const created = await Promise.all(tournaments.map(createTournament));
      const ids = created.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  ), { numRuns: 100 });
});
```

```typescript
// Feature: bloodbowl-tournament-web, Property 17: Consistencia de clasificaciones
test('standings are consistent with match results', () => {
  fc.assert(fc.asyncProperty(
    tournamentWithMatchesArb,
    async ({ tournament, matches }) => {
      const standings = await getStandings(tournament.id);
      for (const entry of standings) {
        const expectedPoints = entry.wins * 3 + entry.draws * 1;
        expect(entry.points).toBe(expectedPoints);
        expect(entry.tdDiff).toBe(entry.tdFor - entry.tdAgainst);
      }
    }
  ), { numRuns: 100 });
});
```

### Cobertura Objetivo

| Área | Tipo de test | Prioridad |
|---|---|---|
| Scraper — parsing HTML | Property (fast-check) | Alta |
| Scraper — persistencia | Property (fast-check) | Alta |
| Generación de brackets | Property (fast-check) | Alta |
| Cálculo de clasificaciones | Property (fast-check) | Alta |
| Validación de alineaciones | Property (fast-check) | Alta |
| API endpoints — acceso público | Property (fast-check) | Media |
| API endpoints — CRUD básico | Unit/Integration | Media |
| Casos de error (404, 409, 503) | Unit | Media |
| Visualización de brackets | Manual / E2E | Baja |
| Responsive design | Manual | Baja |
