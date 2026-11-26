// Logique principale de « La Perle Rare ».
(() => {
  "use strict";

  // ---------- Barème et réglages ----------
  const NIVEAUX = [
    { nom: "Évident",    pts: 10,  emoji: "⚪", coul: "var(--t0)", hex: ["#ffffff", "#d9d4cf"] },
    { nom: "Classique",  pts: 25,  emoji: "🔵", coul: "var(--t1)", hex: ["#7fb4ff", "#cfe2ff"] },
    { nom: "Bien vu",    pts: 50,  emoji: "🟢", coul: "var(--t2)", hex: ["#5fd3a2", "#b8f5d9"] },
    { nom: "Rare",       pts: 75,  emoji: "🟣", coul: "var(--t3)", hex: ["#c58cff", "#ead6ff", "#7fb4ff"] },
    { nom: "Perle rare", pts: 100, emoji: "💎", coul: "var(--t4)", hex: ["#ffd56b", "#fff4cf", "#ffffff", "#e9c46a", "#c58cff"] },
  ];
  const COMMENTAIRES = {
    "-1": ["Le temps file plus vite que la lumière…", "Trop tard ! Les étoiles n'attendent pas.", "Silence radio…"],
    0: ["Comme tout le monde !", "La moitié de la planète a dit pareil.", "Réponse validée… mais très fréquentée."],
    1: ["Solide, mais attendu.", "Pas mal, tu peux viser plus loin.", "Correct, sans surprise."],
    2: ["Bien vu !", "Là, tu commences à sortir du lot.", "Joli, ça décolle !"],
    3: ["Très peu de gens y auraient pensé.", "Une réponse de connaisseur !", "Tu sors des sentiers battus."],
    4: ["Personne n'y avait pensé. Perle rare !", "Légendaire. Tu tiens la perle rare.", "Incroyable trouvaille !"],
  };
  const DIFFICULTES = {
    decouverte: { nom: "Découverte", duree: 40, indice: true, xp: 0.8, detail: "40 s · indices" },
    classique:  { nom: "Classique",  duree: 25, indice: false, xp: 1,   detail: "25 s" },
    expert:     { nom: "Expert",     duree: 15, indice: false, xp: 1.5, detail: "15 s · XP ×1,5" },
  };
  const GRADES = [
    [0, "Mousse de l'espace", "🧑‍🚀"], [300, "Cadet", "🛰️"], [1000, "Pilote", "🚀"], [2500, "Navigateur", "🧭"],
    [5000, "Capitaine", "🪐"], [9000, "Commandant", "☄️"], [15000, "Amiral", "🌌"], [25000, "Légende cosmique", "💫"],
  ];
  const NB_THEMES = 7;
  const DEBUT = new Date(2026, 10, 26); // partie du jour n°1

  // ---------- Outils ----------
  const $ = id => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem("perle." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("perle." + k, JSON.stringify(v)); } catch {} },
  };
  const hasard = tab => tab[Math.floor(Math.random() * tab.length)];
  function mulberry32(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function melanger(tab, rnd) {
    const a = tab.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function echap(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }
  function toast(txt) { const t = $("toast"); t.textContent = txt; t.classList.add("visible"); setTimeout(() => t.classList.remove("visible"), 1800); }
  function compter(el, de, a, duree = 900, prefixe = "") {
    const t0 = performance.now();
    const pas = now => {
      const t = Math.min(1, (now - t0) / duree), e = 1 - Math.pow(1 - t, 3);
      el.textContent = prefixe + Math.round(de + (a - de) * e).toLocaleString("fr-FR");
      if (t < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }

  // Normalise une réponse : minuscules, sans accents, sans article, sans pluriel, sans espaces ni tirets.
  function normaliser(s) {
    s = s.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/\+/g, " plus ").replace(/#/g, " sharp ")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim()
      .replace(/^(le|la|les|l|un|une|des|du|de la|de l|d) /, "");
    return s.split(" ").map(m => m.length > 3 ? m.replace(/[sx]$/, "") : m).join("");
  }
  function levenshtein(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 99;
    let prec = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cour = [i];
      for (let j = 1; j <= b.length; j++)
        cour[j] = Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prec = cour;
    }
    return prec[b.length];
  }

  // ---------- Index des thèmes ----------
  const THEMES = window.THEMES.map(t => {
    const index = new Map(), entrees = [];
    t.niveaux.forEach((ligne, niveau) => ligne.split("|").forEach(brut => {
      const variantes = brut.split("/").map(v => v.trim()).filter(Boolean);
      if (!variantes.length) return;
      const e = { nom: variantes[0], niveau };
      entrees.push(e);
      variantes.forEach(v => { const k = normaliser(v); if (k && !index.has(k)) index.set(k, e); });
    }));
    return { ...t, index, entrees };
  });

  function chercher(theme, saisie) {
    const k = normaliser(saisie);
    if (!k) return null;
    if (theme.index.has(k)) return theme.index.get(k);
    const tolerance = k.length >= 8 ? 2 : k.length >= 5 ? 1 : 0;
    if (!tolerance) return null;
    let meilleur = null, dist = tolerance + 1;
    for (const [cle, e] of theme.index) {
      if (Math.abs(cle.length - k.length) > tolerance) continue;
      const d = levenshtein(k, cle);
      if (d < dist) { dist = d; meilleur = e; }
    }
    return meilleur;
  }

  // ---------- Profil, progression et badges ----------
  const PROFIL_VIDE = { xp: 0, parties: 0, meilleur: 0, cumul: 0, repartition: [0, 0, 0, 0, 0, 0], reponses: 0,
    recordEtape: 0, jours: [], serieMax: 0, themesVus: {}, badges: {}, drapeaux: {} };
  let profil = Object.assign(structuredClone(PROFIL_VIDE), store.get("profil", {}));
  const sauverProfil = () => store.set("profil", profil);

  function grade(xp) {
    let i = 0; while (i + 1 < GRADES.length && xp >= GRADES[i + 1][0]) i++;
    const [seuil, nom, icone] = GRADES[i], suivant = GRADES[i + 1];
    const pct = suivant ? (xp - seuil) / (suivant[0] - seuil) * 100 : 100;
    return { i, nom, icone, pct, suivant };
  }
  function serieActuelle() {
    const j = new Set(profil.jours), auj = numeroDuJour();
    let n = 0, d = j.has(auj) ? auj : auj - 1;
    while (j.has(d)) { n++; d--; }
    return n;
  }

  const BADGES = [
    ["premiers_pas", "👣", "Premiers pas", "Terminer une partie", p => p.parties >= 1],
    ["premiere_perle", "💎", "Première perle", "Trouver une perle rare", p => p.repartition[4] >= 1],
    ["collectionneur", "🦪", "Collectionneur", "Trouver 25 perles rares", p => p.repartition[4] >= 25],
    ["lune", "🌕", "Clair de Lune", "Atteindre la Lune", p => p.recordEtape >= 2],
    ["soleil", "☀️", "Icare", "Atteindre le Soleil", p => p.recordEtape >= 3],
    ["neptune", "🔵", "Aux confins", "Atteindre Neptune", p => p.recordEtape >= 6],
    ["etoiles", "✨", "Interstellaire", "Atteindre Alpha du Centaure", p => p.recordEtape >= 8],
    ["galaxie", "🌀", "Hors de la Voie lactée", "Atteindre le Grand Nuage de Magellan", p => p.recordEtape >= 11],
    ["andromede", "🌌", "Groupe local", "Atteindre Andromède", p => p.recordEtape >= 12],
    ["univers", "🔭", "Au bout de tout", "Atteindre le bout de l'univers visible", p => p.recordEtape >= 15],
    ["sans_faute", "✅", "Sans faute", "Répondre aux 7 thèmes d'une partie", p => p.drapeaux.sans_faute],
    ["joaillier", "👑", "Joaillier", "3 perles rares dans une même partie", p => p.drapeaux.joaillier],
    ["eclair", "⚡", "Éclair", "Bien répondre en moins de 3 secondes", p => p.drapeaux.eclair],
    ["serie3", "🔥", "En feu", "Jouer 3 jours de suite", p => p.serieMax >= 3],
    ["serie7", "🌋", "Inarrêtable", "Jouer 7 jours de suite", p => p.serieMax >= 7],
    ["expert", "🎯", "Sang-froid", "Terminer une partie en Expert", p => p.drapeaux.expert],
    ["sans_filet", "🧠", "Sans filet", "Trouver une perle rare en Expert", p => p.drapeaux.sans_filet],
    ["explorateur", "🗺️", "Explorateur", "Jouer 30 thèmes différents", p => Object.keys(p.themesVus).length >= 30],
    ["centurion", "💯", "Centurion", "Donner 100 bonnes réponses", p => p.reponses >= 100],
    ["defi", "🤝", "Défi relevé", "Battre le score d'un ami", p => p.drapeaux.defi],
    ["grade", "🚀", "Pilote confirmé", "Atteindre le grade de Pilote", p => p.xp >= 1000],
    ["amiral", "🌠", "Amiral", "Atteindre le grade d'Amiral", p => p.xp >= 15000],
  ];
  const fileBadges = [];
  function verifierBadges() {
    let nouveaux = 0;
    for (const [id, icone, nom] of BADGES) {
      const def = BADGES.find(b => b[0] === id);
      if (!profil.badges[id] && def[4](profil)) { profil.badges[id] = Date.now(); fileBadges.push([icone, nom]); nouveaux++; }
    }
    if (nouveaux) { sauverProfil(); if (fileBadges.length === nouveaux) afficherBadge(); }
  }
  function afficherBadge() {
    const b = fileBadges[0]; if (!b) return;
    const el = $("badgeToast");
    if (fileBadges.length >= 3) { // plusieurs d'un coup : un seul message groupé
      const n = fileBadges.length;
      fileBadges.splice(0, n - 1, ["🏅", `${n} badges : ${fileBadges.map(x => x[0]).join(" ")}`]);
      el.innerHTML = `<span>🏅</span><div><small>${n} badges débloqués</small><b>${fileBadges[0][1].split(": ")[1]}</b></div>`;
    } else el.innerHTML = `<span>${b[0]}</span><div><small>Badge débloqué</small><b>${echap(b[1])}</b></div>`;
    el.classList.add("visible"); Effets.son("badge");
    setTimeout(() => { el.classList.remove("visible"); setTimeout(() => { fileBadges.shift(); afficherBadge(); }, 600); }, 2600);
  }

  // ---------- Sélection des thèmes ----------
  function numeroDuJour() {
    const a = new Date(); a.setHours(0, 0, 0, 0);
    return Math.round((a - DEBUT) / 86400000) + 1;
  }
  function themesPour(graine) {
    return melanger(THEMES.map((_, i) => i), mulberry32(graine)).slice(0, NB_THEMES);
  }

  // ---------- Difficulté ----------
  let difficulte = store.get("difficulte", "classique");
  if (!DIFFICULTES[difficulte]) difficulte = "classique";
  function dessinerDifficultes() {
    document.querySelectorAll(".difficultes").forEach(zone => {
      zone.innerHTML = Object.entries(DIFFICULTES).map(([id, d]) =>
        `<button data-diff="${id}" class="${id === difficulte ? "choisi" : ""}"><b>${d.nom}</b><small>${d.detail}</small></button>`).join("");
    });
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-diff]"); if (!b) return;
    difficulte = b.dataset.diff; store.set("difficulte", difficulte); dessinerDifficultes(); Effets.son("clic");
  });

  // ---------- Défi entre amis ----------
  const q = new URLSearchParams(location.search);
  const defi = (() => { const n = parseInt(q.get("partie") || q.get("game"), 10), s = parseInt(q.get("defi"), 10); return n > 0 && s >= 0 ? { num: n, score: s } : null; })();

  // ---------- État de la partie ----------
  let partie = null, chrono = null;

  function nouvellePartie(mode, num, themeUnique) {
    let ids;
    if (mode === "jour") ids = themesPour(num * 2654435761 % 4294967296);
    else if (mode === "illimite") ids = themesPour(num * 40503 + 977);
    else ids = [themeUnique];
    const diff = mode === "jour" ? "classique" : difficulte;
    partie = { mode, num, ids, i: 0, resultats: [], diff };
    lancerTheme();
  }

  function lancerTheme() {
    const t = THEMES[partie.ids[partie.i]], d = DIFFICULTES[partie.diff];
    $("jeuMode").textContent = libelleMode();
    $("jeuScore").textContent = total();
    $("jeuNumero").textContent = (partie.ids.length > 1 ? `Thème ${partie.i + 1} / ${partie.ids.length}` : "Entraînement") + (partie.diff !== "classique" ? ` · ${d.nom}` : "");
    $("jeuConsigne").textContent = t.consigne;
    $("retour").textContent = ""; $("retour").className = "retour";
    $("saisie").value = "";
    $("btnIndice").hidden = !d.indice; $("btnIndice").disabled = false;
    partie.indice = false;
    dessinerCollier("collier");
    voyageVisible(partie.mode);
    majVoyage(document.querySelector("#eJeu .voyage"), total());
    if (partie.mode !== "entrainement") Fond.poser(V.indexEtape(total()));
    afficher("eJeu");
    setTimeout(() => $("saisie").focus(), 50);

    const duree = d.duree * 1000, debut = performance.now(), fin = debut + duree;
    partie.debut = debut;
    let derniereSeconde = d.duree + 1;
    $("chrono").classList.remove("urgence");
    cancelAnimationFrame(chrono);
    const tick = () => {
      const reste = Math.max(0, fin - performance.now()), sec = Math.ceil(reste / 1000);
      $("chronoBarre").style.transform = `scaleX(${reste / duree})`;
      $("chronoTexte").textContent = sec;
      if (reste < 6000) $("chrono").classList.add("urgence");
      if (sec !== derniereSeconde) { if (sec <= 5 && sec > 0) Effets.son("tic"); derniereSeconde = sec; }
      if (reste <= 0) { Effets.son("fin"); return terminerTheme(null, ""); }
      chrono = requestAnimationFrame(tick);
    };
    chrono = requestAnimationFrame(tick);
  }

  $("formSaisie").addEventListener("submit", ev => {
    ev.preventDefault();
    if (!partie || !$("eJeu").classList.contains("actif")) return;
    const saisie = $("saisie").value.trim();
    if (!saisie) return;
    const t = THEMES[partie.ids[partie.i]];
    const e = chercher(t, saisie);
    if (e) return terminerTheme(e, saisie);
    Effets.son("faux");
    $("retour").textContent = `« ${saisie} » n'est pas dans nos fiches. Essaie autre chose !`;
    $("retour").className = "retour erreur";
    const f = $("formSaisie"); f.classList.remove("secoue"); void f.offsetWidth; f.classList.add("secoue");
    $("saisie").select();
  });

  // Indice (mode Découverte) : le début d'une réponse peu courante.
  $("btnIndice").onclick = () => {
    const t = THEMES[partie.ids[partie.i]];
    const choix = t.entrees.filter(e => e.niveau >= 2 && e.niveau <= 3 && e.nom.length >= 4);
    const e = hasard(choix.length ? choix : t.entrees);
    const lettres = e.nom.replace(/[^\p{L}]/gu, "").length;
    $("retour").className = "retour";
    $("retour").textContent = `💡 Pense à « ${e.nom.slice(0, 2)}… » (${lettres} lettres)`;
    $("btnIndice").disabled = true; partie.indice = true;
    $("saisie").focus();
  };

  function terminerTheme(entree, saisie) {
    cancelAnimationFrame(chrono);
    const t = THEMES[partie.ids[partie.i]];
    const temps = (performance.now() - partie.debut) / 1000;
    const r = { theme: t.id, consigne: t.consigne, saisie, nom: entree ? entree.nom : null, niveau: entree ? entree.niveau : -1, indice: partie.indice, temps };
    partie.resultats.push(r);

    // Statistiques par réponse
    profil.repartition[r.niveau >= 0 ? r.niveau : 5]++;
    profil.themesVus[t.id] = 1;
    if (r.niveau >= 0) {
      profil.reponses++;
      if (temps < 3) profil.drapeaux.eclair = true;
      if (r.niveau === 4 && partie.diff === "expert") profil.drapeaux.sans_filet = true;
    }
    sauverProfil(); verifierBadges();
    sauverEnCours();
    montrerVerdict(r, t);
  }

  function montrerVerdict(r, t) {
    dessinerCollier("collier2", partie.resultats, partie.i, true);
    $("vConsigne").textContent = t.consigne;
    const perle = $("vPerle"), pts = $("vPoints");
    if (r.niveau >= 0) {
      const n = NIVEAUX[r.niveau];
      perle.style.cssText = `background:radial-gradient(circle at 35% 30%, #fff, ${n.coul} 45%, rgba(0,0,0,.35) 120%);box-shadow:0 8px 30px ${n.coul}`;
      $("vReponse").textContent = r.nom;
      $("vEtiquette").textContent = n.nom; $("vEtiquette").style.background = n.coul; $("vEtiquette").hidden = false;
    } else {
      perle.style.cssText = "background:transparent;border:3px dashed var(--danger)";
      $("vReponse").textContent = "Temps écoulé";
      $("vEtiquette").hidden = true;
    }
    $("vCommentaire").textContent = hasard(COMMENTAIRES[r.niveau]);
    const gain = r.niveau >= 0 ? NIVEAUX[r.niveau].pts : 0;
    pts.classList.remove("compte"); void pts.offsetWidth; pts.classList.add("compte");
    compter(pts, 0, gain, 700, "+");
    const dernier = partie.i + 1 >= partie.ids.length;
    $("btnSuivant").textContent = dernier ? "Voir mon résultat" : "Thème suivant";
    afficher("eVerdict");
    if (r.niveau >= 0) {
      Effets.son("bonne", r.niveau);
      setTimeout(() => Effets.explosion(perle, NIVEAUX[r.niveau].hex, r.niveau), 120);
    }
    if (partie.mode !== "entrainement") {
      const apres = total(), avant = apres - gain;
      animerVoyage($("voyageVerdict"), avant, apres).then(() => $("btnSuivant").focus());
    } else $("btnSuivant").focus();
  }

  $("btnSuivant").onclick = () => {
    partie.i++;
    if (partie.i < partie.ids.length) lancerTheme(); else finDePartie();
  };

  function finDePartie() {
    const sc = total(), max = partie.ids.length * 100, d = DIFFICULTES[partie.diff];
    const multi = partie.mode === "entrainement" ? 1 : NB_THEMES;
    const xp = Math.round(sc * d.xp + (partie.mode === "entrainement" ? 0 : 25));
    const gradeAvant = grade(profil.xp).i;
    profil.xp += xp;
    profil.cumul += sc;
    if (partie.mode !== "entrainement") {
      profil.parties++;
      profil.meilleur = Math.max(profil.meilleur, sc);
      profil.recordEtape = Math.max(profil.recordEtape, V.indexEtape(sc));
      if (partie.resultats.every(r => r.niveau >= 0)) profil.drapeaux.sans_faute = true;
      if (partie.resultats.filter(r => r.niveau === 4).length >= 3) profil.drapeaux.joaillier = true;
      if (partie.diff === "expert") profil.drapeaux.expert = true;
    }
    if (partie.mode === "jour") {
      store.set("jour." + partie.num, { resultats: partie.resultats });
      if (!profil.jours.includes(partie.num)) profil.jours.push(partie.num);
      profil.serieMax = Math.max(profil.serieMax, serieActuelle());
    }
    let resultatDefi = null;
    if (partie.mode === "illimite" && defi && defi.num === partie.num) {
      resultatDefi = sc - defi.score;
      if (resultatDefi > 0) profil.drapeaux.defi = true;
    }
    sauverProfil();
    store.set("encours", null);
    partie.xpGagne = xp; partie.monteeGrade = grade(profil.xp).i > gradeAvant; partie.resultatDefi = resultatDefi;
    void multi;
    montrerFin(partie.mode, partie.num, partie.resultats, max);
    setTimeout(verifierBadges, 1200);
  }

  function montrerFin(mode, num, resultats, max) {
    const sc = resultats.reduce((s, r) => s + (r.niveau >= 0 ? NIVEAUX[r.niveau].pts : 0), 0);
    dessinerCollier("collier3", resultats, resultats.length);
    $("fMode").textContent = mode === "jour" ? `Partie du jour n°${num}` : mode === "illimite" ? `Partie n°${num}` : "Entraînement";
    compter($("fTotal"), 0, sc, 1600);
    $("fMax").textContent = max;
    $("fTitre").textContent = titrePour(sc / max);
    $("fXp").textContent = partie && partie.xpGagne != null
      ? `+${partie.xpGagne} XP${partie.monteeGrade ? ` · Nouveau grade : ${grade(profil.xp).nom} !` : ""}` : "";
    const fd = $("fDefi");
    if (partie && partie.resultatDefi != null) {
      fd.hidden = false;
      fd.textContent = partie.resultatDefi > 0 ? `🏆 Défi relevé : tu bats ton ami de ${partie.resultatDefi} points !`
        : partie.resultatDefi === 0 ? "🤝 Égalité parfaite avec ton ami !" : `Défi raté de ${-partie.resultatDefi} points. Retente ta chance !`;
    } else fd.hidden = true;
    $("fLignes").innerHTML = resultats.map(r => {
      const n = r.niveau >= 0 ? NIVEAUX[r.niveau] : null;
      return `<div class="ligne"><i style="background:${n ? n.coul : "transparent"};${n ? "" : "border:2px solid var(--danger)"}"></i>
        <div><small>${echap(r.consigne)}${r.indice ? " · 💡" : ""}</small>${n ? echap(r.nom) : '<span class="vide">Pas de réponse</span>'}</div>
        <span>${n ? "+" + n.pts : "0"}</span></div>`;
    }).join("");

    voyageVisible(mode);
    const avecVoyage = mode !== "entrainement";
    $("fCarnetTitre").hidden = $("fCarnet").hidden = !avecVoyage;
    afficher("eFin");
    if (avecVoyage) {
      const ici = V.indexEtape(sc);
      Fond.poser(ici);
      animerVoyage($("voyageFin"), 0, sc, 2600, false);
      $("fCarnet").innerHTML = V.ETAPES.map((e, k) =>
        `<div class="${k > ici ? "non" : k === ici ? "ici" : ""}" style="background-image:url(${imageDe(e)})" title="${echap(e.nom)}"><span>${k > ici ? "?" : echap(e.nom)}</span></div>`).join("");
      const ratio = sc / max;
      if (ratio >= 0.3) setTimeout(() => Effets.explosion($("fTotal"), NIVEAUX[ratio >= 0.85 ? 4 : ratio >= 0.6 ? 3 : 2].hex, ratio >= 0.85 ? 4 : ratio >= 0.6 ? 3 : 2), 1500);
    }

    const zone = $("fBoutons"); zone.innerHTML = "";
    const ajout = (txt, fn, or) => { const b = document.createElement("button"); b.className = "bouton" + (or ? " or" : ""); b.textContent = txt; b.onclick = fn; zone.appendChild(b); };
    if (mode !== "entrainement") ajout(mode === "illimite" ? "Défier un ami" : "Partager mon résultat", () => partager(mode, num, resultats, sc, max), true);
    if (mode === "illimite") ajout(`Partie suivante (n°${num + 1})`, () => { majUrl(num + 1); nouvellePartie("illimite", num + 1); });
    if (mode === "entrainement") {
      ajout("Rejouer ce thème", () => nouvellePartie("entrainement", null, partie.ids[0]), true);
      ajout("Autre thème", () => afficher("eEntrainement"));
    }
    if (mode === "jour") ajout("Jouer en illimité", ouvrirIllimite);
    ajout("Mon profil", ouvrirProfil);
    ajout("Accueil", accueil);
  }

  function titrePour(ratio) {
    if (ratio >= 0.9) return "Joaillier de génie 💎";
    if (ratio >= 0.7) return "Chasseur de perles";
    if (ratio >= 0.5) return "Esprit original";
    if (ratio >= 0.3) return "Dans la moyenne… comme tout le monde";
    return "Tu as pensé comme tout le monde !";
  }

  function partager(mode, num, resultats, sc, max) {
    const emojis = resultats.map(r => r.niveau >= 0 ? NIVEAUX[r.niveau].emoji : "❌").join("");
    const titre = mode === "jour" ? `La Perle Rare — jour n°${num}` : `La Perle Rare — partie n°${num}`;
    const url = location.origin + location.pathname + (mode === "illimite" ? `?partie=${num}&defi=${sc}` : "");
    const etape = V.ETAPES[V.indexEtape(sc)];
    const appel = mode === "illimite" ? "\nTu peux faire mieux ? 👇" : "";
    const texte = `${titre}\n${emojis}  ${sc}/${max}\n🚀 ${etape.nom}, à ${V.formatDistance(V.kmPour(sc))} de la Terre${appel}\n${url}`;
    if (navigator.share) navigator.share({ text: texte }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(texte).then(() => toast("Copié ! Colle-le à tes amis."), () => prompt("Copie ton résultat :", texte));
    else prompt("Copie ton résultat :", texte);
  }

  // ---------- Voyage dans l'espace ----------
  const V = window.VOYAGE, SCORE_MAX = NB_THEMES * 100;
  const imageDe = e => `images/${e.img}.jpg`;
  V.ETAPES.forEach(e => { const i = new Image(); i.src = imageDe(e); });
  const Fond = window.creerFond(V, imageDe);

  function preparerVoyage(el) {
    if (el._v) return el._v;
    const taille = el.dataset.taille;
    const jalons = V.ETAPES.slice(1).map(e => `<i class="jalon" style="left:${e.pts / SCORE_MAX * 100}%" title="${echap(e.nom)}"></i>`).join("");
    el.innerHTML = `
      <div class="hublot ${taille === "petit" ? "petit" : taille === "grand" ? "grand" : ""}">
        <div class="info"><small></small><b></b><span class="dist"></span><p></p></div>
      </div>
      <div class="piste"><div class="rail"></div><div class="rempli"></div>${jalons}<div class="fusee">🚀</div></div>
      <div class="prochaine"></div>`;
    el._v = { q: s => el.querySelector(s), qa: s => el.querySelectorAll(s) };
    return el._v;
  }
  function majVoyage(el, score) {
    const v = preparerVoyage(el);
    const i = V.indexEtape(score), e = V.ETAPES[i], suiv = V.ETAPES[i + 1];
    v.q(".info b").textContent = e.nom;
    v.q(".info p").textContent = e.texte;
    v.q(".info small").textContent = i === 0 ? "Point de départ" : "Tu as atteint";
    v.q(".info .dist").textContent = i === 0 && score <= 0 ? "Prêt au décollage" : `à ${V.formatDistance(V.kmPour(score))} de la Terre`;
    const pct = Math.min(100, score / SCORE_MAX * 100);
    v.q(".rempli").style.width = pct + "%";
    v.q(".fusee").style.left = pct + "%";
    v.qa(".jalon").forEach((j, k) => j.classList.toggle("passe", score >= V.ETAPES[k + 1].pts));
    v.q(".prochaine").innerHTML = suiv
      ? `Prochaine étape : <b>${echap(suiv.nom)}</b> dans ${Math.ceil(suiv.pts - score)} points`
      : "Tu as atteint le bout de l'univers visible !";
  }
  async function animerVoyage(el, de, a, duree = 1400, piloterFond = true) {
    cancelAnimationFrame(el._anim);
    majVoyage(el, de);
    if (piloterFond) {
      const i0 = V.indexEtape(de), i1 = V.indexEtape(a), liste = [];
      for (let k = i0 + 1; k <= i1; k++) liste.push(k);
      if (liste.length) { Effets.son("voyage"); await Fond.voyager(liste); }
    }
    await new Promise(fin => {
      const t0 = performance.now();
      const pas = now => {
        const t = Math.min(1, (now - t0) / duree), ease = 1 - Math.pow(1 - t, 3);
        majVoyage(el, de + (a - de) * ease);
        if (t < 1) el._anim = requestAnimationFrame(pas); else fin();
      };
      el._anim = requestAnimationFrame(pas);
    });
  }
  function voyageVisible(mode) {
    document.querySelectorAll(".voyage").forEach(el => el.hidden = mode === "entrainement");
  }

  // ---------- Affichage ----------
  function total() { return partie ? partie.resultats.reduce((s, r) => s + (r.niveau >= 0 ? NIVEAUX[r.niveau].pts : 0), 0) : 0; }
  function libelleMode() {
    return partie.mode === "jour" ? `Jour n°${partie.num}` : partie.mode === "illimite" ? `Partie n°${partie.num}` : "Entraînement";
  }
  function dessinerCollier(id, resultats = partie.resultats, courant = partie.i, animerDernier = false) {
    const n = partie ? partie.ids.length : resultats.length;
    let html = "";
    for (let i = 0; i < n; i++) {
      const r = resultats[i], nouv = animerDernier && i === resultats.length - 1 ? " nouvelle" : "";
      if (r && r.niveau >= 0) html += `<i class="pleine${nouv}" style="background:${NIVEAUX[r.niveau].coul}" title="${echap(r.nom)}"></i>`;
      else if (r) html += `<i class="ratee${nouv}"></i>`;
      else html += `<i class="${i === courant ? "courante" : ""}"></i>`;
    }
    $(id).innerHTML = html;
  }
  function afficher(id) {
    document.querySelectorAll(".ecran").forEach(e => e.classList.toggle("actif", e.id === id));
    window.scrollTo({ top: 0 });
  }
  function majUrl(n, garderDefi) {
    try {
      const u = new URL(location.href);
      if (n) u.searchParams.set("partie", n); else u.searchParams.delete("partie");
      if (!garderDefi) u.searchParams.delete("defi");
      history.replaceState(null, "", u);
    } catch {}
  }
  function sauverEnCours() { if (partie.mode === "jour") store.set("encours", { num: partie.num, resultats: partie.resultats }); }

  function majCarteGrade() {
    const g = grade(profil.xp);
    $("gradeIcone").textContent = g.icone; $("gradeNom").textContent = g.nom;
    $("gradeDetail").textContent = g.suivant ? `${profil.xp.toLocaleString("fr-FR")} XP · prochain grade à ${g.suivant[0].toLocaleString("fr-FR")}` : `${profil.xp.toLocaleString("fr-FR")} XP · grade maximal`;
    requestAnimationFrame(() => $("gradeBarre").style.width = g.pct + "%");
    $("serieAccueil").textContent = `🔥 ${serieActuelle()}`;
  }

  function accueil() {
    cancelAnimationFrame(chrono);
    Fond.poser(0);
    majUrl(null);
    const n = numeroDuJour(), fait = store.get("jour." + n, null);
    if (fait) {
      const sc = fait.resultats.reduce((s, r) => s + (r.niveau >= 0 ? NIVEAUX[r.niveau].pts : 0), 0);
      $("jourInfo").textContent = `Déjà jouée aujourd'hui : ${sc} points · voir mon résultat`;
    } else $("jourInfo").textContent = `Partie n°${n} · les mêmes thèmes pour tout le monde`;
    majCarteGrade();
    afficher("eAccueil");
  }
  function ouvrirIllimite() {
    if (!$("numPartie").value) $("numPartie").value = 1 + Math.floor(Math.random() * 9999);
    majBandeauDefi();
    afficher("eIllimite");
  }
  function majBandeauDefi() {
    const n = parseInt($("numPartie").value, 10), b = $("bandeauDefi");
    if (defi && n === defi.num) { b.hidden = false; b.textContent = `🤝 Un ami te défie : ${defi.score} points à battre sur la partie n°${defi.num} !`; }
    else b.hidden = true;
  }

  function ouvrirProfil() {
    const g = grade(profil.xp);
    $("pGradeIcone").textContent = g.icone; $("pGradeNom").textContent = g.nom;
    $("pGradeDetail").textContent = g.suivant
      ? `${profil.xp.toLocaleString("fr-FR")} XP · encore ${(g.suivant[0] - profil.xp).toLocaleString("fr-FR")} XP pour devenir ${g.suivant[1]}`
      : `${profil.xp.toLocaleString("fr-FR")} XP · grade maximal atteint`;
    $("pGradeBarre").style.width = "0";
    requestAnimationFrame(() => requestAnimationFrame(() => $("pGradeBarre").style.width = g.pct + "%"));
    const moy = profil.parties ? Math.round(profil.cumul / Math.max(1, profil.parties)) : 0;
    const stat = (v, l) => `<div><b>${v}</b><small>${l}</small></div>`;
    $("pStats").innerHTML = [
      stat(profil.parties, "parties"), stat(profil.meilleur, "meilleur score"), stat(moy, "moyenne"),
      stat(`🔥 ${serieActuelle()}`, "série actuelle"), stat(profil.serieMax, "meilleure série"), stat(profil.repartition[4], "perles rares"),
      stat(profil.reponses, "bonnes réponses"), stat(Object.keys(profil.themesVus).length + " / " + THEMES.length, "thèmes explorés"),
      `<div><b class="petit-texte">${echap(V.ETAPES[profil.recordEtape].nom)}</b><small>plus loin atteint</small></div>`,
    ].join("");
    const totalRep = profil.repartition.reduce((a, b) => a + b, 0) || 1;
    const lignes = NIVEAUX.map((n, i) => [n.nom, n.coul, profil.repartition[i]]).concat([["Sans réponse", "var(--danger)", profil.repartition[5]]]);
    $("pRepartition").innerHTML = lignes.map(([nom, coul, v]) =>
      `<div><span>${nom}</span><span class="b"><i style="width:0;background:${coul}" data-w="${v / totalRep * 100}"></i></span><em>${v}</em></div>`).join("");
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll("#pRepartition i").forEach(i => i.style.width = i.dataset.w + "%")));
    const obtenus = BADGES.filter(b => profil.badges[b[0]]).length;
    $("pBadgesCompte").textContent = `${obtenus} / ${BADGES.length}`;
    $("pBadges").innerHTML = BADGES.map(([id, icone, nom, desc]) =>
      `<div class="${profil.badges[id] ? "" : "verrou"}" title="${echap(desc)}"><span>${profil.badges[id] ? icone : "🔒"}</span><b>${echap(nom)}</b><small>${echap(desc)}</small></div>`).join("");
    afficher("eProfil");
  }

  // ---------- Boutons ----------
  $("btnJour").onclick = () => {
    const n = numeroDuJour(), fait = store.get("jour." + n, null);
    if (fait) { partie = { mode: "jour", num: n, ids: fait.resultats.map(() => 0), i: fait.resultats.length, resultats: fait.resultats, diff: "classique" }; return montrerFin("jour", n, fait.resultats, NB_THEMES * 100); }
    nouvellePartie("jour", n);
    const ec = store.get("encours", null);
    if (ec && ec.num === n && ec.resultats.length) {
      partie.resultats = ec.resultats; partie.i = ec.resultats.length;
      if (partie.i >= partie.ids.length) return finDePartie();
      lancerTheme();
    }
  };
  $("btnIllimite").onclick = ouvrirIllimite;
  $("numPartie").addEventListener("input", majBandeauDefi);
  $("btnHasard").onclick = () => { $("numPartie").value = 1 + Math.floor(Math.random() * 99999); majBandeauDefi(); Effets.son("clic"); };
  $("btnLancerIllimite").onclick = () => {
    const n = Math.max(1, Math.min(999999, parseInt($("numPartie").value, 10) || 1));
    majUrl(n, defi && defi.num === n); nouvellePartie("illimite", n);
  };
  $("btnEntrainement").onclick = () => { $("rechercheTheme").value = ""; dessinerThemes(""); afficher("eEntrainement"); };
  function dessinerThemes(filtre) {
    const f = normaliser(filtre);
    $("grilleThemes").innerHTML = THEMES.map((t, i) => [t, i])
      .filter(([t]) => !f || normaliser(t.consigne).includes(f))
      .sort((a, b) => a[0].consigne.localeCompare(b[0].consigne, "fr"))
      .map(([t, i]) => `<button data-t="${i}">${profil.themesVus[t.id] ? "" : "✦ "}${echap(t.consigne)}</button>`).join("");
  }
  $("rechercheTheme").addEventListener("input", e => dessinerThemes(e.target.value));
  $("grilleThemes").addEventListener("click", e => { const b = e.target.closest("button"); if (b) nouvellePartie("entrainement", null, +b.dataset.t); });
  document.querySelectorAll("[data-accueil]").forEach(b => b.onclick = accueil);
  $("logo").onclick = accueil;
  $("lienAccueil").onclick = e => { e.preventDefault(); accueil(); };
  $("btnAide").onclick = () => { accueil(); setTimeout(() => $("blocRegles").scrollIntoView({ behavior: "smooth" }), 80); };
  $("btnProfil").onclick = ouvrirProfil;
  $("carteGrade").onclick = ouvrirProfil;
  const majBoutonSon = () => { $("btnSon").textContent = Effets.sonActif ? "🔊" : "🔇"; };
  $("btnSon").onclick = () => { Effets.basculerSon(); majBoutonSon(); toast(Effets.sonActif ? "Son activé" : "Son coupé"); };
  majBoutonSon();
  $("listeCredits").innerHTML = V.CREDITS.map(([nom, auteur, id]) =>
    `<li>${echap(nom)} : ${echap(auteur)} — <a href="https://images.nasa.gov/details/${encodeURIComponent(id)}" target="_blank" rel="noopener">source</a></li>`).join("");
  $("bareme").innerHTML = NIVEAUX.map(n => `<div><i style="background:${n.coul}"></i><b>${n.pts}</b>${n.nom}</div>`).join("");
  $("nbThemes").textContent = THEMES.length;
  dessinerDifficultes();

  // Raccourci clavier : Entrée pour passer au thème suivant.
  addEventListener("keydown", e => {
    if (e.key === "Enter" && $("eVerdict").classList.contains("actif") && !document.body.classList.contains("cinema") && document.activeElement !== $("btnSuivant")) $("btnSuivant").click();
  });

  // Lien direct : ?partie=15 (ou ?game=15), éventuellement avec &defi=420
  const num = parseInt(q.get("partie") || q.get("game"), 10);
  accueil();
  if (num > 0) { $("numPartie").value = num; majUrl(num, !!defi); majBandeauDefi(); afficher("eIllimite"); }
})();
