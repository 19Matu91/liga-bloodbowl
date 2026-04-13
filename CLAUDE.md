# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto del Proyecto

Plataforma web de gestión de torneos de Blood Bowl para "El Dragón de Madera" (asociación sin ánimo de lucro). Sin autenticación — cualquier visitante puede leer y escribir datos. Monorepo TypeScript con backend Express + frontend React/Vite + PostgreSQL vía Prisma.

## Comandos Principales

```bash
# Instalar dependencias (raíz del monorepo)
npm install

# Base de datos
npm run prisma:generate      # Generar cliente Prisma tras cambiar schema
npm run prisma:migrate       # Aplicar migraciones

# Scraper (Fase 0 — debe ejecutarse antes del primer uso)
npm run scraper              # Extrae razas, posiciones y habilidades desde nufflezone.com

# Desarrollo
npm run dev:backend          # Backend en http://localhost:3001 (hot reload con Nodemon)
npm run dev:frontend         # Frontend en http://localhost:5173 (Vite, proxied /api → :3001)

# Producción
npm run build:frontend       # Genera frontend/dist/
```

## Arquitectura

```
liga-bloodbowl/
├── prisma/schema.prisma      # Esquema PostgreSQL (fuente de verdad del modelo de datos)
├── scripts/scraper.ts        # Script standalone Fase 0 (Axios + Cheerio)
├── backend/src/
│   ├── server.ts             # Punto de entrada Express
│   ├── routes/               # tournaments, players, matches, participants, reference, stats
│   ├── lib/
│   │   ├── prisma.ts         # Singleton Prisma client
│   │   ├── bracket.ts        # Generación de brackets (grupos + eliminatoria)
│   │   ├── standings.ts      # Cálculo de clasificaciones (W=3, D=1, L=0)
│   │   └── validation.ts     # Validación de alineaciones contra datos de referencia
│   └── types/index.ts
└── frontend/src/
    ├── App.tsx               # React Router — rutas principales
    ├── api/client.ts         # Cliente fetch tipado para todos los endpoints
    ├── pages/                # Home, TournamentList/Detail/New, PlayerList/Detail/New, Stats
    ├── components/bracket/   # BracketView, GroupStageTable, EliminationBracket
    └── types/index.ts
```

## Flujo de Datos Clave

1. **Fase 0 (prerequisito):** `npm run scraper` → UPSERT en PostgreSQL (Race, Position, Skill). Sin estos datos, la API devuelve HTTP 503 al intentar crear torneos o registrar alineaciones.
2. **Formatos de torneo:** `MIXED` (grupos round-robin + eliminatoria), `SINGLE_ELIMINATION`, `ROUND_ROBIN`.
3. **Bracket mixto:** primero `POST /api/tournaments/:id/generate-bracket` (fase grupos), luego cuando termina `POST /api/tournaments/:id/generate-elimination` (fase eliminatoria con clasificados cruzando grupos).
4. **Clasificación:** calculada en tiempo real por `standings.ts`, no persiste en BD — se recalcula en cada petición.
5. **Despliegue previsto:** Nginx como reverse proxy (/* → frontend/dist estáticos, /api/* → Node.js:3001) gestionado con PM2.

## Modelo de Datos (esquema resumido)

- `Race` → `Position[]` → `Skill[]` (datos de referencia del scraper)
- `Tournament` (status: DRAFT/ACTIVE/COMPLETED, format: MIXED/SINGLE_ELIMINATION/ROUND_ROBIN) → `Round[]` → `Match[]`
- `Player` → `Participant[]` (una entrada por torneo, con `raceId`, `groupNumber`, `roster`)
- `Participant` → `RosterEntry[]` + `RosterHistory[]` (historial con snapshots JSON)
- `Match`: `homeTDs`, `awayTDs`, `status` (PENDING/COMPLETED), `winnerId`
- Restricción única: `Tournament(name, year)` y `Participant(playerId, tournamentId)`

## API REST — Endpoints Relevantes

| Método | Ruta | Notas |
|---|---|---|
| POST | `/api/tournaments/:id/generate-bracket` | Genera fase de grupos |
| POST | `/api/tournaments/:id/generate-elimination` | Genera bracket eliminatorio |
| GET | `/api/tournaments/:id/standings` | Clasificación calculada al vuelo |
| POST | `/api/matches/:id/result` | Solo si torneo está ACTIVE |
| PUT | `/api/participants/:id/roster` | Guarda historial en RosterHistory |
| GET | `/api/reference/races` | Datos de referencia poblados por el scraper |
| GET | `/api/stats/global` | Ranking histórico agregado de todos los torneos |

## Testing

No hay tests implementados aún. El plan prevé **fast-check** (property-based testing) para 18 propiedades definidas en `.kiro/specs/bloodbowl-tournament-web/design.md`. Las propiedades cubren: parsing del scraper, generación de brackets, cálculo de clasificaciones y validación de alineaciones. El formato de etiqueta es:
```
Feature: bloodbowl-tournament-web, Property {N}: {texto}
```

## Variables de Entorno

```
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/bloodbowl"
PORT=3001   # opcional, default 3001
```
