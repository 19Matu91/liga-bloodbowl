# Plan de Implementación: bloodbowl-tournament-web

## Visión General

Implementación en tres fases ordenadas: primero el Scraper standalone con la base de datos (Fase 0), luego el backend API, y finalmente el frontend React/Vite. El lenguaje de implementación es **TypeScript** para backend y frontend, con **Node.js** para el scraper.

## Tareas

- [x] 1. Configuración inicial del monorepo y base de datos
  - Inicializar el repositorio con la estructura de carpetas: `prisma/`, `scripts/`, `frontend/`, `backend/`
  - Crear `package.json` raíz con workspaces para `frontend` y `backend`
  - Crear el archivo `.env` con la variable `DATABASE_URL` apuntando a PostgreSQL local
  - Instalar dependencias raíz: `prisma`, `typescript`, `ts-node`
  - Crear `prisma/schema.prisma` con el esquema completo (modelos Race, Position, Skill, PositionSkill, Tournament, Player, Participant, RosterEntry, RosterEntrySkill, RosterHistory, Round, Match y todos los enums)
  - Ejecutar `npx prisma migrate dev --name init` para crear la base de datos
  - _Requisitos: 1.1, 1.2, 1.3, 2.1, 6.5_

- [x] 2. Scraper standalone (Fase 0)
  - [x] 2.1 Implementar el parser de razas y posiciones desde nufflezone.com
    - Crear `scripts/scraper.ts` con función `scrapeRaces()` que hace HTTP GET a `https://nufflezone.com/creador-equipo-blood-bowl/`
    - Parsear el HTML para extraer nombre de raza, posiciones con estadísticas (MA, ST, AG, PA, AV), coste y maxCount
    - Devolver array tipado de razas con sus posiciones
    - _Requisitos: 6.1, 6.2_

  - [ ]* 2.2 Escribir test de propiedad para el parser de razas
    - **Propiedad 1: Parsing de datos de referencia extrae campos requeridos**
    - **Valida: Requisitos 6.2, 6.3, 6.4**

  - [x] 2.3 Implementar el parser de habilidades desde nufflezone.com
    - Añadir función `scrapeSkills()` en `scripts/scraper.ts`
    - Parsear habilidades con nombre, categoría (General, Agility, Passing, Strength, Mutation, Trait) y descripción
    - _Requisitos: 6.3_

  - [x] 2.4 Implementar el parser de fichas desde nuflheim
    - Añadir función `scrapeRosters()` que hace HTTP GET a `https://jonasbusk.github.io/nuflheim/`
    - Parsear fichas detalladas con estadísticas, habilidades iniciales y mejoras disponibles por posición
    - _Requisitos: 6.4_

  - [x] 2.5 Implementar la persistencia de datos de referencia en PostgreSQL
    - Añadir función `persistReferenceData(races, skills)` que usa Prisma para hacer UPSERT de razas, posiciones y habilidades
    - Usar transacciones de base de datos para garantizar atomicidad (rollback si falla a mitad)
    - Almacenar `scrapedAt` con la fecha actual en cada registro
    - _Requisitos: 6.5, 6.8_

  - [ ]* 2.6 Escribir test de propiedad para round-trip de persistencia
    - **Propiedad 2: Round-trip de persistencia de datos de referencia**
    - **Valida: Requisitos 6.5, 6.8**

  - [x] 2.7 Implementar manejo de errores y resumen del scraper
    - Envolver cada elemento en try/catch independiente, acumular errores en array
    - Si una fuente completa no está disponible (timeout, 404), registrar error y conservar datos previos
    - Mostrar resumen final: elementos importados, actualizados y errores
    - _Requisitos: 6.6, 6.7, 6.9_

  - [ ]* 2.8 Escribir test de propiedad para resiliencia ante fallos parciales
    - **Propiedad 3: Resiliencia del scraper ante fallos parciales**
    - **Valida: Requisitos 6.7**

  - [x] 2.9 Punto de entrada ejecutable del scraper
    - Añadir función `main()` que orquesta scrapeRaces, scrapeSkills, scrapeRosters, persistReferenceData y muestra el resumen
    - Compilar a `scripts/scraper.js` ejecutable con `node scripts/scraper.js`
    - _Requisitos: 6.1, 6.6_

