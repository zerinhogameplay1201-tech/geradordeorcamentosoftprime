// Inclua <script src="https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js"></script> no login.html (antes de background-init.js)
// e então este arquivo para inicializar:
window.addEventListener('load', () => {
  tsParticles.load('tsparticles', {
    fullScreen: { enable: false }, // deixamos dentro de um container
    detectRetina: true,
    particles: {
      number: { value: 40 },
      color: { value: ['#0d7de0', '#0a5fb8', '#7ef9ff'] },
      move: { enable: true, speed: 0.6, outModes: 'out' },
      links: { enable: true, distance: 120, color: '#0d7de0', opacity: 0.15 }
    }
  });
});
/* No HTML: <div id="tsparticles" style="position:fixed;inset:0;z-index:-2;"></div> */