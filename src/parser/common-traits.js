const DARKVISION_ICON = "icons/creatures/eyes/humanoid-single-blind.webp";
const DARKVISION_ADVANCEMENT_ID = "bfeDarkvision000";
const DARKVISION_KEY = "system.traits.senses.types.darkvision";
const MODE_UPGRADE = 4;

function darkvisionDistance(text = "") {
  const match = String(text).match(/\b(\d{2,3})\s*(?:feet|ft\.?)/i);
  return match?.[1] ?? null;
}

function darkvisionEnhancement(trait) {
  if (!/\bdarkvision\b/i.test(trait?.name ?? "")) return null;
  const value = darkvisionDistance(trait.text);
  if (!value) return null;
  return {
    img: DARKVISION_ICON,
    system: {
      advancement: {
        [DARKVISION_ADVANCEMENT_ID]: {
          _id: DARKVISION_ADVANCEMENT_ID,
          configuration: {
            changes: [{ key: DARKVISION_KEY, mode: MODE_UPGRADE, value }]
          },
          flags: {},
          hint: trait.text,
          icon: null,
          level: { value: 0, classIdentifier: "" },
          title: trait.name,
          type: "property"
        }
      }
    }
  };
}

const COMMON_TRAIT_ENHANCERS = [darkvisionEnhancement];

export function commonTraitEnhancement(trait) {
  for (const enhance of COMMON_TRAIT_ENHANCERS) {
    const result = enhance(trait);
    if (result) return result;
  }
  return {};
}
