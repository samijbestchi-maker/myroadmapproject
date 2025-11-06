/* CHEM·AI Lab - 복잡 시뮬레이터 (로컬 모의모델)
   주요기능:
   - 파라미터 입력 (flow, pH, temp, ads, light)
   - AI 추천 (규칙+경험식 그리드 탐색)
   - 메커니즘별 효과 합성 (adsorption, photocatalysis, electro)
   - Chart.js로 시간대별 농도 시각화
   - 흐름도 노드 클릭 시 팝업 설명
   - CSV/리포트 생성, achievement 체크
*/

/* --------------------------
   유틸/초기 바인딩
---------------------------*/
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const ids = ['flow','pH','temp','ads','light'];
const state = {};
ids.forEach(id=>{
  state[id] = document.getElementById(id).value;
  document.getElementById(id).addEventListener('input', (e)=>{
    state[id] = e.target.value;
    document.getElementById(id+'Val').textContent = parseFloat(state[id]).toFixed(id==='pH' || id==='light' ? 2 : 1);
  });
});

/* 초기 badge text */
document.getElementById('flowVal').textContent = state.flow;
document.getElementById('pHVal').textContent = parseFloat(state.pH).toFixed(1);
document.getElementById('tempVal').textContent = state.temp;
document.getElementById('adsVal').textContent = state.ads;
document.getElementById('lightVal').textContent = parseFloat(state.light).toFixed(2);

/* Wave animation canvas (background visual) */
(function initWave(){
  const c = document.getElementById('waveCanvas');
  c.width = c.clientWidth; c.height = c.clientHeight;
  const ctx = c.getContext('2d');
  let t=0;
  function draw(){
    const w=c.width, h=c.height;
    ctx.clearRect(0,0,w,h);
    // layered waves
    for(let j=0;j<3;j++){
      ctx.beginPath();
      ctx.moveTo(0,h);
      for(let x=0;x<=w;x+=10){
        const y = h*0.6 + Math.sin((x*0.01)+(t*0.02)+(j*1.2)) * (18 + j*6) + Math.cos((x*0.005)+t*0.01)*6;
        ctx.lineTo(x,y);
      }
      ctx.lineTo(w,h); ctx.closePath();
      ctx.fillStyle = `rgba(${30+j*20},220,190,${0.08 + j*0.03})`;
      ctx.fill();
    }
    t+=1;
    requestAnimationFrame(draw);
  }
  draw();
})();

/* --------------------------
   Flow diagram (SVG nodes) - 간단 인터랙션
---------------------------*/
(function buildFlow(){
  const host = document.getElementById('flowDiag');
  host.innerHTML = '';
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 900 220');
  svg.setAttribute('width','100%'); svg.setAttribute('height','100%');

  function node(x,y,w,h,id,txt,color){
    const g = document.createElementNS(svgNS,'g');
    const rect = document.createElementNS(svgNS,'rect');
    rect.setAttribute('x',x); rect.setAttribute('y',y); rect.setAttribute('rx',10);
    rect.setAttribute('width',w); rect.setAttribute('height',h);
    rect.setAttribute('fill','rgba(255,255,255,0.02)'); rect.setAttribute('stroke','rgba(255,255,255,0.06)');
    rect.setAttribute('data-id',id);
    rect.style.cursor = 'pointer';
    const text = document.createElementNS(svgNS,'text');
    text.setAttribute('x', x + w/2); text.setAttribute('y', y + h/2 + 5);
    text.setAttribute('text-anchor','middle'); text.setAttribute('fill','#cfeee3'); text.style.fontSize='13px';
    text.textContent = txt;
    g.appendChild(rect); g.appendChild(text);
    rect.addEventListener('click', ()=> showModalInfo(id));
    return g;
  }

  svg.appendChild(node(20,80,140,60,'in','원수 유입'));
  svg.appendChild(node(190,40,130,50,'sensor','센서(TOC,pH,Temp)'));
  svg.appendChild(node(360,30,180,70,'ai','AI 제어기'));
  svg.appendChild(node(570,20,240,120,'reactor','복합 반응기\n(흡착/광촉매/전기)'));
  svg.appendChild(node(830,80,60,60,'out','정화수'));

  // arrows
  function arrow(x1,y1,x2,y2){
    const p = document.createElementNS(svgNS,'path');
    p.setAttribute('d',`M${x1} ${y1} L${x2} ${y2}`);
    p.setAttribute('stroke','rgba(190,238,230,0.12)'); p.setAttribute('stroke-width','2'); p.setAttribute('fill','none');
    svg.appendChild(p);
  }
  arrow(160,110,190,65); arrow(320,65,360,65); arrow(540,65,570,65); arrow(820,65,830,110);
  host.appendChild(svg);
})();

