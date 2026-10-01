import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const envPath = path.join(projectRoot, filename);
    if (!fs.existsSync(envPath)) continue;

    for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;

      const separator = line.indexOf("=");
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadLocalEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Variables Supabase manquantes : VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PAGE_SIZE = 1000;
const STAT_NAMES = ["hp", "atk", "matk", "def", "mdef"];
const STAT_LABELS = {
  hp: "PV",
  atk: "ATK",
  matk: "MATK",
  def: "DEF",
  mdef: "MDEF",
};

const boundsFile = JSON.parse(
  fs.readFileSync(
    path.join(projectRoot, "data", "theoretical-bounds.json"),
    "utf8"
  )
);

function getPosition(value, stat) {
  const bounds = boundsFile.stats[stat];
  const min = bounds.min.value;
  const max = bounds.max.value;
  return max === min ? 0 : ((value - min) / (max - min)) * 20;
}

function getValue(combat, side, stat) {
  return combat[(side === "my" ? "my_" : "enemy_") + stat];
}

async function loadCombats() {
  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("combats")
      .select(
        "won,my_hp,my_atk,my_matk,my_def,my_mdef,enemy_hp,enemy_atk,enemy_matk,enemy_def,enemy_mdef"
      )
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows;
}

function buildCurves(combats) {
  return STAT_NAMES.flatMap((myStat) =>
    STAT_NAMES.map((enemyStat) => {
      const bins = new Map();

      for (let x = -20; x <= 20; x++) {
        bins.set(x, { wins: 0, losses: 0 });
      }

      for (const combat of combats) {
        for (const side of ["my", "enemy"]) {
          const opponent = side === "my" ? "enemy" : "my";
          const won = side === "my" ? combat.won : !combat.won;

          const myPosition = getPosition(
            getValue(combat, side, myStat),
            myStat
          );
          const enemyPosition = getPosition(
            getValue(combat, opponent, enemyStat),
            enemyStat
          );

          const difference = Math.max(
            -20,
            Math.min(20, Math.round(myPosition - enemyPosition))
          );

          const point = bins.get(difference);
          if (won) point.wins++;
          else point.losses++;
        }
      }

      return {
        key: myStat + "Vs" + enemyStat,
        myStat,
        enemyStat,
        label:
          STAT_LABELS[myStat] +
          " de notre équipe vs " +
          STAT_LABELS[enemyStat] +
          " ennemis",
        points: [...bins.entries()]
          .filter(([, value]) => value.wins + value.losses > 0)
          .map(([x, value]) => ({
            x,
            wins: value.wins,
            losses: value.losses,
            observations: value.wins + value.losses,
            winRate: value.wins / (value.wins + value.losses),
          })),
      };
    })
  );
}

