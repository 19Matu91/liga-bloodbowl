# Documento de Requisitos

## Introducción

Web para gestionar y visualizar torneos de Blood Bowl organizados por "El Dragón de Madera", una asociación sin ánimo de lucro. La plataforma permite registrar múltiples torneos a lo largo del tiempo, gestionar jugadores con sus equipos y alineaciones, visualizar brackets de emparejamientos y obtener datos de referencia del juego mediante scraping de fuentes externas.

## Glosario

- **Sistema**: La aplicación web de gestión de torneos de Blood Bowl.
- **Torneo**: Competición de Blood Bowl organizada por El Dragón de Madera, identificada por nombre, año y edición.
- **Jugador**: Persona participante en uno o más torneos, con un perfil único en el sistema.
- **Equipo**: Facción de Blood Bowl (ej: Lizardmen, Humanos, Elfos) que un jugador utiliza en un torneo concreto.
- **Alineación**: Lista de jugadores (miniaturas) con sus estadísticas, habilidades y mejoras que componen el equipo de un jugador en un torneo específico.
- **Bracket**: Estructura de emparejamientos de un torneo que representa las rondas y resultados de los partidos.
- **Partido**: Enfrentamiento entre dos jugadores dentro de un torneo, con resultado registrado.
- **Ronda**: Conjunto de partidos que se disputan simultáneamente dentro de un torneo.
- **Visitante**: Cualquier persona que accede a la URL del proyecto y puede consultar y gestionar datos sin autenticación.
- **Scraper**: Componente del sistema que extrae datos de referencia del juego desde fuentes externas.
- **Fuente_Razas**: Sitio web https://nufflezone.com/creador-equipo-blood-bowl/ del que se extraen datos de razas, perfiles de jugadores y costes de equipo.
- **Fuente_Fichas**: Sitio web https://jonasbusk.github.io/nuflheim/ del que se extraen fichas de alineación detalladas.
- **Dato_de_Referencia**: Información canónica del juego (razas, estadísticas base, habilidades, reglas) obtenida mediante scraping.
- **Fase_de_Grupos**: Fase de un torneo en la que los jugadores se dividen en grupos y cada jugador se enfrenta a todos los demás del mismo grupo (round-robin).
- **Fase_Eliminatoria**: Fase de un torneo en la que los mejores clasificados de cada grupo se enfrentan en eliminación directa (semifinales y final).

---

## Requisitos

> **Nota de fases de implementación:** El Requisito 6 (Scraping de Datos de Referencia) es un **prerequisito** del resto de requisitos. El Scraper es un script independiente que se ejecuta en primer lugar para poblar la base de datos con los Datos_de_Referencia. El resto de la aplicación web consume únicamente los datos ya almacenados en la base de datos, sin acceder directamente a las fuentes externas durante el uso normal del sistema.

---

### Requisito 6: Scraping de Datos de Referencia *(Fase 0 — Prerequisito)*

**User Story:** Como organizador, quiero importar datos de referencia del juego desde fuentes externas antes de comenzar a usar la plataforma, para disponer de información actualizada sobre razas, habilidades y estadísticas sin introducirlos manualmente.

#### Criterios de Aceptación