- [x] 3. Checkpoint — Verificar Fase 0
  - Ejecutar `node scripts/scraper.js` y confirmar que la base de datos contiene razas, posiciones y habilidades
  - Asegurarse de que todos los tests pasan. Preguntar al usuario si hay dudas.

- [ ] 4. Backend — Configuración del servidor y estructura base
  - Inicializar `backend/package.json` con dependencias: `express`, `@types/express`, `typescript`, `ts-node`, `prisma` (client), `fast-check` (dev)
  - Crear `backend/src/lib/prisma.ts` con el cliente Prisma singleton
  - Crear `backend/src/server.ts` con Express, middleware JSON, y montaje de rutas bajo `/api`
  - Crear `backend/src/types/index.ts` con los tipos TypeScript compartidos (StandingsEntry, etc.)
  - _Requisitos: 4.1, 4.2, 4.3_

- [ ] 5. Backend — Rutas de datos de referencia y bloqueo sin datos
  - [ ] 5.1 Implementar endpoints de referencia
    - Crear `backend/src/routes/reference.ts` con `GET /api/reference/races` y `GET /api/reference/skills`
    - Devolver los datos de referencia almacenados en la base de datos
    - _Requisitos: 6.10_

  - [ ] 5.2 Implementar middleware de verificación de datos de referencia
    - Crear función `requireReferenceData` que comprueba si existen razas en la base de datos
    - Devolver HTTP 503 con mensaje indicando ejecutar el scraper si no hay datos
    - Aplicar el middleware a los endpoints de creación de torneos y registro de alineaciones
    - _Requisitos: 6.11_

  - [ ]* 5.3 Escribir test de propiedad para bloqueo sin datos de referencia
    - **Propiedad 4: Bloqueo de creación sin datos de referencia**
    - **Valida: Requisitos 6.11**

- [ ] 6. Backend — CRUD de torneos
  - [ ] 6.1 Implementar endpoints de torneos
    - Crear `backend/src/routes/tournaments.ts` con `GET /api/tournaments`, `POST /api/tournaments`, `GET /api/tournaments/:id`, `PUT /api/tournaments/:id`, `DELETE /api/tournaments/:id`
    - `GET /api/tournaments` devuelve lista ordenada por `startDate` descendente
    - `POST /api/tournaments` valida campos requeridos y devuelve 409 si nombre+año ya existe
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_

  - [ ]* 6.2 Escribir test de propiedad para unicidad de identificadores
    - **Propiedad 5: Unicidad de identificadores de torneo**
    - **Valida: Requisitos 1.3, 1.8**

  - [ ]* 6.3 Escribir test de propiedad para ordenación por fecha
    - **Propiedad 6: Ordenación de torneos por fecha descendente**
    - **Valida: Requisitos 1.6**

  - [ ]* 6.4 Escribir test de propiedad para round-trip de actualización
    - **Propiedad 7: Round-trip de actualización de torneo**
    - **Valida: Requisitos 1.4, 1.10**

  - [ ] 6.5 Implementar control de estado para registro de resultados
    - Añadir validación en `POST /api/matches/:id/result` que rechaza si el torneo no está en estado `ACTIVE`
    - Devolver HTTP 400 con mensaje descriptivo
    - _Requisitos: 1.7_

  - [ ]* 6.6 Escribir test de propiedad para control de estado
    - **Propiedad 8: Control de estado para registro de resultados**
    - **Valida: Requisitos 1.7**

