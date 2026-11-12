// Original procedural audio: no third-party recordings or streamed assets.
// Everything is synthesised with WebAudio, so the bundle stays tiny and there
// are no licensing questions. Public API is unchanged plus:
//   setMusicTheme(i)  — one of 8 planet themes (matches SpaceTheme palettes)
//   isBossAtmosphere  — when true the scheduler switches to the boss track
//   build/upgrade/waveStart/baseHit/bossAlert/victory/defeat — extra SFX
(function(root, factory) {
  if(typeof module==='object'&&module.exports) module.exports=factory;
  else root.GameAudio=factory(root,document);
})(typeof window==='object'?window:globalThis,function(win,doc){
  // Semitone helpers: everything is written as scale degrees over a root.
  const hz=(root,semi)=>root*Math.pow(2,semi/12);
  const SCALES={
    major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10], dorian:[0,2,3,5,7,9,10],
    lydian:[0,2,4,6,7,9,11], mixolydian:[0,2,4,5,7,9,10], phrygian:[0,1,3,5,7,8,10]
  };
  // One musical identity per planet type (ocean, volcanic, ice, bio, gas, quantum, storm, reactor).
  const THEMES=[
    {name:'ocean',   root:130.81,scale:'lydian',    prog:[0,4,5,3],bpm:84, pad:'sine',    lead:'triangle',arp:[0,2,4,2,1,2,4,2]},
    {name:'volcanic',root:110.00,scale:'dorian',    prog:[0,6,5,6],bpm:96, pad:'sawtooth',lead:'square',  arp:[0,1,2,1,0,2,1,2]},
    {name:'ice',     root:146.83,scale:'major',     prog:[0,5,3,4],bpm:76, pad:'sine',    lead:'sine',    arp:[0,4,2,4,1,4,2,4]},
    {name:'bio',     root:123.47,scale:'mixolydian',prog:[0,6,3,0],bpm:90, pad:'triangle',lead:'triangle',arp:[0,2,1,2,0,2,1,3]},
    {name:'gas',     root:98.00, scale:'major',     prog:[0,3,4,3],bpm:88, pad:'triangle',lead:'sine',    arp:[0,1,2,3,2,1,2,1]},
    {name:'quantum', root:116.54,scale:'lydian',    prog:[0,1,4,1],bpm:92, pad:'sawtooth',lead:'triangle',arp:[0,2,4,6,4,2,1,2]},
    {name:'storm',   root:103.83,scale:'minor',     prog:[0,5,6,4],bpm:100,pad:'sawtooth',lead:'square',  arp:[0,2,0,1,0,2,0,3]},
    {name:'reactor', root:92.50, scale:'dorian',    prog:[0,3,6,4],bpm:104,pad:'sawtooth',lead:'square',  arp:[0,0,2,0,1,0,2,3]}
  ];
  const BOSS={name:'boss',root:82.41,scale:'phrygian',prog:[0,1,0,6],bpm:126,pad:'sawtooth',lead:'square',arp:[0,0,1,0,0,2,0,1]};
  const LOBBY={name:'lobby',root:130.81,scale:'major',prog:[0,5,3,4],bpm:72,pad:'sine',lead:'sine',arp:[0,2,4,2,0,2,4,2]};

  const audio={ctx:null,muted:false,adMuted:false,musicVol:.32,sfxVol:.55,activeSoundCount:0,maxConcurrentSounds:8,lastPlayTimestamp:{},ambientTimer:null,ambientStep:0,isBossAtmosphere:false,nextChord:0,themeIndex:-1,
    THEMES,
    init(){
      try{
        if(!this.ctx){const C=win.AudioContext||win.webkitAudioContext;if(!C)return;this.ctx=new C();
          // iOS moves the context to "interrupted" when a native ad/call takes the audio session.
          this.ctx.onstatechange=()=>{if(this.ctx&&this.ctx.state!=='running'&&this.ctx.state!=='closed')this.recover();};
          this.master=this.ctx.createGain();this.musicBus=this.ctx.createGain();this.sfxBus=this.ctx.createGain();
          const comp=this.ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=18;comp.ratio.value=4;comp.attack.value=.005;comp.release.value=.22;
          this.musicBus.connect(this.master);this.sfxBus.connect(this.master);this.master.connect(comp);comp.connect(this.ctx.destination);
          this.noise=this.ctx.createBuffer(1,Math.ceil(this.ctx.sampleRate*1.5),this.ctx.sampleRate);
          const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);
          this.setupSpace();
          this.updateMix();
        }
        if(this.ctx.state!=='running'&&this.ctx.state!=='closed')this.ctx.resume().catch(()=>{});
        if(!this.ambientTimer){this.scheduleMusic();this.ambientTimer=setInterval(()=>this.scheduleMusic(),500);}
      }catch(e){/* Audio failure must not interrupt gameplay. */}
    },
    // A generated "space hall" reverb, shared by music and the big SFX.
    setupSpace(){
      const ctx=this.ctx;if(!ctx.createConvolver)return;
      try{
        const len=Math.ceil(ctx.sampleRate*2.2),ir=ctx.createBuffer(2,len,ctx.sampleRate);
        for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);}
        const conv=ctx.createConvolver();conv.buffer=ir;
        const ret=ctx.createGain();ret.gain.value=.55;conv.connect(ret);ret.connect(this.master);
        this.reverb=conv;
      }catch(e){this.reverb=null;}
    },
    updateMix(){if(!this.ctx||!this.master)return;const t=this.ctx.currentTime;const set=(p,v)=>{p.cancelScheduledValues(t);p.setTargetAtTime(v,t,.035);};set(this.master.gain,this.muted||this.adMuted||doc.hidden?0:1);set(this.musicBus.gain,Math.max(0,Math.min(1,this.musicVol)));set(this.sfxBus.gain,Math.max(0,Math.min(1,this.sfxVol)));},
    setAdMuted(value){
      const wasMuted=this.adMuted;this.adMuted=!!value;this.updateMix();
      if(!this.adMuted){
        // WebKit can report "running" yet stay silent after a native ad took the audio session,
        // so the first tap after an ad always rebuilds the graph inside that user gesture.
        if(wasMuted)this.rebuildOnNextGesture=true;
        this.recover();
      }
    },
    rebuildOnNextGesture:false,
    // Brings audio back after an ad, a phone call or app switch. resume() is tried first;
    // if WebKit leaves the context stuck (a known iOS issue after native fullscreen ads),
    // the whole graph is rebuilt on a fresh AudioContext.
    recover(){
      if(this.adMuted||doc.hidden)return;
      if(!this.ctx){this.init();return;}
      if(this.ctx.state==='running'){this.updateMix();return;}
      const ctx=this.ctx;
      ctx.resume?.().catch(()=>{});
      clearTimeout(this.recoverTimer);
      this.recoverTimer=setTimeout(()=>{
        if(this.ctx===ctx&&ctx.state!=='running'&&!this.adMuted&&!doc.hidden)this.rebuild();
      },this.recoverDelayMs);
    },
    recoverDelayMs:700,
    rebuild(){
      const old=this.ctx;
      this.ctx=null;this.master=null;this.musicBus=null;this.sfxBus=null;this.reverb=null;
      this.activeSoundCount=0;this.nextChord=0;
      if(old){old.onstatechange=null;try{old.close?.();}catch(e){}}
      this.init();
    },
    setMusicTheme(index){
      const i=Math.max(-1,Math.min(THEMES.length-1,Math.floor(Number(index))));
      if(Number.isNaN(i)||i===this.themeIndex)return;
      this.themeIndex=i;this.ambientStep=0;
      // Start the new theme on the next scheduler tick instead of waiting out the old bar.
      if(this.ctx)this.nextChord=Math.min(this.nextChord,this.ctx.currentTime+.25);
    },
    currentTheme(){return this.isBossAtmosphere?BOSS:(THEMES[this.themeIndex]||LOBBY);},
    canTrigger(tag,gap){const now=this.ctx?.currentTime||0;if(this.muted||this.adMuted||doc.hidden||this.sfxVol<=.001||this.activeSoundCount>=this.maxConcurrentSounds)return false;if(this.lastPlayTimestamp[tag]!==undefined&&now-this.lastPlayTimestamp[tag]<gap)return false;this.lastPlayTimestamp[tag]=now;return true;},
    voice({start=0,at=null,duration=.15,freq=200,end=freq,type='sine',volume=.05,noise=false,cutoff=1600,cutoffEnd=null,filterType='lowpass',attack=.005,music=false,tremolo=0,depth=.3,wet=0,detune=0}){
      const ctx=this.ctx;if(!ctx)return;
      const t=at!==null?at:ctx.currentTime+start,source=noise?ctx.createBufferSource():ctx.createOscillator();
      if(noise)source.buffer=this.noise;else{source.type=type;source.frequency.setValueAtTime(freq,t);source.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);if(detune&&source.detune)source.detune.value=detune;}
      const filter=ctx.createBiquadFilter();filter.type=filterType;filter.frequency.value=cutoff;filter.Q.value=.65;
      if(cutoffEnd!==null&&filter.frequency.setValueAtTime){filter.frequency.setValueAtTime(cutoff,t);filter.frequency.exponentialRampToValueAtTime(Math.max(40,cutoffEnd),t+duration);}
      const gain=ctx.createGain();gain.gain.setValueAtTime(.00001,t);gain.gain.linearRampToValueAtTime(volume,t+attack);gain.gain.exponentialRampToValueAtTime(.00001,t+duration);
      source.connect(filter);filter.connect(gain);
      const bus=music?this.musicBus:this.sfxBus;
      const extra=[];
      if(tremolo>0){
        // Amplitude modulation gives an electrical buzz rather than a UI beep.
        const amp=ctx.createGain(),lfo=ctx.createOscillator(),amount=ctx.createGain();
        const d=Math.max(0,Math.min(.95,depth));amp.gain.value=1-d;amount.gain.value=d;
        lfo.type='sine';lfo.frequency.value=tremolo;lfo.connect(amount);amount.connect(amp.gain);
        gain.connect(amp);amp.connect(bus);lfo.start(t);lfo.stop(t+duration+.02);
        extra.push(amp,lfo,amount);
      }else gain.connect(bus);
      if(wet>0&&this.reverb){const send=ctx.createGain();send.gain.value=wet;gain.connect(send);send.connect(this.reverb);extra.push(send);}
      if(!music)this.activeSoundCount++;
      source.onended=()=>{if(!music)this.activeSoundCount=Math.max(0,this.activeSoundCount-1);source.disconnect();filter.disconnect();gain.disconnect();extra.forEach(n=>n.disconnect());};
      source.start(t);source.stop(t+duration+.02);
    },
    effect(tag,gap,layers){this.init();if(!this.ctx||!this.canTrigger(tag,gap))return;for(const layer of layers){if(this.activeSoundCount>=this.maxConcurrentSounds)break;this.voice(layer);}},

    // ---- Weapons ----
    laser(){this.effect('laser',.10,[
      {freq:1350,end:580,duration:.095,volume:.028,type:'sine',cutoff:2300},
      {noise:true,duration:.075,volume:.038,filterType:'bandpass',cutoff:2100,attack:.004},
      {freq:2350,end:1180,duration:.045,volume:.009,type:'triangle',cutoff:3000}
    ]);},
    emp(){this.effect('tesla',.25,[
      {freq:110,end:98,type:'sawtooth',duration:.38,volume:.068,cutoff:1700,tremolo:100,depth:.36,attack:.012},
      {noise:true,duration:.31,volume:.072,filterType:'bandpass',cutoff:2300,tremolo:47,depth:.44,attack:.008}
    ]);},
    plasma(){this.effect('missile',.22,[{noise:true,duration:.36,volume:.13,cutoff:950,attack:.045},{freq:130,end:38,duration:.3,volume:.06}]);},
    railgun(){this.effect('cannon',.18,[
      {noise:true,duration:.10,volume:.13,cutoff:2600,attack:.002},
      {freq:92,end:32,duration:.34,volume:.105,type:'sine',cutoff:500,attack:.003},
      {noise:true,start:.035,duration:.46,volume:.065,cutoff:390,attack:.015}
    ]);},
    cryo(){this.effect('cryo',.2,[
      {noise:true,duration:.24,volume:.06,filterType:'bandpass',cutoff:2600,attack:.025},
      {freq:2637,end:3520,duration:.18,volume:.012,type:'sine',cutoff:5000,wet:.25}
    ]);},
    repair(){this.effect('repair',.25,[{freq:330,end:440,duration:.23,volume:.025,wet:.2},{freq:495,end:660,duration:.29,volume:.018,wet:.2}]);},
    explosion(boss=false){this.effect('impact',boss?.18:.09,boss?[
      {noise:true,duration:.7,volume:.15,cutoff:900,cutoffEnd:120,wet:.4},
      {freq:80,end:24,duration:.55,volume:.11,type:'sine',cutoff:400},
      {freq:220,end:55,duration:.4,volume:.03,type:'sawtooth',cutoff:700}
    ]:[
      {noise:true,duration:.22,volume:.075,cutoff:1400,cutoffEnd:260},
      {freq:150,end:42,duration:.2,volume:.045,type:'sine',cutoff:600}
    ]);},
    orbital(){this.effect('orbital',.5,[
      {freq:1800,end:180,duration:.45,volume:.03,type:'sawtooth',cutoff:3000,cutoffEnd:400},
      {noise:true,start:.35,duration:.9,volume:.14,cutoff:1600,cutoffEnd:150,attack:.02,wet:.5},
      {freq:110,end:30,start:.35,duration:.8,volume:.09}
    ]);},
    bossPulse(){this.effect('boss',.8,[{freq:100,end:65,duration:.45,volume:.04},{freq:150,end:98,duration:.45,volume:.025}]);},
    energy(){this.effect('energy',.35,[
      {freq:1046.5,end:1046.5,duration:.09,volume:.018,type:'triangle',cutoff:4000},
      {freq:1568,end:1568,start:.06,duration:.16,volume:.016,type:'triangle',cutoff:4000,wet:.2}
    ]);},
    uiClick(){this.effect('ui',.05,[{freq:540,end:460,duration:.045,volume:.018}]);},

    // ---- Game events ----
    build(){this.effect('build',.12,[
      {noise:true,duration:.06,volume:.05,filterType:'highpass',cutoff:2500},
      {freq:392,end:392,duration:.12,volume:.03,type:'triangle',cutoff:2400},
      {freq:587.33,end:587.33,start:.07,duration:.18,volume:.03,type:'triangle',cutoff:2400,wet:.2}
    ]);},
    upgrade(level=2){const base=level>=3?523.25:440;this.effect('upgrade',.15,[0,4,7].map((s,i)=>(
      {freq:hz(base,s),end:hz(base,s),start:i*.065,duration:.22,volume:.026,type:'triangle',cutoff:3200,wet:.3})));},
    waveStart(){this.effect('wave',.6,[
      {freq:hz(110,0),end:hz(110,0),duration:.9,attack:.18,volume:.05,type:'sawtooth',cutoff:500,cutoffEnd:1400,wet:.35},
      {freq:hz(110,7),end:hz(110,7),duration:.9,attack:.18,volume:.035,type:'sawtooth',cutoff:500,cutoffEnd:1400,wet:.35},
      {noise:true,duration:.3,volume:.04,cutoff:300}
    ]);},
    baseHit(){this.effect('basehit',.22,[
      {freq:70,end:35,duration:.35,volume:.11,type:'sine',cutoff:400},
      {freq:880,end:440,start:.02,duration:.22,volume:.03,type:'square',cutoff:1800,tremolo:22,depth:.6},
      {noise:true,duration:.18,volume:.06,cutoff:700}
    ]);},
    bossAlert(){this.effect('bossalert',2,[
      {freq:440,end:660,duration:.45,volume:.04,type:'sawtooth',cutoff:1600,wet:.3},
      {freq:440,end:660,start:.5,duration:.45,volume:.04,type:'sawtooth',cutoff:1600,wet:.3},
      {freq:55,end:41,duration:1.1,volume:.08,type:'sine'}
    ]);},
    victory(){this.effect('victory',1,[0,4,7,12].map((s,i)=>(
      {freq:hz(392,s),end:hz(392,s),start:i*.11,duration:i===3?.8:.25,volume:.03,type:'triangle',cutoff:3500,wet:.4})));},
    defeat(){this.effect('defeat',1,[0,-2,-5,-9].map((s,i)=>(
      {freq:hz(311.13,s),end:hz(311.13,s-(i===3?1:0)),start:i*.18,duration:i===3?.9:.3,volume:.03,type:'triangle',cutoff:1500,wet:.4})));},

    // ---- Music: look-ahead bar scheduler ----
    scheduleMusic(){
      if(!this.ctx||this.ctx.state!=='running'||this.muted||this.adMuted||doc.hidden||this.musicVol<=.001)return;
      const now=this.ctx.currentTime;
      if(this.nextChord<now)this.nextChord=now+.05;
      while(this.nextChord<now+1.2)this.nextChord+=this.scheduleBar(this.nextChord);
    },
    // Schedules one 4-beat bar starting at `t`; returns its length in seconds.
    scheduleBar(t){
      const th=this.currentTheme(),scale=SCALES[th.scale],beat=60/th.bpm,bar=beat*4;
      const step=this.ambientStep++,deg=th.prog[step%th.prog.length];
      const note=(d,oct=0)=>hz(th.root,scale[((d%7)+7)%7]+12*(Math.floor(d/7)+oct));
      const boss=th===BOSS,m=true;
      // Pad: triad on the chord degree, long swell, slightly detuned pair for width.
      [0,2,4].forEach((o,i)=>{
        const f=note(deg+o,1);
        this.voice({at:t,freq:f,duration:bar+.6,attack:boss?.08:bar*.35,volume:i===0?.02:.015,type:th.pad,cutoff:boss?900:700,music:m,wet:.45,detune:-6});
        if(th.pad!=='sine')this.voice({at:t,freq:f,duration:bar+.6,attack:boss?.08:bar*.35,volume:.01,type:th.pad,cutoff:700,music:m,wet:.45,detune:7});
      });
      // Bass: root pulses (eighths in boss mode).
      const bassHits=boss?8:2;
      for(let i=0;i<bassHits;i++){
        const bt=t+i*(bar/bassHits);
        this.voice({at:bt,freq:note(deg,-1),duration:boss?beat*.45:beat*1.6,attack:.01,volume:boss?.05:.04,type:boss?'sawtooth':'triangle',cutoff:boss?420:600,music:m});
      }
      // Arpeggio: 8 eighth notes from the chord, quiet and sparkly.
      th.arp.forEach((a,i)=>{
        if(!boss&&step%4===3&&i>3)return; // breathe every 4th bar
        this.voice({at:t+i*beat/2,freq:note(deg+a*2,2),duration:beat*.6,attack:.006,volume:boss?.012:.011,type:th.lead,cutoff:boss?1800:2600,music:m,wet:.35});
      });
      // Percussion: soft kick + hat; heavier in boss mode.
      for(let i=0;i<4;i++){
        if(boss||i%2===0)this.voice({at:t+i*beat,freq:120,end:40,duration:.18,volume:boss?.07:.035,type:'sine',cutoff:500,music:m});
        this.voice({at:t+i*beat+beat/2,noise:true,duration:.05,volume:boss?.022:.012,filterType:'highpass',cutoff:6000,music:m});
      }
      if(boss&&step%2===1)this.voice({at:t+beat*2,noise:true,duration:.25,volume:.045,filterType:'bandpass',cutoff:1800,music:m,wet:.3});
      // Sparse melody on even bars (not in boss mode).
      if(!boss&&step%2===0){
        const mel=[4,2,5,4,7,6,4,2][(step/2)%8];
        this.voice({at:t+beat*1.5,freq:note(deg+mel,2),duration:beat*2.2,attack:.03,volume:.018,type:'sine',cutoff:2400,music:m,wet:.5});
      }
      return bar;
    }
  };
  doc.addEventListener('visibilitychange',()=>{audio.updateMix();if(!doc.hidden)audio.recover();});
  // A user gesture is what iOS needs to let a context resume, so every tap retries when silent.
  const onGesture=()=>{
    if(audio.adMuted||doc.hidden)return;
    if(audio.rebuildOnNextGesture){audio.rebuildOnNextGesture=false;audio.rebuild();return;}
    if(audio.ctx&&audio.ctx.state!=='running')audio.recover();
  };
  doc.addEventListener('pointerdown',onGesture,true);
  doc.addEventListener('touchend',onGesture,true);
  win.addEventListener?.('focus',()=>audio.recover());
  win.addEventListener?.('pageshow',()=>audio.recover());
  return audio;
});