1. THE Scraper SHALL ser un componente standalone ejecutable de forma independiente al servidor web, sin necesidad de que la aplicación web esté en funcionamiento.
2. THE Scraper SHALL extraer de la Fuente_Razas (https://nufflezone.com/creador-equipo-blood-bowl/) la lista de razas disponibles con sus estadísticas base, perfiles de jugadores (posiciones) y coste en puntos de equipo.
3. THE Scraper SHALL extraer de la Fuente_Razas la lista de habilidades disponibles con su descripción y categoría.
4. THE Scraper SHALL extraer de la Fuente_Fichas (https://jonasbusk.github.io/nuflheim/) las fichas de alineación detalladas con estadísticas, habilidades iniciales y mejoras disponibles por posición.
5. WHEN se ejecuta el Scraper, THE Scraper SHALL persistir todos los Datos_de_Referencia extraídos directamente en la base de datos del proyecto.
6. WHEN se ejecuta el Scraper, THE Scraper SHALL mostrar un resumen de los datos importados y los errores encontrados.
7. WHEN el scraping de un elemento falla, THE Scraper SHALL registrar el error con detalle suficiente para su diagnóstico y continuar con el resto de elementos.
8. THE Scraper SHALL almacenar los Datos_de_Referencia con la fecha de la última actualización.
9. IF la Fuente_Razas o la Fuente_Fichas no están disponibles durante el scraping, THEN THE Scraper SHALL notificar al usuario y conservar los datos previamente importados sin modificación.
10. THE Sistema SHALL permitir revisar y corregir manualmente los Datos_de_Referencia almacenados en la base de datos.
11. WHILE los Datos_de_Referencia no estén disponibles en la base de datos, THE Sistema SHALL impedir la creación de torneos y el registro de alineaciones, mostrando un mensaje que indique que es necesario ejecutar el Scraper primero.

---

### Requisito 1: Gestión de Torneos

**User Story:** Como organizador, quiero crear y gestionar torneos con formatos flexibles, para poder organizar las competiciones de la asociación a lo largo del tiempo.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir crear un torneo con nombre, edición, año, fecha de inicio, fecha de fin y descripción.
2. THE Sistema SHALL almacenar múltiples torneos correspondientes a distintos años y ediciones.
3. WHEN se crea un torneo, THE Sistema SHALL asignar un identificador único al torneo.
4. WHEN se actualizan los datos de un torneo, THE Sistema SHALL persistir los cambios y reflejarlos en todas las vistas asociadas.
5. WHEN se elimina un torneo, THE Sistema SHALL solicitar confirmación explícita antes de proceder al borrado.
6. THE Sistema SHALL mostrar la lista de torneos ordenada por fecha de inicio descendente.
7. WHILE un torneo está en estado "activo", THE Sistema SHALL permitir registrar resultados de partidos.
8. IF se intenta crear un torneo con el mismo nombre y año que uno existente, THEN THE Sistema SHALL mostrar un mensaje de error indicando el conflicto.
9. THE Sistema SHALL soportar un formato de torneo mixto compuesto por una Fase_de_Grupos seguida de una Fase_Eliminatoria.
10. WHEN se configura el formato mixto, THE Sistema SHALL permitir definir el número de grupos, el número de clasificados por grupo que pasan a la Fase_Eliminatoria y las rondas eliminatorias (semifinal, final).
11. THE Sistema SHALL soportar formatos de torneo alternativos (eliminación directa, liguilla completa) de forma que el formato sea configurable por torneo.

---

### Requisito 2: Gestión de Jugadores y Equipos

**User Story:** Como organizador, quiero registrar jugadores con sus equipos y alineaciones por torneo, para llevar un seguimiento de la evolución de cada participante.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir registrar un jugador con nombre, alias y datos de contacto opcionales desde la URL del proyecto sin autenticación.
2. THE Sistema SHALL permitir asociar un jugador a un torneo con un equipo (facción) y una alineación específica para ese torneo.
3. THE Sistema SHALL permitir que un mismo jugador participe en distintos torneos con equipos diferentes.
4. THE Sistema SHALL permitir que un mismo jugador participe en distintos torneos con el mismo equipo pero con alineaciones distintas.
5. WHEN se registra la alineación de un jugador en un torneo, THE Sistema SHALL validar que los jugadores de la alineación son válidos para la facción seleccionada según los Datos_de_Referencia.
6. WHEN se actualiza la alineación de un jugador en un torneo activo, THE Sistema SHALL registrar el historial de cambios con fecha y hora.
7. IF un jugador es eliminado del sistema, THEN THE Sistema SHALL conservar su historial de participación en torneos anteriores.
8. THE Sistema SHALL mostrar el perfil de un jugador con el historial de todos sus torneos, equipos y resultados.

---

### Requisito 3: Brackets y Emparejamientos

**User Story:** Como organizador y como visitante, quiero visualizar y gestionar los brackets de un torneo, para conocer los emparejamientos y el progreso de la competición.

#### Criterios de Aceptación

1. THE Sistema SHALL generar el bracket de un torneo a partir de la lista de jugadores inscritos y el formato configurado.
2. THE Sistema SHALL mostrar el bracket con las rondas, emparejamientos y resultados de cada partido.
3. WHEN se registra el resultado de un partido, THE Sistema SHALL actualizar el bracket y avanzar al ganador a la siguiente ronda.
4. WHEN todos los partidos de una ronda están completados, THE Sistema SHALL generar automáticamente los emparejamientos de la siguiente ronda.
5. WHEN el torneo tiene formato mixto, THE Sistema SHALL mostrar primero la clasificación de la Fase_de_Grupos y, una vez completada, generar el bracket de la Fase_Eliminatoria con los clasificados de cada grupo.
6. IF se intenta registrar el resultado de un partido ya finalizado, THEN THE Sistema SHALL solicitar confirmación explícita antes de permitir la modificación.
7. THE Visitante SHALL poder visualizar el bracket de cualquier torneo sin necesidad de autenticación.
8. THE Sistema SHALL mostrar el bracket de forma visual con representación gráfica de los emparejamientos por rondas.

---

### Requisito 4: Acceso Público y Gestión sin Autenticación

**User Story:** Como organizador, quiero que cualquier persona con la URL del proyecto pueda añadir jugadores y registrar resultados, para facilitar la gestión del torneo sin necesidad de cuentas de usuario.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir añadir jugadores, registrar resultados de partidos y gestionar torneos desde la URL del proyecto sin requerir autenticación.
2. THE Visitante SHALL poder consultar torneos, brackets, jugadores y estadísticas sin autenticación.
3. WHEN un visitante accede a la URL del proyecto, THE Sistema SHALL mostrar tanto las funciones de consulta como las de gestión sin solicitar credenciales.
4. THE Sistema SHALL mostrar una página de inicio con los torneos activos y los próximos torneos programados.
5. THE Sistema SHALL ser accesible desde dispositivos móviles con un diseño adaptable (responsive).
6. WHEN un visitante accede a una URL de un torneo inexistente, THE Sistema SHALL mostrar una página de error 404 con navegación hacia la página de inicio.

---

### Requisito 5: Estadísticas y Clasificaciones

**User Story:** Como visitante, quiero consultar estadísticas y clasificaciones de los torneos, para seguir el rendimiento de los jugadores.

#### Criterios de Aceptación

1. THE Sistema SHALL calcular y mostrar la clasificación de cada torneo con puntos, victorias, derrotas, empates y diferencia de touchdowns.
2. THE Sistema SHALL mostrar estadísticas individuales de cada jugador por torneo: partidos jugados, victorias, derrotas, empates, touchdowns a favor y en contra.
3. THE Sistema SHALL mostrar un ranking histórico global de jugadores agregando resultados de todos los torneos.
4. WHEN se registra el resultado de un partido, THE Sistema SHALL recalcular las clasificaciones y estadísticas afectadas de forma inmediata.
5. THE Sistema SHALL mostrar las estadísticas de cada equipo (facción) a lo largo de todos los torneos.

---

### Requisito 7: Visualización Pública

**User Story:** Como visitante, quiero navegar por la web sin necesidad de registrarme, para consultar la información de los torneos y jugadores de la asociación.

#### Criterios de Aceptación

1. THE Sistema SHALL mostrar una página de inicio con los torneos activos y los próximos torneos programados.
2. THE Sistema SHALL mostrar una página de detalle por torneo con bracket, clasificación y lista de participantes.
3. WHEN el torneo tiene formato mixto, THE Sistema SHALL mostrar la clasificación de la Fase_de_Grupos y el bracket de la Fase_Eliminatoria en la misma página de detalle.
4. THE Sistema SHALL mostrar una página de perfil por jugador con su historial de torneos y estadísticas.
5. THE Sistema SHALL ser accesible desde dispositivos móviles con un diseño adaptable (responsive).
6. WHEN un visitante accede a una URL de un torneo inexistente, THE Sistema SHALL mostrar una página de error 404 con navegación hacia la página de inicio.
