/**
 * DOOD (Day-out-of-Days) matrix builder.
 *
 * Converts a list of shooting days (with scene statuses → scene → characters)
 * into a character × day matrix for display and Excel export.
 */

export type DoodCharacter = {
  id: string;
  name: string;
};

/**
 * Input type: minimal shape from either page or export DB query.
 * Both `page.tsx` and `export/route.ts` return the same nested structure.
 */
export type DoodShootingDay = {
  id: string;
  date: Date;
  sceneStatuses: Array<{
    scene: {
      characters: Array<{
        character: {
          id: string;
          name: string;
        };
      }>;
    };
  }>;
};

export type DoodMatrix = {
  /** All unique characters across all days, sorted by Korean name */
  characters: DoodCharacter[];
  /** characterId → Set of dayIds where the character works */
  charDaySet: Map<string, Set<string>>;
};

/**
 * Build DOOD matrix from shooting days.
 * Pure function — no side effects, fully testable.
 */
export function buildDoodMatrix(days: DoodShootingDay[]): DoodMatrix {
  const characterMap = new Map<string, DoodCharacter>();

  for (const day of days) {
    for (const ss of day.sceneStatuses) {
      for (const sc of ss.scene.characters) {
        if (!characterMap.has(sc.character.id)) {
          characterMap.set(sc.character.id, {
            id: sc.character.id,
            name: sc.character.name,
          });
        }
      }
    }
  }

  const characters = Array.from(characterMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ko")
  );

  const charDaySet = new Map<string, Set<string>>();
  for (const day of days) {
    for (const ss of day.sceneStatuses) {
      for (const sc of ss.scene.characters) {
        if (!charDaySet.has(sc.character.id)) {
          charDaySet.set(sc.character.id, new Set());
        }
        charDaySet.get(sc.character.id)!.add(day.id);
      }
    }
  }

  return { characters, charDaySet };
}
