/**
 * Blood Bowl Tournament Web — Scraper Standalone (Fase 0)
 *
 * Extrae datos de referencia del juego desde:
 *   - https://nufflezone.com/en/blood-bowl-teams/  (razas, posiciones, habilidades)
 *   - https://jonasbusk.github.io/nuflheim/         (fichas de alineación — SPA React,
 *     sin datos estáticos scrapeables; se enriquece con los datos de nufflezone)
 *
 * Uso: npx ts-node scripts/scraper.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { PrismaClient, Prisma } from '@prisma/client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ScrapedPosition {
  name: string;
  cost: number;
  ma: number;
  st: number;
  ag: number;
  pa?: number;
  av: number;
  maxCount: number;
  skills: string[];
}

export interface ScrapedRace {
  name: string;
  positions: ScrapedPosition[];
  rerollCost: number;
  imageUrl?: string;
}

export interface ScrapedSkill {
  name: string;
  category: string;
  description: string;
}

export interface ScrapeError {
  element: string;
  error: string;
}

export interface ScrapeResult {
  races: ScrapedRace[];
  skills: ScrapedSkill[];
  errors: ScrapeError[];
}

export interface PersistSummary {
  racesUpserted: number;
  positionsUpserted: number;
  skillsUpserted: number;
  positionSkillsLinked: number;
  errors: ScrapeError[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const NUFFLEZONE_TEAMS_URL = 'https://nufflezone.com/en/blood-bowl-teams/';
const NUFFLEZONE_SKILLS_URL = 'https://nufflezone.com/en/blood-bowl-skills-traits/';
const NUFLHEIM_URL = 'https://jonasbusk.github.io/nuflheim/';
const FANDOM_API_URL = 'https://blood-bowl.fandom.com/api.php';

// Mapeo de nombres de nufflezone → títulos en la wiki de Fandom
const FANDOM_TITLE_MAP: Record<string, string> = {
  'Amazons': 'Amazons',
  'Black Orcs': 'Black_Orcs',
  'Bretonnia': 'Bretonnia',
  'Chaos Chosen': 'Chaos',
  'Chaos Dwarf': 'Chaos_Dwarfs',
  'Chaos Renegade': 'Chaos_Renegades',
  'Daemons of Khorne': 'Khorne',
  'Dark Elf': 'Dark_Elves',
  'Dwarf': 'Dwarfs',
  'Elven Union': 'Elven_Union',
  'Gnomes': 'Gnomes',
  'Goblins': 'Goblins',
  'Halflings': 'Halflings',
  'High Elf': 'High_Elves',
  'Human': 'Humans',
  'Humanos': 'Humans',
  'Imperial Nobility': 'Imperial_Nobility',
  'Khorne': 'Khorne',
  'Lizardmen': 'Lizardmen',
  'Necromantic Horrors': 'Necromantic_Horror',
  'Norses': 'Norse',
  'Nurgle': 'Nurgle',
  'Ogres': 'Ogres',
  'Old World Aliance': 'Old_World_Alliance',
  'Orc': 'Orcs',
  'Shambling Undead': 'Undead',
  'Skavens': 'Skaven',
  'Slaanesh': 'Slaanesh',
  'Slann': 'Slann',
  'Snotlings': 'Snotlings',
  'Tomb Kings': 'Tomb_Kings',
  'Underworld Denizens': 'Underworld_Denizens',
  'Vampires': 'Vampires',
  'Wood elf': 'Wood_Elves',
};

const SKILL_CATEGORIES = ['AGILITY', 'DEVIOUS', 'GENERAL', 'MUTATION', 'PASSING', 'STRENGTH', 'TRAITS'] as const;

const CATEGORY_MAP: Record<string, string> = {
  AGILITY: 'Agility',
  DEVIOUS: 'General',
  GENERAL: 'General',
  MUTATION: 'Mutation',
  PASSING: 'Passing',
  STRENGTH: 'Strength',
  TRAITS: 'Trait',
};

const HTTP_TIMEOUT_MS = 15_000;

const axiosInstance = axios.create({
  timeout: HTTP_TIMEOUT_MS,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; BloodBowlScraper/1.0)',
    'Accept-Language': 'en-US,en;q=0.9',
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte "3+" → 3, "4+" → 4, "–" → null */
function parseStat(raw: string): number | null {
  const cleaned = raw.trim().replace('+', '').replace('–', '').replace('-', '');
  if (!cleaned || cleaned === '') return null;
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

/** Convierte "50k" → 50000, "140k" → 140000 */
function parseCost(raw: string): number {
  const cleaned = raw.trim().toLowerCase().replace('k', '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n * 1000);
}

/** Extrae el número máximo de jugadores de una celda QTY como "0-2" → 2, "0-16" → 16 */
function parseMaxCount(raw: string): number {
  const match = raw.trim().match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 1;
}

/** Normaliza el nombre de una habilidad para comparación */
function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ─── 2.1 scrapeRaces() ────────────────────────────────────────────────────────

/**
 * Extrae la lista de razas con sus posiciones desde nufflezone.com.
 * Primero obtiene la lista de equipos y luego visita cada página individual.
 */
export async function scrapeRaces(): Promise<{ races: ScrapedRace[]; errors: ScrapeError[] }> {
  const races: ScrapedRace[] = [];
  const errors: ScrapeError[] = [];

  // 1. Obtener lista de URLs de equipos
  let teamUrls: Array<{ name: string; url: string }> = [];
  try {
    const { data: html } = await axiosInstance.get<string>(NUFFLEZONE_TEAMS_URL);
    const $ = cheerio.load(html);
    $('h4 a').each((_i, el) => {
      const href = $(el).attr('href');
      const name = $(el).text().trim();
      if (href && href.includes('/blood-bowl-teams/') && name) {
        teamUrls.push({ name, url: href });
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push({ element: 'teams-list', error: `No se pudo obtener la lista de equipos: ${msg}` });
    return { races, errors };
  }

  if (teamUrls.length === 0) {
    errors.push({ element: 'teams-list', error: 'No se encontraron equipos en la página de listado' });
    return { races, errors };
  }

  // 2. Visitar cada página de equipo
  for (const { name: raceName, url } of teamUrls) {
    try {
      const { positions, rerollCost } = await scrapeRacePositions(raceName, url);
      if (positions.length > 0) {
        races.push({ name: raceName, positions, rerollCost });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ element: `race:${raceName}`, error: msg });
    }
  }

  return { races, errors };
}

/** Parsea las posiciones de una página de equipo individual */
async function scrapeRacePositions(
  raceName: string,
  url: string,
): Promise<{ positions: ScrapedPosition[]; rerollCost: number }> {
  const positions: ScrapedPosition[] = [];
  let rerollCost = 0;

  const { data: html } = await axiosInstance.get<string>(url);
  const $ = cheerio.load(html);

  // Las tablas de posiciones tienen cabeceras: QTY, Position, Cost, MA, ST, AG, PA, AV, Skills...
  $('table').each((_tableIdx, table) => {
    const headers: string[] = [];
    $(table)
      .find('tr:first-child th, tr:first-child td')
      .each((_i, th) => {
        headers.push($(th).text().trim().toUpperCase());
      });

    // Detectar si es una tabla de posiciones (debe tener MA, ST, AG, AV)
    const isRosterTable =
      headers.includes('MA') && headers.includes('ST') && headers.includes('AG') && headers.includes('AV');
    if (!isRosterTable) return;

    const colIdx = {
      qty: headers.findIndex((h) => h === 'QTY'),
      position: headers.findIndex((h) => h === 'POSITION'),
      cost: headers.findIndex((h) => h === 'COST'),
      ma: headers.findIndex((h) => h === 'MA'),
      st: headers.findIndex((h) => h === 'ST'),
      ag: headers.findIndex((h) => h === 'AG'),
      pa: headers.findIndex((h) => h === 'PA'),
      av: headers.findIndex((h) => h === 'AV'),
      skills: headers.findIndex((h) => h.startsWith('SKILL') || h.startsWith('TRAIT')),
    };

    $(table)
      .find('tr')
      .slice(1)
      .each((_rowIdx, row) => {
        const cells = $(row).find('td');
        if (cells.length < 6) return;

        const getCellText = (idx: number): string =>
          idx >= 0 ? $(cells[idx]).text().trim() : '';

        const positionName = getCellText(colIdx.position);
        if (!positionName) return;
        const posLower = positionName.toLowerCase();

        // Extraer coste de re-roll antes de ignorar la fila
        if (posLower.includes('reroll')) {
          const costRaw = getCellText(colIdx.cost);
          const extracted = parseCost(costRaw);
          if (extracted > 0) rerollCost = extracted;
          return;
        }

        // Ignorar silenciosamente filas que no son posiciones de jugadores
        const NON_POSITION_KEYWORDS = [
          'special rules', 'leagues', 'choose', 'of 2', 'of 3', 'of 4',
          'apothecary', 'wizard', 'inducement', 'star player', 'assistant',
          'cheerleader', 'head coach',
        ];
        if (NON_POSITION_KEYWORDS.some((kw) => posLower.includes(kw))) return;

        const qtyRaw = getCellText(colIdx.qty);
        const costRaw = getCellText(colIdx.cost);
        const maRaw = getCellText(colIdx.ma);
        const stRaw = getCellText(colIdx.st);
        const agRaw = getCellText(colIdx.ag);
        const paRaw = colIdx.pa >= 0 ? getCellText(colIdx.pa) : '';
        const avRaw = getCellText(colIdx.av);
        const skillsRaw = getCellText(colIdx.skills);

        const ma = parseStat(maRaw);
        const st = parseStat(stRaw);
        const ag = parseStat(agRaw);
        const av = parseStat(avRaw);

        // Si las estadísticas están vacías, es una fila informativa — ignorar silenciosamente
        if (ma === null || st === null || ag === null || av === null) return;

        const pa = paRaw && paRaw !== '–' && paRaw !== '-' ? parseStat(paRaw) : undefined;
        const cost = parseCost(costRaw);
        const maxCount = parseMaxCount(qtyRaw);
        const skills = skillsRaw
          ? skillsRaw
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0 && s !== '–' && s !== '-')
          : [];

        positions.push({ name: positionName, cost, ma, st, ag, pa: pa ?? undefined, av, maxCount, skills });
      });
  });

  return { positions, rerollCost };
}

// ─── 2.3 scrapeSkills() ───────────────────────────────────────────────────────

/**
 * Extrae habilidades con nombre, categoría y descripción desde nufflezone.com.
 */
export async function scrapeSkills(): Promise<{ skills: ScrapedSkill[]; errors: ScrapeError[] }> {
  const skills: ScrapedSkill[] = [];
  const errors: ScrapeError[] = [];

  let html: string;
  try {
    const response = await axiosInstance.get<string>(NUFFLEZONE_SKILLS_URL);
    html = response.data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push({ element: 'skills-page', error: `No se pudo obtener la página de habilidades: ${msg}` });
    return { skills, errors };
  }

  const $ = cheerio.load(html);
  let currentCategory = 'General';

  // La página tiene secciones por categoría con encabezados de texto en mayúsculas
  // seguidos de bloques con nombre de habilidad y descripción
  $('body *').each((_i, el) => {
    const tag = (el as AnyNode & { tagName?: string }).tagName?.toLowerCase();
    const text = $(el).text().trim();

    // Detectar encabezados de categoría
    if (tag && ['h2', 'h3', 'h4', 'strong', 'b'].includes(tag)) {
      const upper = text.toUpperCase();
      for (const cat of SKILL_CATEGORIES) {
        if (upper === cat || upper.startsWith(cat)) {
          currentCategory = CATEGORY_MAP[cat] ?? 'General';
          break;
        }
      }
    }
  });

  // Estrategia alternativa: buscar patrones de nombre + descripción en el HTML
  // La estructura es: <strong>SkillName</strong> seguido de texto de descripción
  // o párrafos con el patrón "SkillName\n(ACTIVE/PASSIVE)description"
  currentCategory = 'General';

  // Recorrer el DOM buscando secciones de categoría y sus habilidades
  const bodyText = $.html();
  const categoryBlocks = extractCategoryBlocks(bodyText);

  for (const block of categoryBlocks) {
    try {
      const blockSkills = parseSkillBlock(block.content, block.category);
      skills.push(...blockSkills);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ element: `skills-category:${block.category}`, error: msg });
    }
  }

  // Deduplicar por nombre
  const seen = new Set<string>();
  const unique = skills.filter((s) => {
    const key = normalizeSkillName(s.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { skills: unique, errors };
}

interface CategoryBlock {
  category: string;
  content: string;
}

/** Extrae bloques de contenido por categoría del HTML */
function extractCategoryBlocks(html: string): CategoryBlock[] {
  const blocks: CategoryBlock[] = [];
  const $ = cheerio.load(html);

  let currentCategory = 'General';
  let currentContent = '';

  // Buscar divs/secciones que contengan categorías
  $('body').find('*').each((_i, el) => {
    const tag = (el as AnyNode & { tagName?: string }).tagName?.toLowerCase() ?? '';
    const text = $(el).children().length === 0 ? $(el).text().trim() : '';

    if (['h2', 'h3', 'h4'].includes(tag) && text) {
      const upper = text.toUpperCase();
      for (const cat of SKILL_CATEGORIES) {
        if (upper === cat) {
          if (currentContent.trim()) {
            blocks.push({ category: currentCategory, content: currentContent });
          }
          currentCategory = CATEGORY_MAP[cat] ?? 'General';
          currentContent = '';
          break;
        }
      }
    }
  });

  // Fallback: parsear el texto completo de la página buscando patrones de habilidades
  const fullText = $('body').text();
  const fallbackBlocks = parseSkillsFromText(fullText);
  if (fallbackBlocks.length > 0) {
    blocks.push(...fallbackBlocks);
  }

  return blocks;
}

/** Parsea habilidades desde texto plano de la página */
function parseSkillsFromText(text: string): CategoryBlock[] {
  const blocks: CategoryBlock[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let currentCategory = 'General';
  let currentSkillName = '';
  let currentDesc = '';
  const skillsByCategory: Record<string, Array<{ name: string; description: string }>> = {};

  for (const line of lines) {
    const upper = line.toUpperCase();

    // Detectar categoría
    let foundCategory = false;
    for (const cat of SKILL_CATEGORIES) {
      if (upper === cat) {
        if (currentSkillName && currentDesc) {
          if (!skillsByCategory[currentCategory]) skillsByCategory[currentCategory] = [];
          skillsByCategory[currentCategory].push({ name: currentSkillName, description: currentDesc.trim() });
          currentSkillName = '';
          currentDesc = '';
        }
        currentCategory = CATEGORY_MAP[cat] ?? 'General';
        foundCategory = true;
        break;
      }
    }
    if (foundCategory) continue;

    // Detectar inicio de habilidad: línea corta sin paréntesis que no es descripción
    const isActiveLine = line.includes('(ACTIVE)') || line.includes('(PASSIVE)') || line.includes('(ACTIVA)') || line.includes('(PASIVA)');
    if (isActiveLine) {
      if (currentSkillName && currentDesc) {
        if (!skillsByCategory[currentCategory]) skillsByCategory[currentCategory] = [];
        skillsByCategory[currentCategory].push({ name: currentSkillName, description: currentDesc.trim() });
      }
      // El nombre puede estar en la misma línea antes del paréntesis
      const nameMatch = line.match(/^(.+?)\s*\((?:ACTIVE|PASSIVE|ACTIVA|PASIVA)\)/i);
      currentSkillName = nameMatch ? nameMatch[1].trim() : currentSkillName;
      currentDesc = line;
      continue;
    }

    // Si la línea es corta y parece un nombre de habilidad (sin descripción larga)
    if (line.length < 50 && !line.includes('.') && currentDesc.length > 20) {
      if (currentSkillName && currentDesc) {
        if (!skillsByCategory[currentCategory]) skillsByCategory[currentCategory] = [];
        skillsByCategory[currentCategory].push({ name: currentSkillName, description: currentDesc.trim() });
      }
      currentSkillName = line;
      currentDesc = '';
      continue;
    }

    if (currentSkillName) {
      currentDesc += ' ' + line;
    }
  }

  // Guardar última habilidad
  if (currentSkillName && currentDesc) {
    if (!skillsByCategory[currentCategory]) skillsByCategory[currentCategory] = [];
    skillsByCategory[currentCategory].push({ name: currentSkillName, description: currentDesc.trim() });
  }

  for (const [category, skillList] of Object.entries(skillsByCategory)) {
    if (skillList.length > 0) {
      blocks.push({
        category,
        content: skillList.map((s) => `${s.name}|||${s.description}`).join('\n'),
      });
    }
  }

  return blocks;
}

/** Parsea habilidades de un bloque de contenido */
function parseSkillBlock(content: string, category: string): ScrapedSkill[] {
  const skills: ScrapedSkill[] = [];
  const lines = content.split('\n').filter((l) => l.includes('|||'));
  for (const line of lines) {
    const [name, description] = line.split('|||');
    if (name && description) {
      skills.push({ name: name.trim(), category, description: description.trim() });
    }
  }
  return skills;
}

// ─── 2.4 scrapeRosters() ─────────────────────────────────────────────────────

/**
 * Obtiene URLs de imágenes para cada raza desde la API de MediaWiki de Fandom.
 * Usa el mapeo FANDOM_TITLE_MAP para traducir nombres de nufflezone a títulos de la wiki.
 */
export async function scrapeRaceImages(
  raceNames: string[],
): Promise<{ imageMap: Map<string, string>; errors: ScrapeError[] }> {
  const imageMap = new Map<string, string>();
  const errors: ScrapeError[] = [];

  // Agrupar en lotes de 10 para no saturar la API
  const BATCH_SIZE = 10;
  for (let i = 0; i < raceNames.length; i += BATCH_SIZE) {
    const batch = raceNames.slice(i, i + BATCH_SIZE);
    const titles = batch
      .map((name) => FANDOM_TITLE_MAP[name] ?? name.replace(/ /g, '_'))
      .join('|');

    try {
      const url = `${FANDOM_API_URL}?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&format=json&pithumbsize=300&pilimit=${BATCH_SIZE}`;
      const { data } = await axiosInstance.get<{
        query: { pages: Record<string, { title: string; thumbnail?: { source: string } }> };
      }>(url);

      const pages = data?.query?.pages ?? {};
      for (const page of Object.values(pages)) {
        if (page.thumbnail?.source) {
          // Buscar el nombre de raza original que corresponde a este título de Fandom
          const raceName = batch.find(
            (name) => (FANDOM_TITLE_MAP[name] ?? name.replace(/ /g, '_')) === page.title.replace(/ /g, '_'),
          );
          if (raceName) {
            imageMap.set(raceName, page.thumbnail.source);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ element: `fandom-images-batch-${i}`, error: msg });
    }
  }

  return { imageMap, errors };
}

/**
 * Intenta obtener fichas detalladas desde jonasbusk.github.io/nuflheim/.
 *
 * NOTA: Nuflheim es una SPA React que carga datos dinámicamente. No expone
 * datos estáticos scrapeables via HTTP. Esta función intenta obtener el HTML
 * inicial y, si no encuentra datos útiles, devuelve un resultado vacío con
 * una advertencia (no un error fatal), conservando los datos de nufflezone.
 *
 * Los datos de posiciones ya obtenidos de nufflezone son la fuente canónica
 * y son suficientes para poblar la base de datos.
 */
export async function scrapeRosters(): Promise<{
  rosterData: Map<string, Partial<ScrapedPosition>>;
  errors: ScrapeError[];
}> {
  const rosterData = new Map<string, Partial<ScrapedPosition>>();
  const errors: ScrapeError[] = [];

  try {
    const { data: html } = await axiosInstance.get<string>(NUFLHEIM_URL);
    const $ = cheerio.load(html);

    // Nuflheim es una SPA React — el HTML inicial no contiene datos de posiciones.
    // Intentamos extraer cualquier dato de tablas si estuvieran presentes.
    let foundData = false;
    $('table').each((_i, table) => {
      const headers: string[] = [];
      $(table)
        .find('tr:first-child th, tr:first-child td')
        .each((_j, th) => { headers.push($(th).text().trim().toUpperCase()); });

      if (headers.includes('MA') && headers.includes('ST')) {
        foundData = true;
        $(table)
          .find('tr')
          .slice(1)
          .each((_rowIdx, row) => {
            const cells = $(row).find('td');
            if (cells.length < 4) return;
            const posName = $(cells[1]).text().trim();
            if (!posName) return;
            const ma = parseStat($(cells[2]).text());
            const st = parseStat($(cells[3]).text());
            if (ma !== null && st !== null) {
              rosterData.set(posName.toLowerCase(), { ma, st });
            }
          });
      }
    });

    if (!foundData) {
      // SPA sin datos estáticos — advertencia no fatal
      errors.push({
        element: 'nuflheim',
        error:
          'Nuflheim es una SPA React sin datos estáticos. Los datos de posiciones se obtienen exclusivamente de nufflezone.com.',
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push({
      element: 'nuflheim',
      error: `No se pudo acceder a nuflheim: ${msg}. Se conservan los datos previos.`,
    });
  }

  return { rosterData, errors };
}

// ─── 2.5 persistReferenceData() ──────────────────────────────────────────────

/**
 * Persiste razas, posiciones y habilidades en PostgreSQL usando Prisma.
 * Usa transacciones para garantizar atomicidad.
 * Hace UPSERT para no destruir datos previos si falla a mitad.
 */
export async function persistReferenceData(
  races: ScrapedRace[],
  skills: ScrapedSkill[],
  prisma: PrismaClient,
): Promise<PersistSummary> {
  const summary: PersistSummary = {
    racesUpserted: 0,
    positionsUpserted: 0,
    skillsUpserted: 0,
    positionSkillsLinked: 0,
    errors: [],
  };

  const scrapedAt = new Date();

  // ── 1. Upsert habilidades (independiente de razas) ──────────────────────────
  for (const skill of skills) {
    try {
      await prisma.skill.upsert({
        where: { name: skill.name },
        update: {
          category: skill.category,
          description: skill.description,
          scrapedAt,
        },
        create: {
          name: skill.name,
          category: skill.category,
          description: skill.description,
          scrapedAt,
        },
      });
      summary.skillsUpserted++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push({ element: `skill:${skill.name}`, error: msg });
    }
  }

  // ── 2. Upsert razas y posiciones en transacciones por raza ─────────────────
  for (const race of races) {
    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Upsert raza
        const dbRace = await tx.race.upsert({
          where: { name: race.name },
          update: { scrapedAt, rerollCost: race.rerollCost, ...(race.imageUrl && { imageUrl: race.imageUrl }) },
          create: { name: race.name, scrapedAt, rerollCost: race.rerollCost, imageUrl: race.imageUrl ?? null },
        });
        summary.racesUpserted++;

        // Upsert posiciones de esta raza
        for (const pos of race.positions) {
          try {
            // Buscar posición existente por raceId + name
            const existing = await tx.position.findFirst({
              where: { raceId: dbRace.id, name: pos.name },
            });

            let dbPosition;
            if (existing) {
              dbPosition = await tx.position.update({
                where: { id: existing.id },
                data: {
                  cost: pos.cost,
                  ma: pos.ma,
                  st: pos.st,
                  ag: pos.ag,
                  pa: pos.pa ?? null,
                  av: pos.av,
                  maxCount: pos.maxCount,
                  scrapedAt,
                },
              });
            } else {
              dbPosition = await tx.position.create({
                data: {
                  raceId: dbRace.id,
                  name: pos.name,
                  cost: pos.cost,
                  ma: pos.ma,
                  st: pos.st,
                  ag: pos.ag,
                  pa: pos.pa ?? null,
                  av: pos.av,
                  maxCount: pos.maxCount,
                  scrapedAt,
                },
              });
            }
            summary.positionsUpserted++;

            // Vincular habilidades a la posición
            for (const skillName of pos.skills) {
              try {
                const dbSkill = await tx.skill.findFirst({
                  where: { name: { equals: skillName, mode: 'insensitive' } },
                });

                if (!dbSkill) {
                  // Crear habilidad mínima si no existe (puede ser un Trait no listado)
                  const newSkill = await tx.skill.create({
                    data: {
                      name: skillName,
                      category: 'Trait',
                      description: skillName,
                      scrapedAt,
                    },
                  });
                  await tx.positionSkill.upsert({
                    where: { positionId_skillId: { positionId: dbPosition.id, skillId: newSkill.id } },
                    update: {},
                    create: { positionId: dbPosition.id, skillId: newSkill.id },
                  });
                } else {
                  await tx.positionSkill.upsert({
                    where: { positionId_skillId: { positionId: dbPosition.id, skillId: dbSkill.id } },
                    update: {},
                    create: { positionId: dbPosition.id, skillId: dbSkill.id },
                  });
                }
                summary.positionSkillsLinked++;
              } catch (skillErr: unknown) {
                const msg = skillErr instanceof Error ? skillErr.message : String(skillErr);
                summary.errors.push({
                  element: `position-skill:${race.name}:${pos.name}:${skillName}`,
                  error: msg,
                });
              }
            }
          } catch (posErr: unknown) {
            const msg = posErr instanceof Error ? posErr.message : String(posErr);
            summary.errors.push({ element: `position:${race.name}:${pos.name}`, error: msg });
          }
        }
      }, { timeout: 30000 });
    } catch (raceErr: unknown) {
      const msg = raceErr instanceof Error ? raceErr.message : String(raceErr);
      summary.errors.push({ element: `race:${race.name}`, error: msg });
    }
  }

  return summary;
}

// ─── 2.7 Manejo de errores y resumen ─────────────────────────────────────────

/** Muestra el resumen final del scraping */
function printSummary(
  races: ScrapedRace[],
  skills: ScrapedSkill[],
  persistSummary: PersistSummary,
  scrapeErrors: ScrapeError[],
  rosterErrors: ScrapeError[],
): void {
  const allErrors = [...scrapeErrors, ...rosterErrors, ...persistSummary.errors];

  console.log('\n' + '═'.repeat(60));
  console.log('  RESUMEN DE IMPORTACIÓN — Blood Bowl Reference Data');
  console.log('═'.repeat(60));
  console.log(`  Razas scrapeadas:       ${races.length}`);
  console.log(`  Posiciones scrapeadas:  ${races.reduce((acc, r) => acc + r.positions.length, 0)}`);
  console.log(`  Habilidades scrapeadas: ${skills.length}`);
  console.log('─'.repeat(60));
  console.log(`  Razas en BD:            ${persistSummary.racesUpserted}`);
  console.log(`  Posiciones en BD:       ${persistSummary.positionsUpserted}`);
  console.log(`  Habilidades en BD:      ${persistSummary.skillsUpserted}`);
  console.log(`  Vínculos pos-skill:     ${persistSummary.positionSkillsLinked}`);
  console.log('─'.repeat(60));

  if (allErrors.length === 0) {
    console.log('  ✓ Sin errores');
  } else {
    console.log(`  ✗ Errores encontrados: ${allErrors.length}`);
    for (const e of allErrors) {
      console.log(`    • [${e.element}] ${e.error}`);
    }
  }
  console.log('═'.repeat(60) + '\n');
}

// ─── 2.9 main() ───────────────────────────────────────────────────────────────

/**
 * Función principal que orquesta todo el proceso de scraping y persistencia.
 * Ejecutable con: npx ts-node scripts/scraper.ts
 */
export async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const allScrapeErrors: ScrapeError[] = [];

  console.log('\n🏈 Blood Bowl Scraper — Fase 0');
  console.log('─'.repeat(60));

  // ── Paso 1: Scrape de razas ─────────────────────────────────────────────────
  console.log('\n[1/4] Scrapeando razas y posiciones desde nufflezone.com...');
  let races: ScrapedRace[] = [];
  try {
    const result = await scrapeRaces();
    races = result.races;
    allScrapeErrors.push(...result.errors);
    console.log(`      → ${races.length} razas encontradas`);
    if (result.errors.length > 0) {
      console.log(`      → ${result.errors.length} errores parciales`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    allScrapeErrors.push({ element: 'scrapeRaces', error: msg });
    console.error(`      ✗ Error fatal en scrapeRaces: ${msg}`);
    console.log('      → Se conservan los datos previos en la BD');
  }

  // ── Paso 2: Scrape de habilidades ───────────────────────────────────────────
  console.log('\n[2/4] Scrapeando habilidades desde nufflezone.com...');
  let skills: ScrapedSkill[] = [];
  try {
    const result = await scrapeSkills();
    skills = result.skills;
    allScrapeErrors.push(...result.errors);
    console.log(`      → ${skills.length} habilidades encontradas`);
    if (result.errors.length > 0) {
      console.log(`      → ${result.errors.length} errores parciales`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    allScrapeErrors.push({ element: 'scrapeSkills', error: msg });
    console.error(`      ✗ Error fatal en scrapeSkills: ${msg}`);
    console.log('      → Se conservan los datos previos en la BD');
  }

  // ── Paso 3: Scrape de imágenes desde Fandom ────────────────────────────────
  if (races.length > 0) {
    console.log('\n[3/5] Obteniendo imágenes de razas desde Blood Bowl Wiki (Fandom)...');
    try {
      const { imageMap, errors: imgErrors } = await scrapeRaceImages(races.map((r) => r.name));
      allScrapeErrors.push(...imgErrors);
      let imagesFound = 0;
      for (const race of races) {
        const url = imageMap.get(race.name);
        if (url) { race.imageUrl = url; imagesFound++; }
      }
      console.log(`      → ${imagesFound}/${races.length} imágenes encontradas`);
      if (imgErrors.length > 0) console.log(`      → ${imgErrors.length} errores parciales`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      allScrapeErrors.push({ element: 'scrapeRaceImages', error: msg });
      console.error(`      ✗ Error en scrapeRaceImages: ${msg}`);
    }
  }

  // ── Paso 4: Scrape de fichas (nuflheim) ─────────────────────────────────────
  console.log('\n[4/5] Intentando obtener fichas desde nuflheim...');
  const rosterErrors: ScrapeError[] = [];
  try {
    const result = await scrapeRosters();
    rosterErrors.push(...result.errors);
    if (result.rosterData.size > 0) {
      console.log(`      → ${result.rosterData.size} fichas adicionales encontradas`);
    } else {
      console.log('      → Nuflheim es SPA React; datos obtenidos de nufflezone.com');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    rosterErrors.push({ element: 'scrapeRosters', error: msg });
    console.error(`      ✗ Error en scrapeRosters: ${msg}`);
    console.log('      → Se conservan los datos previos en la BD');
  }

  // ── Paso 5: Persistencia ────────────────────────────────────────────────────
  console.log('\n[5/5] Persistiendo datos en PostgreSQL...');
  let persistSummary: PersistSummary = {
    racesUpserted: 0,
    positionsUpserted: 0,
    skillsUpserted: 0,
    positionSkillsLinked: 0,
    errors: [],
  };

  try {
    persistSummary = await persistReferenceData(races, skills, prisma);
    console.log(`      → ${persistSummary.racesUpserted} razas, ${persistSummary.positionsUpserted} posiciones, ${persistSummary.skillsUpserted} habilidades`);
    if (persistSummary.errors.length > 0) {
      console.log(`      → ${persistSummary.errors.length} errores de persistencia`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    persistSummary.errors.push({ element: 'persistReferenceData', error: msg });
    console.error(`      ✗ Error fatal en persistencia: ${msg}`);
  } finally {
    await prisma.$disconnect();
  }

  // ── Resumen final ───────────────────────────────────────────────────────────
  printSummary(races, skills, persistSummary, allScrapeErrors, rosterErrors);

  const totalErrors = allScrapeErrors.length + rosterErrors.length + persistSummary.errors.length;
  process.exit(totalErrors > 0 ? 1 : 0);
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error('Error fatal no capturado:', err);
    process.exit(1);
  });
}
