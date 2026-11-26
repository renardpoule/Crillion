// Effets de « La Perle Rare » : explosions de particules et petits sons synthétisés.
window.Effets = (() => {
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Particules ----------
  const c = document.getElementById("particules"), ctx = c.getContext("2d");
  let w = 0, h = 0, dpr = 1, parts = [], actif = false;
  const taille = () => { dpr = Math.min(2, devicePixelRatio || 1); w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr; };
  addEventListener("resize", taille); taille();

  function boucle() {
    ctx.clearRect(0, 0, w, h);
    parts = parts.filter(p => p.vie > 0);
    for (const p of parts) {
      p.vx *= 0.985; p.vy = p.vy * 0.985 + p.g; p.x += p.vx; p.y += p.vy; p.vie -= p.usure; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.vie));
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.coul;
      if (p.forme === 0) { ctx.beginPath(); ctx.arc(0, 0, p.t, 0, Math.PI * 2); ctx.fill(); }
      else if (p.forme === 1) { ctx.fillRect(-p.t, -p.t / 2, p.t * 2, p.t); }
      else { // étoile à 4 branches
        ctx.beginPath();
        for (let k = 0; k < 8; k++) { const r = k % 2 ? p.t * 0.4 : p.t * 1.6, a = k * Math.PI / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(boucle); else { actif = false; ctx.clearRect(0, 0, w, h); }
  }

  // Explosion depuis un élément de la page. intensite : 0 (petite) à 4 (feu d'artifice).
  function explosion(el, couleurs, intensite = 1) {
    if (reduit || !el) return;
    const r = el.getBoundingClientRect();
    const x = (r.left + r.width / 2) * dpr, y = (r.top + r.height / 2) * dpr;
    const n = [12, 24, 45, 80, 140][intensite] || 30;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * (4 + intensite * 2.2)) * dpr;
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2 * dpr, g: 0.12 * dpr,
        t: (2 + Math.random() * 3.5) * dpr, vie: 1 + Math.random() * 0.6, usure: 0.012 + Math.random() * 0.012,
        coul: couleurs[i % couleurs.length], forme: i % 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      });
    }
    if (intensite >= 4) setTimeout(() => explosion(el, couleurs, 2), 350);
    if (!actif) { actif = true; requestAnimationFrame(boucle); }
  }

  // ---------- Sons ----------
  let audio = null, sonActif = true;
  try { sonActif = JSON.parse(localStorage.getItem("perle.son") ?? "true"); } catch {}
  const ac = () => { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); } catch {} return audio; };
  function note(freq, debut = 0, duree = 0.18, type = "sine", vol = 0.08) {
    if (!sonActif) return; const a = ac(); if (!a) return;
    const t = a.currentTime + debut, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + duree + 0.05);
  }
  function souffle(duree = 1.4, vol = 0.12) {
    if (!sonActif) return; const a = ac(); if (!a) return;
    const len = Math.floor(a.sampleRate * duree), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
    src.buffer = buf; f.type = "bandpass"; f.Q.value = 0.8;
    f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(3000, t + duree * 0.6); f.frequency.exponentialRampToValueAtTime(400, t + duree);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + duree * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    src.connect(f).connect(g).connect(a.destination); src.start(t);
  }
  const GAMME = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
  const sons = {
    bonne(niveau) { // plus la réponse est rare, plus l'arpège monte
      const n = 2 + niveau;
      for (let i = 0; i < n; i++) note(GAMME[i + Math.max(0, niveau - 1)], i * 0.07, 0.35, niveau >= 3 ? "triangle" : "sine", 0.07);
      if (niveau === 4) [1568, 2093].forEach((f, i) => note(f, 0.45 + i * 0.1, 0.6, "sine", 0.05));
    },
    faux() { note(196, 0, 0.12, "square", 0.04); note(164.8, 0.08, 0.18, "square", 0.04); },
    tic() { note(1200, 0, 0.04, "square", 0.025); },
    fin() { note(220, 0, 0.3, "sawtooth", 0.03); note(196, 0.15, 0.4, "sawtooth", 0.03); },
    voyage() { souffle(1.6, 0.1); note(110, 0.2, 1.2, "sine", 0.05); },
    badge() { [784, 988, 1175, 1568].forEach((f, i) => note(f, i * 0.09, 0.4, "triangle", 0.06)); },
    clic() { note(660, 0, 0.05, "sine", 0.03); },
  };

  return {
    explosion,
    son: (nom, ...args) => { try { sons[nom] && sons[nom](...args); } catch {} },
    get sonActif() { return sonActif; },
    basculerSon() { sonActif = !sonActif; try { localStorage.setItem("perle.son", JSON.stringify(sonActif)); } catch {} if (sonActif) ac(); return sonActif; },
  };
})();
