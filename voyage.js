// Le voyage : chaque point de score éloigne le joueur de la Terre.
// pts = score à atteindre pour arriver à l'étape ; km = distance approximative depuis la Terre.
(() => {
  const AL = 9.4607e12, UA = 1.496e8;
  const ETAPES = [
    { pts: 0,   nom: "La Terre",                 km: 0,            img: "terre",            texte: "Le voyage commence ici, sur notre planète bleue." },
    { pts: 15,  nom: "La Station spatiale",      km: 400,          img: "iss",              texte: "Tu tournes autour de la Terre à 28 000 km/h." },
    { pts: 40,  nom: "La Lune",                  km: 384400,       img: "lune",             texte: "Là où l'humanité a posé le pied en 1969." },
    { pts: 75,  nom: "Le Soleil",                km: 1 * UA,       img: "soleil",           texte: "Sa lumière met 8 minutes à arriver jusqu'à la Terre." },
    { pts: 110, nom: "Jupiter",                  km: 5.2 * UA,     img: "jupiter",          texte: "La plus grosse planète du système solaire." },
    { pts: 145, nom: "Saturne",                  km: 9.5 * UA,     img: "saturne",          texte: "Ses anneaux font 280 000 km de large." },
    { pts: 180, nom: "Neptune",                  km: 30 * UA,      img: "neptune",          texte: "La dernière planète : la lumière du Soleil y met 4 heures." },
    { pts: 225, nom: "Voyager 1",                km: 165 * UA,     img: "voyager",          texte: "La sonde la plus lointaine jamais envoyée. La Terre n'est plus qu'un point." },
    { pts: 270, nom: "Alpha du Centaure",        km: 4.37 * AL,    img: "alpha-centauri",   texte: "Les étoiles les plus proches du Soleil." },
    { pts: 320, nom: "La nébuleuse d'Orion",     km: 1344 * AL,    img: "orion",            texte: "Une pouponnière où naissent des milliers d'étoiles." },
    { pts: 370, nom: "Le centre de la Voie lactée", km: 26000 * AL, img: "centre-galactique", texte: "Au cœur de notre galaxie dort un trou noir géant." },
    { pts: 420, nom: "Le Grand Nuage de Magellan", km: 160000 * AL, img: "magellan",        texte: "Tu as quitté la Voie lactée : voici une galaxie voisine." },
    { pts: 475, nom: "La galaxie d'Andromède",   km: 2.5e6 * AL,   img: "andromede",        texte: "La grande sœur de la Voie lactée, dans le Groupe local." },
    { pts: 535, nom: "L'amas de la Vierge",      km: 5.4e7 * AL,   img: "vierge",           texte: "Plus de mille galaxies serrées les unes contre les autres." },
    { pts: 610, nom: "L'amas Abell 2744",        km: 4e9 * AL,     img: "amas",             texte: "Un amas si massif qu'il courbe la lumière des galaxies derrière lui." },
    { pts: 690, nom: "Le bout de l'univers visible", km: 1.32e10 * AL, img: "deep-field",   texte: "Les galaxies les plus lointaines jamais photographiées. Tu as trouvé la perle rare." },
  ];

  const CREDITS = [
    ["La Terre", "NASA (Apollo 17)", "as17-148-22727"],
    ["La Station spatiale", "NASA (Expédition 56)", "iss056e201248"],
    ["La Lune", "NASA Goddard", "GSFC_20171208_Archive_e000868"],
    ["Le Soleil", "NASA Goddard / SDO", "GSFC_20171208_Archive_e000790"],
    ["Jupiter", "NASA/JPL/Space Science Institute (Cassini)", "PIA04866"],
    ["Saturne", "NASA/JPL/Space Science Institute (Cassini)", "PIA11141"],
    ["Neptune", "NASA/JPL (Voyager 2)", "PIA01492"],
    ["Voyager 1", "NASA/JPL-Caltech (« Pale Blue Dot Revisited »)", "PIA23645"],
    ["Alpha du Centaure", "NASA/ESA (Hubble)", "GSFC_20171208_Archive_e000214"],
    ["La nébuleuse d'Orion", "NASA et Hubble Heritage Team STScI/AURA", "PIA04227"],
    ["Le centre de la Voie lactée", "NASA/JPL-Caltech/ESA/CXC/STScI", "PIA12348"],
    ["Le Grand Nuage de Magellan", "NASA/JPL-Caltech/STScI (Spitzer)", "PIA07137"],
    ["La galaxie d'Andromède", "NASA/JPL/Caltech (GALEX)", "PIA04921"],
    ["L'amas de la Vierge", "NASA/JPL-Caltech/SSC", "PIA07906"],
    ["L'amas Abell 2744", "NASA/ESA/STScI (Hubble)", "PIA17569"],
    ["Le bout de l'univers visible", "NASA/ESA (Hubble eXtreme Deep Field)", "GSFC_20171208_Archive_e001651"],
  ];

  function indexEtape(score) {
    let i = 0;
    while (i + 1 < ETAPES.length && score >= ETAPES[i + 1].pts) i++;
    return i;
  }

  // Distance pour un score donné : interpolation logarithmique entre deux étapes.
  function kmPour(score) {
    const i = indexEtape(score), a = ETAPES[i], b = ETAPES[i + 1];
    if (!b) return a.km;
    const t = (score - a.pts) / (b.pts - a.pts);
    if (a.km === 0) return b.km * t;
    return Math.exp(Math.log(a.km) + t * (Math.log(b.km) - Math.log(a.km)));
  }

  const fr = (n, dec = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: dec, minimumFractionDigits: 0 });
  function grand(n, unite) {
    if (n >= 1e9) return `${fr(n / 1e9, n < 1e10 ? 1 : 0)} milliard${n >= 2e9 ? "s" : ""} ${unite}`;
    if (n >= 1e6) return `${fr(n / 1e6, n < 1e7 ? 1 : 0)} million${n >= 2e6 ? "s" : ""} ${unite}`;
    return `${fr(n, n < 10 ? 1 : 0)} ${unite}`;
  }
  function formatDistance(km) {
    if (km < 1) return "0 km";
    if (km < 1e6) return `${fr(Math.round(km))} km`;
    if (km < 1e12) return grand(km, "de km");
    const al = km / AL;
    if (al < 1e6) return `${fr(al, al < 1 ? 2 : al < 10 ? 1 : 0)} année${al >= 2 ? "s" : ""}-lumière`;
    return grand(al, "d'années-lumière");
  }

  window.VOYAGE = { ETAPES, CREDITS, indexEtape, kmPour, formatDistance };
})();
