
// Load achievements from external file
let planetsData = [];
fetch('achievements.js')
  .then(res => res.json())
  .then(data => {
    planetsData = data;
    initStarChart();
  });

function initStarChart(){
  const stage = document.getElementById('stage');
  const planetsEl = document.getElementById('planets');
  const globeRings = document.getElementById('rings');

  const hoverSound = document.getElementById('hoverSound');
  const clickSound = document.getElementById('clickSound');
  const music = document.getElementById('music');

  let isMuted = false;
  document.getElementById('muteBtn').addEventListener('click', ()=>{
    isMuted = !isMuted;
    document.getElementById('muteBtn').textContent = isMuted ? '🔈' : '🔊';
    [hoverSound,clickSound,music].forEach(a=>a.muted=isMuted);
    if(!isMuted && music.paused) music.play().catch(()=>{});
  });

  document.getElementById('downloadBtn').addEventListener('click', ()=>{
    const link = document.createElement('a');
    link.href = 'star_chart.zip';
    link.download = 'star_chart.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  // orbital rings
  for(let i=1;i<=4;i++){
    const r = 56 + i*30;
    const ring = document.createElementNS('http://www.w3.org/2000/svg','ellipse');
    ring.setAttribute('cx',0); ring.setAttribute('cy',0);
    ring.setAttribute('rx',r); ring.setAttribute('ry',r*0.6);
    ring.setAttribute('stroke','rgba(255,255,255,0.04)');
    ring.setAttribute('fill','none');
    ring.setAttribute('stroke-width','1');
    ring.setAttribute('transform','rotate('+ (i*11) +')');
    globeRings.appendChild(ring);
  }

  const radius = 220;
  planetsData.forEach((p)=>{
    const el = document.createElement('div');
    el.className='planet';
    el.id = p.id;
    el.setAttribute('data-angle', p.angle);
    el.innerHTML = '<div class="label">'+p.name+'</div>';
    positionPlanet(el, p.angle);
    planetsEl.appendChild(el);

    const rings = document.createElement('div');
    rings.className='hover-rings';
    rings.style.left='50%'; rings.style.top='50%';
    el.appendChild(rings);

    createBranch(el);

    el.addEventListener('mouseenter', ()=>{
      rings.classList.add('ring-visible');
      playSound(hoverSound);
    });
    el.addEventListener('mouseleave', ()=> rings.classList.remove('ring-visible'));
    el.addEventListener('touchstart', ()=>{
      rings.classList.add('ring-visible');
      playSound(hoverSound);
    },{passive:true});
    el.addEventListener('click', ()=> openZoom(p));
  });

  const zoomOverlay = document.getElementById('zoomOverlay');
  const planetTitle = document.getElementById('planetTitle');
  const achievementsGrid = document.getElementById('achievementsGrid');
  document.getElementById('closeZoom').addEventListener('click', closeZoom);

  function openZoom(planet){
    zoomOverlay.classList.add('open');
    zoomOverlay.style.display='block';
    planetTitle.textContent = planet.name+' — Achievements';
    achievementsGrid.innerHTML='';
    playSound(clickSound);
    planet.achievements.forEach(a=>{
      const card = document.createElement('div'); card.className='ach-card';
      const thumb = document.createElement('div'); thumb.className='ach-thumb';
      const img = document.createElement('img'); img.src=a.img;
      thumb.appendChild(img);
      const info=document.createElement('div'); info.className='ach-info';
      const h4=document.createElement('h4'); h4.textContent=a.title;
      const p=document.createElement('p'); p.textContent=a.desc;
      info.appendChild(h4); info.appendChild(p);
      card.appendChild(thumb); card.appendChild(info);

      const proj=document.createElement('div'); proj.className='projector';
      const heart=document.createElement('img'); heart.className='heart-img';
      heart.src=a.status==='available'?'https://files.catbox.moe/2tciqz.png':'https://files.catbox.moe/2tciqz.png';
      if(a.status==='available') heart.classList.add('blink-heart');
      if(a.status==='locked') heart.style.opacity=0.45;
      proj.appendChild(heart);
      card.appendChild(proj);

      const btn=document.createElement('button'); btn.textContent=a.status==='completed'?'Completed':(a.status==='locked'?'Locked':'How to');
      btn.style.marginLeft='auto';
      btn.addEventListener('click', ()=>{
        if(a.status==='available'){
          a.status='completed';
          heart.classList.remove('blink-heart');
          heart.src='https://files.catbox.moe/i76wxr.png';
          card.querySelector('h4').textContent=a.title+' ✅';
        } else if(a.status==='locked'){
          alert('This achievement is locked.');
        } else alert('Already completed.');
      });
      card.appendChild(btn);
      achievementsGrid.appendChild(card);
    });
    if(!music.muted){ music.volume=0.55; music.play().catch(()=>{}); }
  }

  function closeZoom(){
    zoomOverlay.classList.remove('open');
    zoomOverlay.style.display='none';
    playSound(clickSound);
    if(!music.muted) music.volume=0.8;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    rotateGlobe();
    try{ music.volume=0.8; music.play().catch(()=>{});}catch(e){}
    window.addEventListener('resize', ()=>{
      document.querySelectorAll('.planet').forEach(el=>{
        const deg=parseFloat(el.getAttribute('data-angle')||0);
        positionPlanet(el, deg);
      });
    });
  });

  function positionPlanet(el, deg){
    const rad=(deg-90)*Math.PI/180;
    const x=Math.cos(rad)*radius+(window.innerWidth/2 - 42);
    const y=Math.sin(rad)*radius+(window.innerHeight/2 - 42);
    el.style.left=x+'px'; el.style.top=y+'px';
  }

  function createBranch(el){
    const canvas=document.createElement('canvas');
    canvas.width=window.innerWidth;
    canvas.height=window.innerHeight;
    canvas.style.position='absolute';
    canvas.style.inset='0';
    canvas.style.pointerEvents='none';
    stage.appendChild(canvas);
    const ctx=canvas.getContext('2d');
    const rect=el.getBoundingClientRect();
    const ex=rect.left+rect.width/2;
    const ey=rect.top+rect.height/2;
    const cx=window.innerWidth/2;
    const cy=window.innerHeight/2;
    let t=0;
    function animate(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const grad=ctx.createLinearGradient(cx,cy,ex,ey);
      grad.addColorStop(0,'rgba(255,255,255,'+(0.2+0.2*Math.sin(t))+')');
      grad.addColorStop(1,'rgba(255,255,255,0)');
      ctx.strokeStyle=grad;
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.lineTo(ex,ey);
      ctx.stroke();
      t+=0.05;
      requestAnimationFrame(animate);
    }
    animate();
  }

  function playSound(audio){
    if(audio && !audio.muted){
      audio.currentTime=0;
      audio.play().catch(()=>{});
    }
  }

  function rotateGlobe(){
    const globe=document.getElementById('globe');
    let a=0;
    setInterval(()=>{
      a+=0.15;
      globe.style.transform='rotate('+a+'deg)';
    },30);
  }
}
