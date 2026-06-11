const SENTINEL = `BFE Smoke ${Date.now()}`;
const samples = {
  lineage: `${SENTINEL} Lineage\nLineage Traits\nAge. You age normally.\nSize. Your size is Medium.\nSpeed. Your base walking speed is 30 feet.\nShadow Sight. You see in dim light.`,
  heritage: `${SENTINEL} Heritage\nYou are at home in high places.\nDescender. You can slow your fall.`,
  background: `${SENTINEL} Background\nYou hunt creatures of the night.\nSkill Proficiencies: Choose two.\nEquipment: A stake.\nTalent: Choose one martial talent.`,
  talent: `${SENTINEL} Talent\nMartial Talent\nPrerequisite: None\nBenefit. You gain a +5 bonus to initiative.`,
  spell: `${SENTINEL} Spell\n1st-level evocation\nCasting Time: 1 action\nRange: 60 feet\nA flash of light.`,
  gear: `${SENTINEL} Gear\nMagic Item\nA useful item.`
};

const packs = Array.from(game.packs);
const pack = packs.find(p => p.documentName === "Item" && p.metadata.label === "Parser Test Items");
if (!pack) return { ok: false, world: game.world.id, system: game.system.id, error: "Parser Test Items pack not found", itemPacks: packs.map(p => ({ id: p.metadata.id, label: p.metadata.label, type: p.documentName, locked: p.locked })) };
const mod = await import(`/modules/black-flag-enhancements/dist/module.js?smoke=${Date.now()}`);
const out = { ok: true, world: game.world.id, system: game.system.id, active: game.modules.get("black-flag-enhancements")?.active, pack: pack.metadata.id, created: {} };
for (const [type, input] of Object.entries(samples)) {
  const result = mod.parseInput(type, input);
  const related = [];
  for (const data of result.related ?? []) {
    const [created] = await Item.createDocuments([data], { pack: pack.metadata.id });
    related.push(created);
  }
  const primary = foundry.utils.deepClone(result.primary);
  const [created] = await Item.createDocuments([primary], { pack: pack.metadata.id });
  out.created[type] = { id: created.id, name: created.name, type: created.type, related: related.map(d => ({ id: d.id, name: d.name, type: d.type })), description: created.system.description?.value };
}
for (const data of Object.values(out.created)) {
  const ids = [data.id, ...(data.related ?? []).map(r => r.id)].filter(Boolean);
  await Item.deleteDocuments(ids, { pack: pack.metadata.id });
}
return out;