/* --------------------------
   Modal for node info
---------------------------*/
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
document.getElementById('closeModal').addEventListener('click', ()=> { modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); });

function showModalInfo(id){
  let html = '';
  if(id==='ads'){}
  switch(id){
    case 'in': html = `<h3>원수 유입</h3><p>하천/공업폐수 등 원수의 특성. 입자 크기 분포와 오염물 프로파일이 중요.</p>`; break;
    case 'sensor': html = `<h3>센서</h3><p>TOC, pH, 전도도, 탁도 등을 실시간 측정. 센서 노이즈는 제어 오차의 주요 원인.</p>`; break;
    case 'ai': html = `<h3>AI 제어기</h3><p>과거 시뮬레이션 데이터 기반 정책. 여기서는 규칙+경험식으로 최적값을 탐색한다.</p>`; break;
    case 'reactor': html = `<h3>복합 반응기</h3><p>흡착 · 광촉매 · 전기화학 메커니즘을 병렬·직렬로 결합하여 제거 효율을 높인다.</p>`; break;
    case 'out': html = `<h3>정화수</h3><p>처리 후 방출. 배출 기준을 만족해야 하며, 흡착제 재생·폐기물 관리가 필요.</p>`; break;
    default: html = `<h3>정보</h3><p>설명 없음</p>`;
  }
  modalContent.innerHTML = html;
  modal.classList.add('show'); modal.setAttribute('aria-hidden','false');
}

/* --------------------------
   Mechanism effect 모델링 함수
   - adsorptionEffect, photoEffect, electroEffect
   각각 0..1으로 반환
---------------------------*/
function adsorptionEffect(pH, ads){
  // pH가 중성 근처에서 표면전하 유리, ads는 g/L
  const phFactor = Math.exp(-Math.pow((pH-7)/2,2));
  const adsEff = 1 - Math.exp(-0.45 * ads); // 포화형
  return phFactor * adsEff;
}
function photoEffect(light, temp){
  // 온도와 빛 강도 의존
  const tempFactor = Math.exp(-Math.pow((temp-30)/12,2));
  return Math.max(0, light) * tempFactor * 0.9;
}
function electroEffect(flow, applied=1){
  // 유속이 너무 빠르면 전기집합 성능 낮음
  const flowFactor = Math.exp(-0.01*(flow-50));
  return Math.max(0, applied) * Math.max(0.05, flowFactor) * 0.6;
}

/* --------------------------
   합성 제거율(시간상수 k 계산)
   k = base * (w1*ads + w2*photo + w3*electro) * flowFactor
---------------------------*/
function computeK(params){
  const a = adsorptionEffect(params.pH, params.ads);
  const p = photoEffect(params.light, params.temp);
  const e = electroEffect(params.flow, 1);
  // 가중치: adsorption 0.45, photo 0.35, electro 0.2 (화학공학적 가정)
  const comb = 0.45*a + 0.35*p + 0.2*e;
  // flow penalty: too high reduces contact
  const flowPenalty = Math.max(0.3, Math.exp(-0.012*(params.flow-50)));
  const base = 0.08; // 기저 상수 (분단위)
  const k = base * comb * flowPenalty * 10; // 스케일 조정
  return {k, components:{a,p,e}, comb};
}

/* --------------------------
   시뮬레이션 실행(60분)
---------------------------*/
let lastResult = null;
const chartCtx = document.getElementById('chartSim').getContext('2d');
let simChart = new Chart(chartCtx, {
  type:'line',
  data:{labels:[],datasets:[{label:'오염물 농도',data:[],borderColor:'rgba(45,212,191,0.95)',tension:0.3,pointRadius:0}]},
  options:{responsive:true,scales:{y:{beginAtZero:true}}}
});

