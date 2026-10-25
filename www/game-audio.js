// Original procedural audio: no third-party recordings or streamed assets.
(function(root, factory) {
  if(typeof module==='object'&&module.exports) module.exports=factory;
  else root.GameAudio=factory(root,document);
})(typeof window==='object'?window:globalThis,function(win,doc){
  const audio={ctx:null,muted:false,adMuted:false,musicVol:.32,sfxVol:.55,activeSoundCount:0,maxConcurrentSounds:8,lastPlayTimestamp:{},ambientTimer:null,ambientStep:0,isBossAtmosphere:false,nextChord:0,
    init(){
      try{
        if(!this.ctx){const C=win.AudioContext||win.webkitAudioContext;if(!C)return;this.ctx=new C();
          this.master=this.ctx.createGain();this.musicBus=this.ctx.createGain();this.sfxBus=this.ctx.createGain();
          const comp=this.ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=18;comp.ratio.value=4;comp.attack.value=.005;comp.release.value=.22;
          this.musicBus.connect(this.master);this.sfxBus.connect(this.master);this.master.connect(comp);comp.connect(this.ctx.destination);
          this.noise=this.ctx.createBuffer(1,Math.ceil(this.ctx.sampleRate*1.5),this.ctx.sampleRate);
          const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);
          this.updateMix();
        }
        if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
        if(!this.ambientTimer){this.scheduleMusic();this.ambientTimer=setInterval(()=>this.scheduleMusic(),1000);}
      }catch(e){/* Audio failure must not interrupt gameplay. */}
    },
    updateMix(){if(!this.ctx||!this.master)return;const t=this.ctx.currentTime;const set=(p,v)=>{p.cancelScheduledValues(t);p.setTargetAtTime(v,t,.035);};set(this.master.gain,this.muted||this.adMuted||doc.hidden?0:1);set(this.musicBus.gain,Math.max(0,Math.min(1,this.musicVol)));set(this.sfxBus.gain,Math.max(0,Math.min(1,this.sfxVol)));},
    setAdMuted(value){this.adMuted=!!value;this.updateMix();},
    canTrigger(tag,gap){const now=this.ctx?.currentTime||0;if(this.muted||this.adMuted||doc.hidden||this.sfxVol<=.001||this.activeSoundCount>=this.maxConcurrentSounds)return false;if(this.lastPlayTimestamp[tag]!==undefined&&now-this.lastPlayTimestamp[tag]<gap)return false;this.lastPlayTimestamp[tag]=now;return true;},
    voice({start=0,duration=.15,freq=200,end=freq,type='sine',volume=.05,noise=false,cutoff=1600,filterType='lowpass',attack=.005,music=false}){
      const ctx=this.ctx;if(!ctx)return;
      const t=ctx.currentTime+start,source=noise?ctx.createBufferSource():ctx.createOscillator();
      if(noise)source.buffer=this.noise;else{source.type=type;source.frequency.setValueAtTime(freq,t);source.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);}
      const filter=ctx.createBiquadFilter();filter.type=filterType;filter.frequency.value=cutoff;filter.Q.value=.65;
      const gain=ctx.createGain();gain.gain.setValueAtTime(.00001,t);gain.gain.linearRampToValueAtTime(volume,t+attack);gain.gain.exponentialRampToValueAtTime(.00001,t+duration);
      source.connect(filter);filter.connect(gain);gain.connect(music?this.musicBus:this.sfxBus);
      if(!music)this.activeSoundCount++;
      source.onended=()=>{if(!music)this.activeSoundCount=Math.max(0,this.activeSoundCount-1);source.disconnect();filter.disconnect();gain.disconnect();};
      source.start(t);source.stop(t+duration+.02);
    },
    effect(tag,gap,layers){this.init();if(!this.ctx||!this.canTrigger(tag,gap))return;for(const layer of layers){if(this.activeSoundCount>=this.maxConcurrentSounds)break;this.voice(layer);}},
    laser(){this.effect('laser',.11,[{freq:720,end:260,duration:.09,volume:.035,type:'triangle',cutoff:1700}]);},
    emp(){this.effect('tesla',.16,[{noise:true,duration:.16,volume:.085,filterType:'bandpass',cutoff:1900},{freq:120,end:70,type:'sawtooth',duration:.12,volume:.025,cutoff:900}]);},
    plasma(){this.effect('missile',.22,[{noise:true,duration:.36,volume:.13,cutoff:950,attack:.045},{freq:130,end:38,duration:.3,volume:.06}]);},
    railgun(){this.effect('cannon',.10,[{noise:true,duration:.07,volume:.10,cutoff:2200},{freq:105,end:42,duration:.11,volume:.055}]);},
    cryo(){this.effect('cryo',.2,[{noise:true,duration:.24,volume:.065,filterType:'bandpass',cutoff:2600,attack:.025}]);},
    repair(){this.effect('repair',.25,[{freq:330,end:440,duration:.23,volume:.025},{freq:495,end:660,duration:.29,volume:.018}]);},
    explosion(boss=false){this.effect('impact',boss?.18:.12,[{noise:true,duration:boss?.5:.24,volume:boss?.14:.08,cutoff:550},{freq:90,end:28,duration:.3,volume:boss?.09:.045}]);},
    orbital(){this.effect('orbital',.5,[{noise:true,duration:.6,volume:.12,cutoff:1200,attack:.08},{freq:220,end:40,duration:.6,volume:.07}]);},
    bossPulse(){this.effect('boss',.8,[{freq:100,end:65,duration:.45,volume:.04},{freq:150,end:98,duration:.45,volume:.025}]);},
    uiClick(){this.effect('ui',.05,[{freq:540,end:460,duration:.045,volume:.018}]);},
    scheduleMusic(){
      if(!this.ctx||this.ctx.state!=='running'||this.muted||this.adMuted||doc.hidden||this.musicVol<=.001)return;
      if(this.ctx.currentTime<this.nextChord)return;
      // Slow Cmaj7 / Am7 / Fmaj7 / Gadd9 pads with a sparse pentatonic melody.
      const chords=[[130.81,196,246.94,329.63],[110,164.81,196,261.63],[87.31,130.81,164.81,220],[98,146.83,220,293.66]];
      const melody=[392,329.63,261.63,293.66,329.63,392,440,329.63];
      const step=this.ambientStep++, chord=chords[step%chords.length];this.nextChord=this.ctx.currentTime+8;
      chord.forEach((freq,i)=>this.voice({freq,end:freq,type:i===0?'triangle':'sine',duration:9.2,attack:1.8,volume:i===0?.035:.025,cutoff:900,music:true}));
      [2,5.5].forEach((start,i)=>this.voice({start,freq:melody[(step*2+i)%melody.length],duration:2.1,attack:.018,volume:.025,cutoff:1400,music:true}));
    }
  };
  doc.addEventListener('visibilitychange',()=>audio.updateMix());
  return audio;
});