function buildHtml(curves, combatCount) {
  const data = {
    generatedAt: new Date().toISOString(),
    combats: combatCount,
    observations: combatCount * 2,
    curves,
  };

  const html = [
    '<!doctype html>',
    '<html lang="fr">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Stat Relations — 25 courbes</title>",
    "<style>",
    ':root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#030712;color:#e5e7eb}',
    "*{box-sizing:border-box}",
    "body{margin:0;background:radial-gradient(circle at top,rgba(59,130,246,.08),transparent 34rem),#030712}",
    "header{padding:28px 32px 20px;border-bottom:1px solid #1f2937;background:rgba(3,7,18,.94);position:sticky;top:0;z-index:10;backdrop-filter:blur(10px)}",
    "h1{margin:0 0 8px;font-size:26px}",
    ".subtitle{color:#9ca3af;margin-bottom:14px}",
    ".meta{display:flex;flex-wrap:wrap;gap:8px 18px;color:#cbd5e1;font-size:13px}",
    ".legend{margin-top:14px;color:#9ca3af;font-size:13px;line-height:1.55}",
    "main{max-width:1800px;margin:0 auto;padding:22px}",
    ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(520px,1fr));gap:18px}",
    ".card{border:1px solid #1f2937;border-radius:12px;background:rgba(8,15,30,.92);padding:14px;box-shadow:0 12px 30px rgba(0,0,0,.16)}",
    ".card h2{margin:0 0 3px;font-size:16px}",
    ".question{color:#9ca3af;font-size:12px;margin-bottom:8px}",
    ".chart{width:100%;height:auto;display:block;overflow:visible}",
    ".stats{display:flex;justify-content:space-between;gap:10px;color:#9ca3af;font-size:11px;margin-top:4px}",
    "@media(max-width:700px){header{padding:20px 16px}main{padding:12px}.grid{grid-template-columns:1fr}}",
    "</style>",
    "</head>",
    "<body>",
    "<header>",
    "<h1>Analyse des relations statistiques — 25 courbes</h1>",
    '<div class="subtitle">Historique réel · 2 perspectives par combat · aucune règle de seuil imposée</div>',
    '<div class="meta"><span id="combatCount"></span><span id="observationCount"></span><span id="generatedAt"></span></div>',
    '<div class="legend"><strong>X :</strong> écart relatif sur une échelle -20 → +20. 0 = même position relative. Positif = notre statistique est relativement plus haute. <strong>Y :</strong> taux de victoire. La ligne pointillée représente 50 %. Survole un point pour voir son échantillon.</div>',
    "</header>",
    '<main><div class="grid" id="grid"></div></main>',
    "<script>",
    "const DATA = " + JSON.stringify(data) + ";",
    'const LABELS={hp:"PV",atk:"ATK",matk:"MATK",def:"DEF",mdef:"MDEF"};',
    "const W=900,H=310,P={l:54,r:18,t:24,b:42},PW=W-P.l-P.r,PH=H-P.t-P.b;",
    "const xp=x=>P.l+((x+20)/40)*PW;",
    "const yp=y=>P.t+(1-y)*PH;",
    'function esc(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll(\'"\',"&quot;")}',
    "function chart(c){",
    "const grid=[0,.25,.5,.75,1].map(y=>{const py=yp(y);return '<line x1=\"'+P.l+'\" y1=\"'+py+'\" x2=\"'+(W-P.r)+'\" y2=\"'+py+'\" stroke=\"'+(y===.5?'#94a3b8':'#1e293b')+'\" stroke-width=\"'+(y===.5?1.4:1)+'\" '+(y===.5?'stroke-dasharray=\"5 4\"':'')+'/><text x=\"'+(P.l-8)+'\" y=\"'+(py+4)+'\" text-anchor=\"end\" fill=\"#94a3b8\" font-size=\"11\">'+Math.round(y*100)+'%</text>'}).join('');",
    "const xt=[-20,-10,0,10,20].map(x=>{const px=xp(x);return '<line x1=\"'+px+'\" y1=\"'+P.t+'\" x2=\"'+px+'\" y2=\"'+(H-P.b)+'\" stroke=\"#111827\"/><text x=\"'+px+'\" y=\"'+(H-17)+'\" text-anchor=\"middle\" fill=\"#94a3b8\" font-size=\"11\">'+(x>0?'+':'')+x+'</text>'}).join('');",
    "const pts=c.points;",
    "const poly=pts.map(p=>xp(p.x)+','+yp(p.winRate)).join(' ');",
    "const circles=pts.map(p=>{const title='Écart '+(p.x>0?'+':'')+p.x+' · '+(p.winRate*100).toFixed(1)+'% WIN · '+p.wins+' WIN / '+p.losses+' LOSS · '+p.observations+' combats';return '<circle cx=\"'+xp(p.x)+'\" cy=\"'+yp(p.winRate)+'\" r=\"4.5\" fill=\"#f59e0b\" stroke=\"#030712\" stroke-width=\"1.5\"><title>'+esc(title)+'</title></circle>'}).join('');",
    "const total=pts.reduce((s,p)=>s+p.observations,0);",
    "return '<svg class=\"chart\" viewBox=\"0 0 '+W+' '+H+'\" aria-label=\"'+esc(c.label)+'\">'+grid+xt+'<polyline points=\"'+poly+'\" fill=\"none\" stroke=\"#f59e0b\" stroke-width=\"2.5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/>'+circles+'<text x=\"'+W/2+'\" y=\"'+(H-2)+'\" text-anchor=\"middle\" fill=\"#64748b\" font-size=\"11\">Écart relatif : '+LABELS[c.myStat]+' notre équipe − '+LABELS[c.enemyStat]+' ennemis</text></svg><div class=\"stats\"><span>écart observé : '+(pts.length?pts[0].x+' → '+pts[pts.length-1].x:'aucune donnée')+'</span><span>'+total+' observations</span></div>';",
    "}",
    'document.getElementById("combatCount").textContent=DATA.combats+" combats actifs";',
    'document.getElementById("observationCount").textContent=DATA.observations+" observations";',
    'document.getElementById("generatedAt").textContent="Généré le "+new Date(DATA.generatedAt).toLocaleString("fr-FR");',
    'const grid=document.getElementById("grid");',
    "for(const c of DATA.curves){const card=document.createElement('section');card.className='card';const question='Est-ce que mes '+LABELS[c.myStat]+' sont importants face à la '+LABELS[c.enemyStat]+' ennemie ?';card.innerHTML='<h2>'+esc(c.label)+'</h2><div class=\"question\">'+esc(question)+'</div>'+chart(c);grid.appendChild(card)}",
    "</script>",
    "</body>",
    "</html>",
  ];

  return html.join("\\n");
}

const combats = await loadCombats();

if (!combats.length) {
  throw new Error("Aucun combat actif trouvé dans Supabase.");
}

const curves = buildCurves(combats);
const outputPath = path.join(projectRoot, "public", "curves.html");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, buildHtml(curves, combats.length), "utf8");

console.log("");
console.log("=== COURBES DES 25 RELATIONS ===");
console.log("Combats actifs :", combats.length);
console.log("Courbes        :", curves.length);
console.log("Fichier créé   :", outputPath);