function runSim(){
  const params = {
    flow: +document.getElementById('flow').value,
    pH: +document.getElementById('pH').value,
    temp: +document.getElementById('temp').value,
    ads: +document.getElementById('ads').value,
    light: +document.getElementById('light').value
  };
  log(`시뮬레이션 시작. 파라미터: ${JSON.stringify(params)}`);
  const {k, components, comb} = computeK(params);
  // 초기 농도 100
  const C0 = 100;
  const tArr = []; const cArr = [];
  for(let t=0;t<=60;t++){
    const Ct = C0 * Math.exp(-k * t);
    tArr.push(t); cArr.push(Ct);
  }
  const removal = (1 - cArr[cArr.length-1]/C0)*100;
  const score = Math.round(removal - (params.ads*1.2 + Math.max(0, params.temp-28)*0.6 + (params.flow/100)*2));
  lastResult = {params, tArr, cArr, removal, score, components};
  document.getElementById('pred').textContent = removal.toFixed(1) + '%';
  document.getElementById('score').textContent = score;
  // update chart
  simChart.data.labels = tArr;
  simChart.data.datasets[0].data = cArr;
  simChart.update();
  log(`완료: 제거율 ${removal.toFixed(1)}%, score ${score}`);
  checkAchievements(removal, score);
}

/* --------------------------
   간단 로그, achievement
---------------------------*/
function log(msg){
  const area = document.getElementById('logArea');
  const time = new Date().toLocaleTimeString();
  area.innerHTML = `<div>[${time}] ${msg}</div>` + area.innerHTML;
}

function checkAchievements(removal, score){
  const box = document.getElementById('achievements');
  let html='';
  if(removal >= 75) html += `<div class="achieve">🏅 제거 75% 달성 배지 획득</div>`;
  if(score >= 40) html += `<div class="achieve">⚙️ 비용효율성 우수</div>`;
  if(removal < 30) html += `<div class="note">🔬 실험 필요: 제거율 낮음. 파라미터 조정 권장</div>`;
  box.innerHTML = html || `<div class="note">아직 배지 없음. 실험을 더 해보세요.</div>`;
}

/* --------------------------
   AI 추천: 경량 그리드 탐색(로컬)
---------------------------*/
document.getElementById('aiRec').addEventListener('click', ()=> {
  const progressBtn = document.getElementById('aiRec');
  progressBtn.textContent = '추천중...'; progressBtn.disabled = true;
  setTimeout(()=>{
    const cur = {
      flow:+document.getElementById('flow').value,
      pH:+document.getElementById('pH').value,
      temp:+document.getElementById('temp').value,
      ads:+document.getElementById('ads').value,
      light:+document.getElementById('light').value
    };
    let best=null, bestScore=-Infinity;
    // 그리드: ads 0..10, pH 5..9, temp 18..38, flow 20..120, light 0..1
    for(let ad=0;ad<=10;ad+=0.5){
      for(let ph=5;ph<=9;ph+=0.5){
        for(let tp=18;tp<=38;tp+=2){
          for(let fl=20;fl<=120;fl+=10){
            for(let li=0; li<=1; li+=0.2){
              const {k,components,comb} = computeK({flow:fl,pH:ph,temp:tp,ads:ad,light:li});
              const rem = (1 - Math.exp(-k * 60)) * 100;
              const cost = ad*1.2 + Math.max(0, tp-28)*0.6 + (fl/100)*2 + li*8;
              const score = rem - 2.5*cost;
              if(score > bestScore){ bestScore = score; best = {ad,ph,tp,fl,li,rem,score}; }
            }
          }
        }
      }
    }
    // 적용
    document.getElementById('ads').value = best.ad; document.getElementById('adsVal').textContent = parseFloat(best.ad).toFixed(1);
    document.getElementById('pH').value = best.ph; document.getElementById('pHVal').textContent = parseFloat(best.ph).toFixed(1);
    document.getElementById('temp').value = best.tp; document.getElementById('tempVal').textContent = parseFloat(best.tp).toFixed(1);
    document.getElementById('flow').value = best.fl; document.getElementById('flowVal').textContent = best.fl;
    document.getElementById('light').value = best.li; document.getElementById('lightVal').textContent = parseFloat(best.li).toFixed(2);
    document.getElementById('pred').textContent = best.rem.toFixed(1) + '% (추천)';
    document.getElementById('score').textContent = Math.round(best.score);
    log(`AI 추천 적용: 제거율 예측 ${best.rem.toFixed(1)}%`);
    progressBtn.textContent = 'AI 추천'; progressBtn.disabled = false;
  }, 300);
});

