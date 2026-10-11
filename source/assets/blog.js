(() => {
  'use strict';

  const music = document.createElement('details');
  music.className = 'blog-music';
  music.innerHTML = '<summary>秋鳴りシンフォニー</summary><audio controls loop preload="none" aria-label="秋鳴りシンフォニー" src="/images/bgm.mp3"></audio>';
  const aside = document.getElementById('aside-content');
  if (aside) aside.insertBefore(music, aside.firstElementChild?.nextElementSibling || null);
  else document.getElementById('footer')?.append(music);
  const audio = music.querySelector('audio');
  let savedTime = 0;
  let resume = false;
  try {
    savedTime = Number(sessionStorage.getItem('bgmTime')) || 0;
    resume = sessionStorage.getItem('bgmPlaying') === 'true';
  } catch {}
  audio.addEventListener('loadedmetadata', () => {
    if (savedTime > 0 && savedTime < audio.duration) audio.currentTime = savedTime;
  }, { once: true });
  if (resume) {
    music.open = true;
    audio.play().catch(() => {});
  }
  const saveMusic = () => {
    try {
      sessionStorage.setItem('bgmTime', String(audio.currentTime));
      sessionStorage.setItem('bgmPlaying', String(!audio.paused));
    } catch {}
  };
  window.addEventListener('pagehide', saveMusic);
  audio.addEventListener('play', saveMusic);
  audio.addEventListener('pause', saveMusic);

  for (const side of ['left', 'right']) {
    const image = document.createElement('img');
    image.src = `/images/${side}-pet.gif`;
    image.alt = '';
    image.className = `blog-decoration ${side}`;
    image.setAttribute('aria-hidden', 'true');
    document.body.append(image);
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const background = document.getElementById('web_bg');
  if (background) {
    const wallpapers = ['/images/bg1.png', '/images/bg2.jpg', '/images/bg3.png'];
    const layers = wallpapers.slice(0, 2).map((url, index) => {
      const layer = document.createElement('div');
      layer.className = 'blog-wallpaper';
      layer.style.backgroundImage = `url("${url}")`;
      layer.style.opacity = index === 0 ? '1' : '0';
      background.append(layer);
      return layer;
    });
    let current = 0;
    let active = 0;
    window.setInterval(() => {
      if (document.hidden) return;
      current = (current + 1) % wallpapers.length;
      const next = 1 - active;
      layers[next].style.backgroundImage = `url("${wallpapers[current]}")`;
      layers[next].style.opacity = '1';
      layers[active].style.opacity = '0';
      active = next;
    }, 10000);
  }

  window.setInterval(() => {
    if (document.hidden) return;
    const petal = document.createElement('span');
    petal.className = 'blog-petal';
    petal.style.left = `${Math.random() * 100}vw`;
    petal.setAttribute('aria-hidden', 'true');
    document.body.append(petal);
    petal.addEventListener('animationend', () => petal.remove(), { once: true });
  }, 800);
})();
