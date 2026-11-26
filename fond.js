// Arrière-plan cinéma de « La Perle Rare » : images plein écran, champ d'étoiles
// et transitions de voyage entre les étapes (le panneau du score est géré par index.html).
window.creerFond = function (V, imageDe) {
  const $ = id => document.getElementById(id);
  const attendre = ms => new Promise(r => setTimeout(r, ms));
  const mouvementReduit = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Champ d'étoiles : dérive lente, puis passage en vitesse lumière pendant les transitions.
  const Warp = (() => {
    const c = $("warp"), ctx = c.getContext("2d"), N = 280, etoiles = [];
    let w = 0, h = 0, dpr = 1, vitesse = 0.02, cible = 0.02, finBoost = 0;
    const taille = () => { dpr = Math.min(2, devicePixelRatio || 1); w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr; };
    const placer = (e, loin) => { e.x = Math.random() * 2 - 1; e.y = Math.random() * 2 - 1; e.z = loin ? 1 : 0.05 + Math.random() * 0.95; e.pz = e.z; return e; };
    for (let i = 0; i < N; i++) etoiles.push(placer({}, false));
    addEventListener("resize", taille); taille();
    function image(now) {
      if (now > finBoost) cible = 0.02;
      vitesse += (cible - vitesse) * (cible > vitesse ? 0.05 : 0.035);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      const f = Math.max(w, h) * 0.25, cx = w / 2, cy = h * 0.42;
      for (const e of etoiles) {
        e.pz = e.z; e.z -= vitesse * 0.02;
        if (e.z <= 0.02) { placer(e, true); continue; }
        const sx = cx + e.x / e.z * f, sy = cy + e.y / e.z * f;
        if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) { placer(e, true); continue; }
        const px = cx + e.x / e.pz * f, py = cy + e.y / e.pz * f;
        const a = Math.min(1, (1 - e.z) * 1.3) * (0.45 + Math.min(0.55, vitesse * 0.6));
        ctx.strokeStyle = `rgba(235,240,255,${a.toFixed(3)})`;
        ctx.lineWidth = Math.max(0.6, (1 - e.z) * 2.4) * dpr;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
      }
      requestAnimationFrame(image);
    }
    requestAnimationFrame(image);
    return { boost(duree, force = 1) { if (mouvementReduit) return; cible = 1.5 * force; finBoost = performance.now() + duree; } };
  })();

  // Deux plans d'image qui se relaient.
  const plans = [...document.querySelectorAll("#fond .plan")];
  let actif = 0, courant = -1, file = Promise.resolve();
  const stop = p => p.getAnimations().forEach(a => a.cancel());
  function preparer(i) {
    const ancien = plans[actif], nouveau = plans[1 - actif];
    stop(ancien); stop(nouveau);
    nouveau.querySelector(".img").style.backgroundImage = `url(${imageDe(V.ETAPES[i])})`;
    nouveau.style.zIndex = 2; ancien.style.zIndex = 1;
    actif = 1 - actif; courant = i;
    return { ancien, nouveau };
  }

  // Changement doux, sans voyage (accueil, reprise d'une partie…).
  function poser(i) {
    if (i === courant) return;
    const { ancien, nouveau } = preparer(i);
    nouveau.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1200, easing: "ease", fill: "forwards" });
    ancien.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1200, delay: 400, easing: "ease", fill: "forwards" });
  }

  // Carte titre façon économiseur d'écran : lettres qui se resserrent, flou qui se dissipe.
  function titre(e, i) {
    const t = $("titre"), nom = $("titreNom"), sur = $("titreSur"), dist = $("titreDist"), trait = t.querySelector(".trait");
    t.getAnimations({ subtree: true }).forEach(a => a.cancel());
    sur.textContent = `Étape ${i} sur ${V.ETAPES.length - 1}`;
    nom.textContent = e.nom;
    dist.textContent = `${V.formatDistance(e.km)} de la Terre`;
    const doux = "cubic-bezier(.16,1,.3,1)";
    t.animate([{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 1, offset: .82 }, { opacity: 0 }], { duration: 3300, delay: 700, fill: "both" });
    sur.animate([{ opacity: 0, transform: "translateY(12px)", letterSpacing: ".9em" }, { opacity: 1, transform: "none", letterSpacing: ".5em" }], { duration: 1400, delay: 800, easing: doux, fill: "both" });
    nom.animate([{ opacity: 0, letterSpacing: ".38em", filter: "blur(12px)", transform: "scale(1.06)" },
                 { opacity: 1, letterSpacing: ".01em", filter: "blur(0px)", transform: "none" }], { duration: 1900, delay: 900, easing: doux, fill: "both" });
    dist.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 1200, delay: 1500, easing: doux, fill: "both" });
    trait.animate([{ width: "0px", opacity: 0 }, { width: "220px", opacity: 1 }], { duration: 1600, delay: 1400, easing: doux, fill: "both" });
  }

  // Une étape : l'image actuelle file vers nous, la suivante surgit du fond de l'espace.
  async function etape(i, rapide) {
    const { ancien, nouveau } = preparer(i);
    const d = rapide ? 1150 : 2700;
    Warp.boost(d * 0.7, rapide ? 0.8 : 1);
    // L'ancienne destination file vers nous et se dissout.
    ancien.animate([
      { transform: "scale(1)", filter: "blur(0px) brightness(1)", opacity: 1, "--ouverture": "220%" },
      { transform: "scale(1.9)", filter: "blur(14px) brightness(1.4)", opacity: .45, offset: .55 },
      { transform: "scale(3.2)", filter: "blur(30px) brightness(1.8)", opacity: 0, "--ouverture": "40%" }],
      { duration: d * 0.62, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" });
    // La nouvelle émerge de la lumière, floue, puis se pose avec une longue décélération.
    nouveau.animate([
      { transform: "scale(.5)", filter: "blur(32px) brightness(2.2) saturate(.6)", opacity: 0, "--ouverture": "0%" },
      { filter: "blur(18px) brightness(1.6) saturate(.8)", opacity: .85, "--ouverture": "25%", offset: .38 },
      { "--ouverture": "50%", offset: .75 },
      { transform: "scale(1)", filter: "blur(0px) brightness(1) saturate(1)", opacity: 1, "--ouverture": "220%" }],
      { duration: d * 0.95, delay: d * 0.22, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" });
    if (!rapide) titre(V.ETAPES[i], i);
    await attendre(rapide ? d * 0.72 : d + 1300);
  }

  // Voyage plein écran à travers une ou plusieurs étapes (les étapes intermédiaires défilent vite).
  function voyager(liste) {
    file = file.then(async () => {
      if (!liste.length) return;
      if (mouvementReduit) { poser(liste[liste.length - 1]); return; }
      document.body.classList.add("cinema");
      await attendre(500);
      for (let k = 0; k < liste.length; k++) await etape(liste[k], k < liste.length - 1);
      document.body.classList.remove("cinema");
      await attendre(400);
    });
    return file;
  }

  return { poser, voyager };
};