/* --------------------------
   버튼 바인딩
---------------------------*/
document.getElementById('run').addEventListener('click', runSim);
document.getElementById('reset').addEventListener('click', ()=>{
  document.getElementById('flow').value=60; document.getElementById('pH').value=7; document.getElementById('temp').value=25;
  document.getElementById('ads').value=2; document.getElementById('light').value=0.4;
  ['flow','pH','temp','ads','light'].forEach(id=> document.getElementById(id+'Val').textContent = document.getElementById(id).value);
  simChart.data.labels = []; simChart.data.datasets[0].data = []; simChart.update();
  document.getElementById('pred').textContent='-'; document.getElementById('score').textContent='-';
  log('파라미터 초기화됨.');
});

document.getElementById('startBtn').addEventListener('click', ()=>{ document.getElementById('sim').scrollIntoView({behavior:'smooth'}); });
document.querySelectorAll('.infoBtn').forEach(b=> b.addEventListener('click', (e)=>{
  const card = e.target.closest('.card');
  const mech = card.getAttribute('data-mech');
  let content='';
  if(mech==='ads') content = `<h3>흡착 원리</h3><p>흡착은 표면 상호작용... (간단 설명 및 관련 반응식).</p>`;
  if(mech==='photo') content = `<h3>광촉매 원리</h3><p>광흡수로 활성종 생성하여 고분자 분해...</p>`;
  if(mech==='electro') content = `<h3>전기화학 원리</h3><p>전극에서의 응집 및 전기분해로 처리...</p>`;
  modalContent.innerHTML = content; modal.classList.add('show'); modal.setAttribute('aria-hidden','false');
}));
document.getElementById('tutorialBtn').addEventListener('click', ()=> {
  modalContent.innerHTML = `<h3>튜토리얼</h3><ol><li>파라미터를 바꿔봐라.</li><li>AI 추천으로 시작값을 받고 실행.</li><li>그래프와 로그로 성능을 분석.</li></ol>`;
  modal.classList.add('show'); modal.setAttribute('aria-hidden','false');
});

/* --------------------------
   CSV 내보내기 / 보고서 생성
---------------------------*/
document.getElementById('export').addEventListener('click', ()=>{
  if(!lastResult){ alert('먼저 시뮬레이션을 실행하세요.'); return; }
  const {tArr,cArr,params,removal,score} = lastResult;
  let csv = 'time_min,concentration\n';
  for(let i=0;i<tArr.length;i++) csv += `${tArr[i]},${cArr[i].toFixed(4)}\n`;
  csv += `#params,${JSON.stringify(params)}\n#removal,${removal.toFixed(2)}\n#score,${score}\n`;
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='sim_export.csv'; a.click(); URL.revokeObjectURL(url);
});

document.getElementById('genReport').addEventListener('click', ()=>{
  if(!lastResult){ alert('실험 결과가 없습니다. 먼저 시뮬레이션을 실행하세요.'); return; }
  const r = lastResult;
  let txt = `CHEM·AI Lab - 실험 보고서\n생성일: ${new Date().toLocaleString()}\n\n파라미터:\n${JSON.stringify(r.params,null,2)}\n\n결과:\n제거율: ${r.removal.toFixed(2)}%\n점수: ${r.score}\n\n요약:\n- 메커니즘 기여: a=${r.components ? r.components.a.toFixed(3):''}\n\n(간단 보고서)\n`;
  const blob = new Blob([txt], {type:'text/plain;charset=utf-8'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'CHEM_AI_report.txt'; a.click(); URL.revokeObjectURL(url);
});

/* placeholder for slide download (real PPTX generation needs server) */
document.getElementById('downloadSlide').addEventListener('click', ()=> {
  alert('슬라이드 템플릿은 서버형 변환이 필요합니다. README 참고.');
});

/* keyboard nav buttons */
document.querySelectorAll('[data-scroll]').forEach(b=> b.addEventListener('click', e=> document.getElementById(e.target.dataset.scroll).scrollIntoView({behavior:'smooth'})));