- [ ] 7. Backend — CRUD de jugadores y participantes
  - [ ] 7.1 Implementar endpoints de jugadores
    - Crear `backend/src/routes/players.ts` con `GET /api/players`, `POST /api/players`, `GET /api/players/:id`
    - `GET /api/players/:id` devuelve el perfil con historial de participaciones (torneos, razas, resultados)
    - _Requisitos: 2.1, 2.7, 2.8_

  - [ ]* 7.2 Escribir test de propiedad para perfil con historial completo
    - **Propiedad 12: Perfil de jugador contiene historial completo**
    - **Valida: Requisitos 2.8**

  - [ ] 7.3 Implementar endpoints de participantes y alineaciones
    - Crear `backend/src/routes/matches.ts` (parcial) y ampliar `tournaments.ts` con `POST /api/tournaments/:id/participants` y `PUT /api/participants/:id/roster`
    - `POST /api/tournaments/:id/participants` inscribe un jugador con raza y nombre de equipo
    - `PUT /api/participants/:id/roster` actualiza la alineación y registra historial con timestamp
    - _Requisitos: 2.2, 2.3, 2.4, 2.6_

  - [ ]* 7.4 Escribir test de propiedad para participación múltiple
    - **Propiedad 9: Participación múltiple de jugadores**
    - **Valida: Requisitos 2.2, 2.3, 2.4**

  - [ ] 7.5 Implementar validación de alineación contra datos de referencia
    - Crear `backend/src/lib/validation.ts` con función `validateRoster(roster, raceId)`
    - Verificar que cada posición pertenece a la raza, que no supera maxCount y que el coste total es válido
    - Devolver HTTP 422 con lista de infracciones si la validación falla
    - _Requisitos: 2.5_

  - [ ]* 7.6 Escribir test de propiedad para validación de alineación
    - **Propiedad 10: Validación de alineación contra datos de referencia**
    - **Valida: Requisitos 2.5**

  - [ ]* 7.7 Escribir test de propiedad para historial de cambios de alineación
    - **Propiedad 11: Historial de cambios de alineación**
    - **Valida: Requisitos 2.6**

- [ ] 8. Backend — Generación de brackets y lógica de rondas
  - [ ] 8.1 Implementar generación de bracket round-robin (Fase de Grupos)
    - Crear `backend/src/lib/bracket.ts` con función `generateGroupStage(participants, groupCount)`
    - Distribuir jugadores en grupos y generar partidos usando el algoritmo de rotación circular
    - Crear rondas y partidos en la base de datos
    - _Requisitos: 3.1, 1.9_

  - [ ]* 8.2 Escribir test de propiedad para validez del bracket generado
    - **Propiedad 13: Validez del bracket generado**
    - **Valida: Requisitos 3.1**

  - [ ] 8.3 Implementar generación de bracket eliminatorio
    - Añadir función `generateEliminationBracket(qualifiers)` en `bracket.ts`
    - Calcular `nextPowerOf2`, sembrar el bracket cruzando grupos, generar byes automáticos
    - _Requisitos: 3.1, 3.5, 1.9, 1.10_

  - [ ] 8.4 Implementar endpoint de generación de bracket
    - Añadir `POST /api/tournaments/:id/generate-bracket` en `tournaments.ts`
    - Orquestar la generación según el formato del torneo (MIXED, SINGLE_ELIMINATION, ROUND_ROBIN)
    - _Requisitos: 3.1, 1.11_

  - [ ] 8.5 Implementar registro de resultados y avance automático
    - Completar `backend/src/routes/matches.ts` con `POST /api/matches/:id/result`
    - Actualizar `homeTDs`, `awayTDs`, `status = COMPLETED` y `winnerId`
    - Cuando todos los partidos de una ronda están completados, generar automáticamente la siguiente ronda
    - _Requisitos: 3.3, 3.4_

  - [ ]* 8.6 Escribir test de propiedad para avance de ganador
    - **Propiedad 14: Avance de ganador y generación de siguiente ronda**
    - **Valida: Requisitos 3.3, 3.4**

  - [ ]* 8.7 Escribir test de propiedad para clasificados correctos en bracket mixto
    - **Propiedad 15: Bracket mixto — clasificados correctos pasan a eliminatoria**
    - **Valida: Requisitos 3.5**

  - [ ] 8.8 Implementar endpoints de bracket y clasificación
    - Añadir `GET /api/tournaments/:id/bracket` y `GET /api/tournaments/:id/standings`
    - _Requisitos: 3.2, 3.7_

