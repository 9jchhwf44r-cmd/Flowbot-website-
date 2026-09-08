export type Shape = "box" | "sphere" | "cylinder" | "cone" | "torus" | "plane";

export interface Scene3DObject {
  shape: Shape;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

export interface Scene3DData {
  objects: Scene3DObject[];
  background: string;
}

const SHAPES = new Set<Shape>(["box", "sphere", "cylinder", "cone", "torus", "plane"]);
const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_OBJECTS = 60;

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function vec3(value: unknown, fallback: [number, number, number]): [number, number, number] {
  if (Array.isArray(value) && value.length === 3) {
    return [num(value[0], fallback[0]), num(value[1], fallback[1]), num(value[2], fallback[2])];
  }
  return fallback;
}

function clampVec3(v: [number, number, number], min: number, max: number): [number, number, number] {
  return v.map((n) => Math.max(min, Math.min(max, n))) as [number, number, number];
}

/**
 * Parseert en saniteert de JSON die Gemini teruggeeft naar een veilige scene.
 * Er wordt nooit code uitgevoerd of geëvalueerd — alleen getallen/kleuren/enum-
 * waarden worden gelezen en in Three.js-primitieven gestopt.
 */
export function parseScene3D(text: string): Scene3DData | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      raw = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (typeof raw !== "object" || raw === null) return null;
  const objectsRaw = (raw as Record<string, unknown>).objects;
  if (!Array.isArray(objectsRaw)) return null;

  const objects: Scene3DObject[] = objectsRaw
    .slice(0, MAX_OBJECTS)
    .map((o): Scene3DObject | null => {
      if (typeof o !== "object" || o === null) return null;
      const rec = o as Record<string, unknown>;
      if (typeof rec.shape !== "string" || !SHAPES.has(rec.shape as Shape)) return null;

      const scale = Array.isArray(rec.scale)
        ? clampVec3(vec3(rec.scale, [1, 1, 1]), 0.05, 10)
        : typeof rec.scale === "number"
        ? ([1, 1, 1].map(() => Math.max(0.05, Math.min(10, rec.scale as number))) as [number, number, number])
        : ([1, 1, 1] as [number, number, number]);

      return {
        shape: rec.shape as Shape,
        position: clampVec3(vec3(rec.position, [0, 0, 0]), -20, 20),
        rotation: vec3(rec.rotation, [0, 0, 0]),
        scale,
        color: typeof rec.color === "string" && HEX.test(rec.color) ? rec.color : "#22d3ee",
      };
    })
    .filter((o): o is Scene3DObject => o !== null);

  if (objects.length === 0) return null;

  const backgroundRaw = (raw as Record<string, unknown>).background;
  const background = typeof backgroundRaw === "string" && HEX.test(backgroundRaw) ? backgroundRaw : "#050b16";

  return { objects, background };
}

export const SCENE3D_SYSTEM_PROMPT = `Je bent een 3D-scenegenerator. Bouw het gevraagde object op uit eenvoudige 3D-primitieven.
Geef ALLEEN geldige JSON terug (geen uitleg, geen markdown-fences) volgens exact dit schema:
{"objects":[{"shape":"box|sphere|cylinder|cone|torus|plane","position":[x,y,z],"rotation":[x,y,z],"scale":[x,y,z],"color":"#rrggbb"}],"background":"#rrggbb"}
Gebruik 5 tot 40 objecten. Bouw het model op rond de oorsprong (0,0,0), met realistische onderlinge verhoudingen en posities zodat het herkenbaar is als het gevraagde object. Kies kleuren die logisch bij het object passen.`;
