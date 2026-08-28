// src/data/heroes.ts

// ============================================================
// CLASSES DES HEROS
// ============================================================

export type HeroClass = "STR" | "AGI" | "INT";

// ============================================================
// STATISTIQUES
// ============================================================

export interface HeroStats {
  hp: number;
  atk: number;
  matk: number;
  def: number;
  mdef: number;
}

// ============================================================
// HEROS
// ============================================================

export interface Hero {
  id: string;
  name: string;
  alias: string;
  cls: HeroClass;
  img: string;
  stats: HeroStats;
}

// ============================================================
// HEROS
// ============================================================

export const HEROES: Hero[] = [
  {
    id: "boommeister",
    name: "Boommeister",
    alias: "Manfred Brandt",
    cls: "STR",
    img: "/heroes/boommeister.png",
    stats: { hp: 26901, atk: 2279, matk: 238, def: 286, mdef: 160 },
  },
  {
    id: "black_crow",
    name: "Black Crow",
    alias: "Chadra",
    cls: "AGI",
    img: "/heroes/black_crow.png",
    stats: { hp: 13388, atk: 2329, matk: 359, def: 158, mdef: 137 },
  },
  {
    id: "bombin_goblin",
    name: "Bombin' Goblin",
    alias: "Tinkus",
    cls: "INT",
    img: "/heroes/bombin_goblin.png",
    stats: { hp: 13360, atk: 287, matk: 2271, def: 194, mdef: 434 },
  },
  {
    id: "child_of_light",
    name: "Child of Light",
    alias: "Sparky",
    cls: "STR",
    img: "/heroes/child_of_light.png",
    stats: { hp: 28087, atk: 935, matk: 633, def: 589, mdef: 719 },
  },
  {
    id: "death_archer",
    name: "Death Archer",
    alias: "Cathiss",
    cls: "AGI",
    img: "/heroes/death_archer.png",
    stats: { hp: 13964, atk: 2792, matk: 350, def: 236, mdef: 220 },
  },
  {
    id: "death_knight",
    name: "Death Knight",
    alias: "Shane",
    cls: "STR",
    img: "/heroes/death_knight.png",
    stats: { hp: 35561, atk: 1459, matk: 292, def: 348, mdef: 199 },
  },
  {
    id: "demon_slayer",
    name: "Demon Slayer",
    alias: "Shroud",
    cls: "AGI",
    img: "/heroes/demon_slayer.png",
    stats: { hp: 13104, atk: 2382, matk: 368, def: 149, mdef: 603 },
  },
  {
    id: "night_raven",
    name: "Night Raven",
    alias: "Icarus",
    cls: "AGI",
    img: "/heroes/night_raven.png",
    stats: { hp: 13662, atk: 2345, matk: 549, def: 195, mdef: 172 },
  },
  {
    id: "oath_keeper",
    name: "Oath Keeper",
    alias: "Wesley",
    cls: "STR",
    img: "/heroes/oath_keeper.png",
    stats: { hp: 25811, atk: 1145, matk: 290, def: 666, mdef: 571 },
  },
  {
    id: "rose_knight",
    name: "Rose Knight",
    alias: "Joan",
    cls: "STR",
    img: "/heroes/rose_knight.png",
    stats: { hp: 24851, atk: 819, matk: 663, def: 546, mdef: 913 },
  },
  {
    id: "scarlet_bolt",
    name: "Scarlet Bolt",
    alias: "Greta",
    cls: "AGI",
    img: "/heroes/scarlet_bolt.png",
    stats: { hp: 14564, atk: 2327, matk: 325, def: 235, mdef: 161 },
  },
  {
    id: "sage_of_storms",
    name: "Sage of Storms",
    alias: "Anderson",
    cls: "INT",
    img: "/heroes/sage_of_storms.png",
    stats: { hp: 11668, atk: 316, matk: 2296, def: 89, mdef: 393 },
  },
  {
    id: "sea_squire",
    name: "Sea Squire",
    alias: "Lochfin",
    cls: "INT",
    img: "/heroes/sea_squire.png",
    stats: { hp: 13468, atk: 336, matk: 2510, def: 132, mdef: 428 },
  },
  {
    id: "snow_queen",
    name: "Snow Queen",
    alias: "Alice",
    cls: "INT",
    img: "/heroes/snow_queen.png",
    stats: { hp: 10521, atk: 276, matk: 2510, def: 77, mdef: 381 },
  },
  {
    id: "shade",
    name: "Shade",
    alias: "Blink",
    cls: "AGI",
    img: "/heroes/shade.png",
    stats: { hp: 14656, atk: 2305, matk: 316, def: 161, mdef: 131 },
  },
  {
    id: "soul_forger",
    name: "Soul Forger",
    alias: "Drumyr",
    cls: "STR",
    img: "/heroes/soul_forger.png",
    stats: { hp: 29498, atk: 1134, matk: 264, def: 928, mdef: 514 },
  },
  {
    id: "trickster",
    name: "Trickster",
    alias: "Tattler",
    cls: "AGI",
    img: "/heroes/trickster.png",
    stats: { hp: 13193, atk: 2708, matk: 382, def: 176, mdef: 170 },
  },
  {
    id: "tracker",
    name: "Tracker",
    alias: "Boom-Hilda",
    cls: "AGI",
    img: "/heroes/tracker.png",
    stats: { hp: 15410, atk: 2313, matk: 273, def: 229, mdef: 196 },
  },
  {
    id: "barbarian",
    name: "Barbarian",
    alias: "Gothrak",
    cls: "STR",
    img: "/heroes/barbarian.png",
    stats: { hp: 34089, atk: 1652, matk: 276, def: 781, mdef: 259 },
  },
  {
    id: "berserker",
    name: "Berserker",
    alias: "Ursula",
    cls: "STR",
    img: "/heroes/berserker.png",
    stats: { hp: 29497, atk: 1402, matk: 356, def: 512, mdef: 605 },
  },
  {
    id: "chronicler",
    name: "Chronicler",
    alias: "Lisa",
    cls: "INT",
    img: "/heroes/chronicler.png",
    stats: { hp: 12807, atk: 413, matk: 2602, def: 285, mdef: 320 },
  },
  {
    id: "cursed_hunter",
    name: "Cursed Hunter",
    alias: "Joanna",
    cls: "AGI",
    img: "/heroes/cursed_hunter.png",
    stats: { hp: 15138, atk: 2658, matk: 381, def: 185, mdef: 179 },
  },
  {
    id: "dark_follower",
    name: "Dark Follower",
    alias: "Jonas",
    cls: "INT",
    img: "/heroes/dark_follower.png",
    stats: { hp: 11644, atk: 368, matk: 2569, def: 129, mdef: 405 },
  },
  {
    id: "dark_magister",
    name: "Dark Magister",
    alias: "Har'Kon",
    cls: "INT",
    img: "/heroes/dark_magister.png",
    stats: { hp: 13879, atk: 379, matk: 2670, def: 151, mdef: 270 },
  },
  {
    id: "dream_witch",
    name: "Dream Witch",
    alias: "Eloise",
    cls: "INT",
    img: "/heroes/dream_witch.png",
    stats: { hp: 12164, atk: 416, matk: 2477, def: 174, mdef: 378 },
  },
  {
    id: "don_guapo",
    name: "Don Guapo",
    alias: "Alfonso",
    cls: "STR",
    img: "/heroes/don_guapo.png",
    stats: { hp: 32386, atk: 1442, matk: 399, def: 365, mdef: 359 },
  },
  {
    id: "ethereal_guide",
    name: "Ethereal Guide",
    alias: "Anaya Bonn",
    cls: "AGI",
    img: "/heroes/ethereal_guide.png",
    stats: { hp: 14630, atk: 2605, matk: 361, def: 178, mdef: 159 },
  },
  {
    id: "femme_fatale",
    name: "Femme Fatale",
    alias: "Thorn",
    cls: "AGI",
    img: "/heroes/femme_fatale.png",
    stats: { hp: 15161, atk: 2582, matk: 352, def: 224, mdef: 151 },
  },
  {
    id: "flower_maiden",
    name: "Flower Maiden",
    alias: "Rolanda",
    cls: "STR",
    img: "/heroes/flower_maiden.png",
    stats: { hp: 37310, atk: 1472, matk: 335, def: 326, mdef: 352 },
  },
  {
    id: "grim_wolf",
    name: "Grim Wolf",
    alias: "Fenrir",
    cls: "AGI",
    img: "/heroes/grim_wolf.png",
    stats: { hp: 25446, atk: 2208, matk: 354, def: 216, mdef: 218 },
  },
  {
    id: "grove_guardian",
    name: "Grove Guardian",
    alias: "Forest",
    cls: "STR",
    img: "/heroes/grove_guardian.png",
    stats: { hp: 23917, atk: 2217, matk: 248, def: 345, mdef: 214 },
  },
  {
    id: "holy_sword",
    name: "Holy Sword",
    alias: "Reyna",
    cls: "AGI",
    img: "/heroes/holy_sword.png",
    stats: { hp: 17500, atk: 2500, matk: 0, def: 200, mdef: 350 },
  },
  {
    id: "incinerator",
    name: "Incinerator",
    alias: "Monica",
    cls: "INT",
    img: "/heroes/incinerator.png",
    stats: { hp: 10899, atk: 338, matk: 2813, def: 91, mdef: 396 },
  },
  {
    id: "lightweaver",
    name: "Lightweaver",
    alias: "Elora",
    cls: "AGI",
    img: "/heroes/lightweaver.png",
    stats: { hp: 14903, atk: 2796, matk: 352, def: 190, mdef: 214 },
  },
  {
    id: "lore_weaver",
    name: "Lore Weaver",
    alias: "Thaila",
    cls: "INT",
    img: "/heroes/lore_weaver.png",
    stats: { hp: 12518, atk: 385, matk: 2650, def: 193, mdef: 266 },
  },
  {
    id: "magmaroid",
    name: "Magmaroid",
    alias: "Vulcan",
    cls: "STR",
    img: "/heroes/magmaroid.png",
    stats: { hp: 32432, atk: 1431, matk: 333, def: 376, mdef: 632 },
  },
  {
    id: "mastercook",
    name: "Mastercook",
    alias: "Ramsay",
    cls: "AGI",
    img: "/heroes/mastercook.png",
    stats: { hp: 14610, atk: 2947, matk: 346, def: 240, mdef: 167 },
  },
  {
    id: "necroduke",
    name: "Necroduke",
    alias: "Lionel",
    cls: "INT",
    img: "/heroes/necroduke.png",
    stats: { hp: 15510, atk: 367, matk: 2519, def: 420, mdef: 235 },
  },
  {
    id: "oracle",
    name: "Oracle",
    alias: "Bellena",
    cls: "INT",
    img: "/heroes/oracle.png",
    stats: { hp: 12524, atk: 421, matk: 2612, def: 256, mdef: 345 },
  },
  {
    id: "petite_devil",
    name: "Petite Devil",
    alias: "Beatrix",
    cls: "INT",
    img: "/heroes/petite_devil.png",
    stats: { hp: 11068, atk: 360, matk: 3195, def: 90, mdef: 379 },
  },
  {
    id: "prince_of_thieves",
    name: "Prince of Thieves",
    alias: "Kassim",
    cls: "AGI",
    img: "/heroes/prince_of_thieves.png",
    stats: { hp: 17689, atk: 2329, matk: 392, def: 221, mdef: 211 },
  },
  {
    id: "sand_sage",
    name: "Sand Sage",
    alias: "Ilya",
    cls: "INT",
    img: "/heroes/sand_sage.png",
    stats: { hp: 11258, atk: 416, matk: 2663, def: 247, mdef: 319 },
  },
  {
    id: "shape_shifter",
    name: "Shape Shifter",
    alias: "Lilith",
    cls: "STR",
    img: "/heroes/shape_shifter.png",
    stats: { hp: 31580, atk: 903, matk: 1046, def: 723, mdef: 267 },
  },
  {
    id: "shield_maiden",
    name: "Shield Maiden",
    alias: "Marcia",
    cls: "AGI",
    img: "/heroes/shield_maiden.png",
    stats: { hp: 19079, atk: 2459, matk: 346, def: 326, mdef: 146 },
  },
  {
    id: "snail_princess",
    name: "Snail Princess",
    alias: "Shelley",
    cls: "INT",
    img: "/heroes/snail_princess.png",
    stats: { hp: 14924, atk: 385, matk: 2656, def: 135, mdef: 306 },
  },
  {
    id: "songstress_of_the_sea",
    name: "Songstress of the Sea",
    alias: "Coral",
    cls: "INT",
    img: "/heroes/songstress_of_the_sea.png",
    stats: { hp: 11610, atk: 360, matk: 2647, def: 91, mdef: 420 },
  },
  {
    id: "steambot",
    name: "Steambot",
    alias: "S.A.M.",
    cls: "STR",
    img: "/heroes/steambot.png",
    stats: { hp: 33760, atk: 1884, matk: 264, def: 698, mdef: 334 },
  },
  {
    id: "storm_fox",
    name: "Storm Fox",
    alias: "Mizuki",
    cls: "INT",
    img: "/heroes/storm_fox.png",
    stats: { hp: 13033, atk: 412, matk: 2663, def: 119, mdef: 246 },
  },
  {
    id: "the_big_guy",
    name: "The Big Guy",
    alias: "One Eye",
    cls: "STR",
    img: "/heroes/the_big_guy.png",
    stats: { hp: 32043, atk: 1427, matk: 296, def: 755, mdef: 303 },
  },
  {
    id: "twilight_priestess",
    name: "Twilight Priestess",
    alias: "Kauket",
    cls: "INT",
    img: "/heroes/twilight_priestess.png",
    stats: { hp: 14363, atk: 292, matk: 2559, def: 390, mdef: 226 },
  },
  {
    id: "vengeful_centaur",
    name: "Vengeful Centaur",
    alias: "Tarkus",
    cls: "STR",
    img: "/heroes/vengeful_centaur.png",
    stats: { hp: 33035, atk: 1434, matk: 324, def: 463, mdef: 187 },
  },
  {
    id: "wandering_alchemist",
    name: "Wandering Alchemist",
    alias: "Kimiya",
    cls: "INT",
    img: "/heroes/wandering_alchemist.png",
    stats: { hp: 11779, atk: 382, matk: 2589, def: 245, mdef: 201 },
  },
  {
    id: "wave_crasher",
    name: "Wave Crasher",
    alias: "Austin",
    cls: "AGI",
    img: "/heroes/wave_crasher.png",
    stats: { hp: 33722, atk: 1487, matk: 398, def: 271, mdef: 162 },
  },
  {
    id: "witch_doll",
    name: "Witch Doll",
    alias: "Astre",
    cls: "INT",
    img: "/heroes/witch_doll.png",
    stats: { hp: 13626, atk: 333, matk: 2594, def: 251, mdef: 314 },
  },
  {
    id: "prima_donna",
    name: "Prima Donna",
    alias: "Donatienne",
    cls: "INT",
    img: "/heroes/prima_donna.png",
    stats: { hp: 10447, atk: 388, matk: 2203, def: 113, mdef: 329 },
  },
  {
    id: "watchman",
    name: "Watcher",
    alias: "Deeproot",
    cls: "STR",
    img: "/heroes/watchman.png",
    stats: { hp: 37172, atk: 930, matk: 494, def: 555, mdef: 505 },
  },
  {
    id: "elementalist",
    name: "Elementalist",
    alias: "Élémentaliste",
    cls: "INT",
    img: "/heroes/elementalist.png",
    stats: { hp: 10466, atk: 246, matk: 2517, def: 62, mdef: 340 },
  },
  {
    id: "chaos_dragon",
    name: "Chaos Dragon",
    alias: "Gravios",
    cls: "AGI",
    img: "/heroes/chaos_dragon.png",
    stats: { hp: 19616, atk: 2935, matk: 358, def: 212, mdef: 202 },
  },
  {
    id: "pegasus",
    name: "Pegasus",
    alias: "Seiya",
    cls: "STR",
    img: "/heroes/pegasus.png",
    stats: { hp: 30355, atk: 1966, matk: 277, def: 282, mdef: 149 },
  },
  {
    id: "stellina_unicorno",
    name: "Stellina Unicorno",
    alias: "Stellina",
    cls: "AGI",
    img: "/heroes/stellina_unicorno.png",
    stats: { hp: 17200, atk: 2500, matk: 0, def: 200, mdef: 350 },
  },
];

// ============================================================
// CLASSES
// ============================================================

export const CLASSES: HeroClass[] = ["STR", "AGI", "INT"];

export const CLASS_BEATS: Record<HeroClass, HeroClass> = {
  AGI: "INT",
  INT: "STR",
  STR: "AGI",
};

export const CLASS_TEXT: Record<HeroClass, string> = {
  STR: "text-rose-300",
  AGI: "text-emerald-300",
  INT: "text-sky-300",
};

// ============================================================
// FORMATAGE DES STATISTIQUES
// ============================================================

export function formatStat(n: number): string {
  return n.toLocaleString("fr-FR");
}