- [ ] 9. Backend — Cálculo de clasificaciones y estadísticas
  - [ ] 9.1 Implementar cálculo de clasificaciones
    - Crear `backend/src/lib/standings.ts` con función `calculateStandings(matches, participants)`
    - Calcular puntos (W=3, D=1, L=0), tdFor, tdAgainst, tdDiff
    - Ordenar por puntos DESC, tdDiff DESC, tdFor DESC
    - _Requisitos: 5.1, 5.2, 5.4_

  - [ ]* 9.2 Escribir test de propiedad para consistencia de clasificaciones
    - **Propiedad 17: Consistencia de clasificaciones con resultados**
    - **Valida: Requisitos 5.1, 5.2, 5.4**

  - [ ] 9.3 Implementar endpoints de estadísticas globales
    - Añadir `GET /api/stats/global` y `GET /api/stats/factions`
    - `GET /api/stats/global` agrega resultados de todos los torneos por jugador
    - `GET /api/stats/factions` agrega estadísticas por raza a lo largo de todos los torneos
    - _Requisitos: 5.3, 5.5_

  - [ ]* 9.4 Escribir test de propiedad para ranking global
    - **Propiedad 18: Ranking global es agregación correcta**
    - **Valida: Requisitos 5.3, 5.5**

- [ ] 10. Backend — Acceso público y manejo de errores
  - [ ]* 10.1 Escribir test de propiedad para acceso sin autenticación
    - **Propiedad 16: Acceso sin autenticación a todos los endpoints**
    - **Valida: Requisitos 4.1, 4.2**

  - [ ] 10.2 Implementar manejo de errores global
    - Añadir middleware de error en `server.ts` que devuelve 404, 409, 422, 503 y 500 con mensajes descriptivos
    - Verificar que ningún error expone detalles internos del servidor
    - _Requisitos: 4.6, 3.6_

- [ ] 11. Checkpoint — Verificar backend completo
  - Asegurarse de que todos los tests del backend pasan. Preguntar al usuario si hay dudas antes de continuar con el frontend.

- [ ] 12. Frontend — Configuración de Vite y estructura base
  - Inicializar `frontend/` con Vite + React + TypeScript: `npm create vite@latest frontend -- --template react-ts`
  - Instalar dependencias: `tailwindcss`, `react-router-dom`, `@types/react-router-dom`
  - Configurar Tailwind CSS en `frontend/vite.config.ts` y `frontend/tailwind.config.js`
  - Crear `frontend/src/api/client.ts` con funciones fetch tipadas para cada endpoint del backend
  - Crear `frontend/src/types/index.ts` con los tipos TypeScript compartidos (Tournament, Player, Match, StandingsEntry, etc.)
  - _Requisitos: 4.5, 7.5_

- [ ] 13. Frontend — Páginas de torneos
  - [ ] 13.1 Implementar página de inicio y lista de torneos
    - Crear `frontend/src/pages/Home.tsx` con torneos activos y próximos torneos
    - Crear `frontend/src/pages/TournamentList.tsx` con lista ordenada por fecha descendente
    - Crear `frontend/src/App.tsx` con React Router y rutas principales
    - _Requisitos: 4.4, 7.1, 1.6_

  - [ ] 13.2 Implementar formulario de creación y edición de torneo
    - Crear `frontend/src/pages/TournamentNew.tsx` con formulario (nombre, edición, año, fechas, formato, grupos)
    - Incluir confirmación explícita antes de eliminar un torneo
    - _Requisitos: 1.1, 1.5, 1.9, 1.10, 1.11_

  - [ ] 13.3 Implementar página de detalle de torneo
    - Crear `frontend/src/pages/TournamentDetail.tsx` que muestra bracket, clasificación y lista de participantes
    - Para formato mixto: mostrar clasificación de Fase de Grupos y bracket eliminatorio en la misma página
    - _Requisitos: 3.2, 7.2, 7.3_

- [ ] 14. Frontend — Visualización gráfica de brackets
  - [ ] 14.1 Implementar componente de tabla de fase de grupos
    - Crear `frontend/src/components/bracket/GroupStageTable.tsx` con tabla de clasificación por grupo
    - Mostrar puntos, victorias, empates, derrotas, TDs a favor/en contra y diferencia
    - _Requisitos: 3.5, 5.1, 5.2_

  - [ ] 14.2 Implementar componente de bracket eliminatorio
    - Crear `frontend/src/components/bracket/EliminationBracket.tsx` con representación gráfica SVG o React Flow
    - Mostrar rondas, emparejamientos y resultados de forma visual
    - _Requisitos: 3.2, 3.8, 7.2_

  - [ ] 14.3 Implementar componente BracketView que orquesta ambas vistas
    - Crear `frontend/src/components/bracket/BracketView.tsx` que decide qué componente mostrar según el formato del torneo
    - _Requisitos: 3.2, 7.3_

- [ ] 15. Frontend — Páginas de jugadores y estadísticas
  - [ ] 15.1 Implementar lista y formulario de jugadores
    - Crear `frontend/src/pages/PlayerList.tsx` y `frontend/src/pages/PlayerNew.tsx`
    - _Requisitos: 2.1, 4.1_

  - [ ] 15.2 Implementar perfil de jugador
    - Crear `frontend/src/pages/PlayerDetail.tsx` con historial de torneos, equipos y resultados
    - _Requisitos: 2.8, 7.4_

  - [ ] 15.3 Implementar inscripción de jugador en torneo y gestión de alineación
    - Añadir formulario de inscripción en `TournamentDetail.tsx` con selector de raza y nombre de equipo
    - Añadir formulario de alineación con validación en tiempo real contra datos de referencia
    - _Requisitos: 2.2, 2.3, 2.4, 2.5_

  - [ ] 15.4 Implementar página de estadísticas globales y por facción
    - Crear componentes para `GET /api/stats/global` y `GET /api/stats/factions`
    - _Requisitos: 5.3, 5.5, 7.4_

- [ ] 16. Frontend — Registro de resultados y responsive
  - [ ] 16.1 Implementar formulario de registro de resultado de partido
    - Añadir formulario inline en el bracket para registrar TDs de cada partido
    - Incluir confirmación explícita si el partido ya tiene resultado
    - _Requisitos: 3.3, 3.6, 1.7_

  - [ ] 16.2 Implementar página de error 404 y navegación
    - Crear componente de error 404 con enlace a la página de inicio
    - _Requisitos: 4.6, 7.6_

  - [ ] 16.3 Verificar diseño responsive con Tailwind
    - Revisar que todas las páginas son accesibles desde móvil
    - Ajustar breakpoints en componentes de bracket y tablas
    - _Requisitos: 4.5, 7.5_

- [ ] 17. Checkpoint final — Verificar integración completa
  - Asegurarse de que todos los tests pasan (backend + propiedades). Preguntar al usuario si hay dudas antes de dar por completada la implementación.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los checkpoints garantizan validación incremental entre fases
- Los tests de propiedades usan **fast-check** con mínimo 100 iteraciones por propiedad
- El scraper (Fase 0) debe ejecutarse antes de cualquier uso de la aplicación web
