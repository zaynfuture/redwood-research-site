/* Aligned exact-print price path, volume-at-price profile, and time-volume chart. */
(() => {
  'use strict';

  const NS='http://www.w3.org/2000/svg',instances=new WeakMap();
  const c={ink:'#f3eeeb',muted:'#bcbabd',grid:'#36383b',paper:'#131416',outside:'#62676e',
    value:'#7798bd',valueDark:'#a5c3e3',valueBand:'#1c2734',peak:'#f3755e',vwap:'#e6a579',
    up:'#63c7af',down:'#dc7668',cross:'#c4bdbb',tooltip:'#252629',ma50:'#64d4ef',ma200:'#f6b56b'};

  const el=(name,attrs={},text)=>{const n=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
  const text=(parent,x,y,value,attrs={})=>{const n=el('text',{x,y,fill:c.muted,'font-size':12,'dominant-baseline':'middle',...attrs},value);parent.append(n);return n;};
  const nice=raw=>{if(!(raw>0))return 1;const f=10**Math.floor(Math.log10(raw)),u=raw/f;return(u<=1?1:u<=2?2:u<=2.5?2.5:u<=5?5:10)*f;};

  function grouped(bins,maximum){
    const stride=Math.max(1,Math.ceil(bins.length/maximum)),rows=[];
    for(let i=0;i<bins.length;i+=stride){const slice=bins.slice(i,i+stride);rows.push({lower:slice[0].lower,upper:slice.at(-1).upper,
      shares:slice.reduce((n,b)=>n+b.shares,0),percent:slice.reduce((n,b)=>n+b.percent,0),binCount:slice.length});}
    return{rows,stride};
  }

  function syntheticBars(profile,targetClose){
    const bins=profile.bins.filter(b=>b.shares>0);if(!bins.length)return[];
    const low=bins[0].lower,high=bins.at(-1).upper,span=high-low,start=Date.parse(profile.start),end=Date.parse(profile.end);
    const count=Math.max(2,Math.min(390,Math.round((end-start)/60000)||36));
    const weights=Array.from({length:count},(_,i)=>1.2+(1+Math.sin(i*.19))*.55+(i>count*.88?2.2:0));
    const allocate=total=>{const sum=weights.reduce((n,v)=>n+v,0),values=weights.map(v=>Math.floor(total*v/sum));let rest=total-values.reduce((n,v)=>n+v,0);for(let i=values.length-1;rest>0;i=(i-1+values.length)%values.length){values[i]++;rest--;}return values;};
    const shares=allocate(profile.totalShares),trades=allocate(profile.accepted||0);let previous=low+span*.18;
    return Array.from({length:count},(_,i)=>{
      const trend=i/(count-1),wave=Math.sin(i*.11)*.07+Math.sin(i*.029)*.04;
      let close=Math.max(low+span*.04,Math.min(high-span*.04,low+span*(.17+trend*.68+wave)));
      if(i===count-1&&Number.isFinite(targetClose))close=Math.max(low,Math.min(high,targetClose));
      const open=previous,barLow=Math.min(open,close)-span*.006,barHigh=Math.max(open,close)+span*.006;
      previous=close;
      return{start:new Date(start+i*60000).toISOString(),ms:start+i*60000,open,high:Math.min(high,barHigh),
        low:Math.max(low,barLow),close,shares:shares[i],trades:trades[i],vwap:(open+close)/2};
    });
  }

  function render(host,profile,options={}){
    instances.get(host)?.();
    const integer=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
    const compact=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1});
    const precision=Math.min(8,Math.max(2,...[profile.step,profile.bins?.[0]?.lower||0].map(v=>(Number(v).toFixed(8).replace(/0+$/,'').split('.')[1]||'').length)));
    const money=new Intl.NumberFormat('en-US',{minimumFractionDigits:precision,maximumFractionDigits:precision});
    const price=n=>money.format(n),pct=n=>n>0&&n<.01?'<0.01%':n.toFixed(2)+'%';
    const root=el('svg',{role:'img','aria-label':'Price path and exact volume profile',width:'100%',tabindex:0,
      style:'display:block;width:100%;max-width:100%;font-family:inherit;font-variant-numeric:tabular-nums'});
    host.replaceChildren(root);
    let layout=null,frame=0,lastKey='',selection={kind:null,index:-1};

    function clearInspect(){if(!layout)return;layout.overlay.replaceChildren();root.removeAttribute('aria-valuetext');selection={kind:null,index:-1};options.onInspect?.(null);}
    function tooltip(lines,x,y,width=190){
      const g=layout.overlay,boxH=lines.length*17+16,bx=Math.max(6,Math.min(layout.width-width-6,x)),by=Math.max(layout.top,Math.min(layout.height-boxH-5,y));
      g.append(el('rect',{x:bx,y:by,width,height:boxH,rx:6,fill:c.tooltip,stroke:c.grid,opacity:.98}));
      lines.forEach((line,i)=>text(g,bx+10,by+15+i*17,line,{fill:i?'#eaded7':'white','font-size':i?11:12,'font-weight':i?450:650}));
    }

    function inspectProfile(index){
      if(!layout||!layout.rows[index])return;const b=layout.rows[index],top=layout.y(b.upper),bottom=layout.y(b.lower),mid=(top+bottom)/2;
      selection={kind:'profile',index};layout.overlay.replaceChildren();
      layout.overlay.append(el('rect',{x:layout.left,y:top,width:layout.plotRight-layout.left,height:Math.max(1,bottom-top),fill:'none',stroke:c.peak,'stroke-dasharray':'3 3'}));
      tooltip(['$'+price(b.lower)+' – $'+price(b.upper),integer.format(b.shares)+' shares · '+pct(b.percent)],layout.priceRight-196,mid<layout.mainMiddle?mid+10:mid-60,205);
      root.setAttribute('aria-valuetext','$'+price(b.lower)+' to $'+price(b.upper)+', '+integer.format(b.shares)+' shares, '+pct(b.percent));
      options.onInspect?.({...b});
    }

    function inspectTime(index){
      if(!layout||!layout.timeBars[index])return;const b=layout.timeBars[index],x=layout.timeX(index),at=layout.y(b.close),stamp=new Date(b.ms).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit'});
      selection={kind:'time',index};layout.overlay.replaceChildren();
      layout.overlay.append(el('line',{x1:x,x2:x,y1:layout.top,y2:layout.volumeBottom,stroke:c.cross,'stroke-dasharray':'3 4'}));
      layout.overlay.append(el('circle',{cx:x,cy:at,r:4,fill:c.paper,stroke:c.ink,'stroke-width':2}));
      tooltip([stamp+' ET · $'+price(b.close),'O '+price(b.open)+'  H '+price(b.high)+'  L '+price(b.low),compact.format(b.shares)+' shares · '+integer.format(b.trades)+' trades'],x+12,at-66,220);
      root.setAttribute('aria-valuetext',stamp+' ET, close '+price(b.close)+', '+integer.format(b.shares)+' shares');
      options.onInspect?.({time:b.start,close:b.close,shares:b.shares});
    }

    function draw(){
      const width=Math.max(300,Math.round(host.getBoundingClientRect().width||760)),narrow=width<620;
      root.style.height='var(--profile-chart-height,'+(narrow?430:510)+'px)';
      const height=Math.max(360,Math.round(root.getBoundingClientRect().height||510)),key=width+':'+height;
      if(key===lastKey)return;lastKey=key;root.setAttribute('viewBox','0 0 '+width+' '+height);
      root.replaceChildren(el('title',{},'Price path and exact volume profile'),el('desc',{},'Exact accepted SIP prints grouped by price and minute. Use arrow keys or pointer inspection.'));
      const bins=profile?.bins||[];if(!bins.length){text(root,width/2,height/2,'No verified price bins available',{'text-anchor':'middle'});return;}
      const timeBars=profile.timeBars?.length?profile.timeBars:(options.synthetic?syntheticBars(profile,options.syntheticClose):[]);
      const left=12,plotRight=width-(narrow?56:88),top=narrow?47:31,volumeBottom=height-30,volumeTop=height-(narrow?92:106),mainBottom=volumeTop-18,mainMiddle=(top+mainBottom)/2;
      const {rows,stride}=grouped(bins,Math.max(22,Math.floor((mainBottom-top)/5.3)));
      const lows=[rows[0].lower,...timeBars.map(b=>b.low)],highs=[rows.at(-1).upper,...timeBars.map(b=>b.high)];
      let low=Math.min(...lows),high=Math.max(...highs);const pad=Math.max(profile.step,(high-low)*.04);low=Math.max(0,low-pad);high+=pad;
      const y=v=>mainBottom-(v-low)/(high-low)*(mainBottom-top),profileWidth=Math.min(narrow?width*.23:width*.27,285),profileRight=plotRight,priceRight=plotRight-profileWidth-8;
      const maxShares=Math.max(...rows.map(b=>b.shares));
      const startMs=Date.parse(profile.start),endMs=Date.parse(profile.end);
      const timeAt=ms=>left+(ms-startMs)/Math.max(1,endMs-startMs)*(priceRight-left);
      const timeX=i=>timeAt(timeBars[i].ms);
      const maxTimeVolume=Math.max(1,...timeBars.map(b=>b.shares)),volumeY=v=>volumeBottom-v/maxTimeVolume*(volumeBottom-volumeTop);
      const valueArea=profile.complete&&options.showVA!==false?profile.valueArea:null;

      if(valueArea)root.append(el('rect',{x:left,y:y(valueArea.upper),width:plotRight-left,height:y(valueArea.lower)-y(valueArea.upper),fill:c.valueBand}));
      const tick=nice((high-low)/(narrow?5:7)),first=Math.ceil(low/tick),last=Math.floor(high/tick),ticks=[];
      for(let n=first;n<=last&&n-first<12;n++){const v=n*tick,at=y(v);root.append(el('line',{x1:left,x2:plotRight,y1:at,y2:at,stroke:c.grid,'stroke-dasharray':'2 4'}));ticks.push({at,value:v});}
      root.append(el('line',{x1:left,x2:plotRight,y1:mainBottom,y2:mainBottom,stroke:c.grid}));
      root.append(el('line',{x1:left,x2:plotRight,y1:volumeBottom,y2:volumeBottom,stroke:c.grid}));
      text(root,left,13,options.synthetic?(narrow?'SYNTHETIC · NOT MARKET DATA':'SYNTHETIC PATH · NOT MARKET DATA'):(narrow?'EXACT PRINTS · 1 MIN':'EXACT ACCEPTED PRINTS · 1 MIN'),{fill:options.synthetic?c.peak:c.valueDark,'font-size':10,'font-weight':700,'letter-spacing':'.08em'});
      text(root,narrow?left:plotRight,narrow?29:13,(narrow?'TRUE % OF VOLUME':'PROFILE = % OF WINDOW SHARES')+(stride>1?' · '+stride+' BINS/ROW':''),{'text-anchor':narrow?'start':'end','font-size':10,'font-weight':650,'letter-spacing':'.06em'});

      for(const b of rows){
        if(!b.shares)continue;const barTop=y(b.upper),barBottom=y(b.lower),h=Math.max(.7,barBottom-barTop-1),w=b.shares/maxShares*profileWidth;
        const inValue=valueArea&&b.lower>=valueArea.lower&&b.upper<=valueArea.upper,isPeak=profile.poc&&b.lower<=profile.poc.lower&&b.upper>profile.poc.lower;
        root.append(el('rect',{x:profileRight-Math.max(.8,w),y:barTop+.5,width:Math.max(.8,w),height:h,fill:isPeak?c.peak:inValue?c.value:c.outside,opacity:isPeak?1:.86}));
        if(w>42&&h>10)text(root,profileRight-4,(barTop+barBottom)/2,pct(b.percent),{'text-anchor':'end','font-size':9,fill:isPeak?'#21100b':c.ink,'font-weight':650});
      }
      if(timeBars.length){
        const line=timeBars.map((b,i)=>(i?'L':'M')+timeX(i)+' '+y(b.close)).join(' ');
        root.append(el('path',{d:line,fill:'none',stroke:c.ink,'stroke-width':narrow?1.35:1.6,'stroke-linejoin':'round','stroke-linecap':'round'}));
        const barWidth=Math.max(1,Math.min(8,(priceRight-left)/Math.max(1,timeBars.length)*.68));
        timeBars.forEach((b,i)=>{const x=timeX(i),fill=b.close>=b.open?c.up:c.down;root.append(el('rect',{x:x-barWidth/2,y:volumeY(b.shares),width:barWidth,height:volumeBottom-volumeY(b.shares),fill,opacity:.72}));});
        const times=[startMs,(startMs+endMs+1)/2,endMs+1];
        times.forEach((ms,index)=>{const label=new Date(ms).toLocaleTimeString('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit'});text(root,timeAt(ms),height-10,label,{fill:c.muted,'font-size':10,'text-anchor':index===0?'start':index===2?'end':'middle'});});
        text(root,left,volumeTop-7,'TIME VOLUME',{'font-size':9,'font-weight':700,'letter-spacing':'.08em'});
      }else text(root,(left+plotRight)/2,(top+mainBottom)/2,'Price path unavailable for this legacy profile',{'text-anchor':'middle','font-size':12});

      const marks=[];
      if(valueArea){marks.push({value:valueArea.upper,label:'VAH',color:c.valueDark,dash:'4 4'});marks.push({value:valueArea.lower,label:'VAL',color:c.valueDark,dash:'4 4'});}
      if(profile.poc)marks.push({value:(profile.poc.lower+profile.poc.upper)/2,label:'POC',color:c.peak,dash:'6 3',strong:true});
      if(options.showVwap!==false&&Number.isFinite(profile.vwap))marks.push({value:profile.vwap,label:'VWAP',color:c.vwap,dash:'2 4'});
      if(timeBars.length)marks.push({value:timeBars.at(-1).close,label:'LAST',color:c.ink,dash:'2 3'});
      for(const length of [50,200]){
        const value=profile.movingAverages?.[length];
        if(options['showMA'+length]!==false&&Number.isFinite(value)){
          marks.push({value,label:'MA'+length,color:c['ma'+length],dash:'5 5'});
        }
      }
      root.append(el('line',{x1:priceRight+4,x2:priceRight+4,y1:top,y2:mainBottom,stroke:c.grid}));
      const displayed=marks.filter(mark=>mark.value>=low&&mark.value<=high).sort((a,b)=>b.value-a.value);
      displayed.forEach((mark,index)=>{
        const at=y(mark.value),previous=displayed[index-1]?.labelY??top-18;
        mark.labelY=Math.min(Math.max(at,previous+17),mainBottom-(displayed.length-index-1)*17);
        root.append(el('line',{x1:left,x2:plotRight,y1:at,y2:at,stroke:mark.color,'stroke-width':mark.strong?1.5:1,'stroke-dasharray':mark.dash}));
        root.append(el('line',{x1:plotRight,x2:plotRight+5,y1:at,y2:mark.labelY,stroke:mark.color}));
        const label=mark.label+(mark.strong&&!narrow?' '+price(mark.value):''),w=narrow?48:78;
        root.append(el('rect',{x:plotRight+5,y:mark.labelY-8,width:w,height:16,rx:3,fill:mark.strong?mark.color:c.paper,stroke:mark.color}));
        text(root,plotRight+5+w/2,mark.labelY,label,{'text-anchor':'middle','font-size':9,'font-weight':700,fill:mark.strong?'#21100b':mark.color});
      });

      for(const {at,value} of ticks){
        if(!displayed.some(mark=>Math.abs(mark.labelY-at)<14))text(root,plotRight+7,at,price(value),{fill:c.ink,'font-size':11});
      }
      const overlay=el('g',{'pointer-events':'none','aria-hidden':'true'});root.append(overlay);
      layout={width,height,left,plotRight,profileRight,priceRight,top,mainBottom,mainMiddle,volumeTop,volumeBottom,y,rows,timeBars,timeX,overlay,low,high};
      if(selection.kind==='profile')inspectProfile(Math.min(selection.index,rows.length-1));
      if(selection.kind==='time')inspectTime(Math.min(selection.index,timeBars.length-1));
    }

    function pointer(event){
      if(!layout)return;const r=root.getBoundingClientRect(),x=(event.clientX-r.left)*layout.width/r.width,y=(event.clientY-r.top)*layout.height/r.height;
      if(y<layout.top||y>layout.volumeBottom||x<layout.left||x>layout.plotRight)return clearInspect();
      if(x>layout.priceRight&&y<=layout.mainBottom){const value=layout.high-(y-layout.top)/(layout.mainBottom-layout.top)*(layout.high-layout.low);const i=layout.rows.findIndex(b=>value<b.upper);inspectProfile(i<0?layout.rows.length-1:i);}
      else if(layout.timeBars.length){
        let index=0,distance=Infinity;
        layout.timeBars.forEach((_,i)=>{const offset=Math.abs(layout.timeX(i)-x);if(offset<distance){distance=offset;index=i;}});
        inspectTime(index);
      }
    }
    root.addEventListener('pointermove',pointer);root.addEventListener('pointerdown',pointer);
    root.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch'&&document.activeElement!==root)clearInspect();});
    root.addEventListener('focus',()=>{if(selection.index<0&&layout){const i=layout.rows.findIndex(b=>profile.poc&&b.lower<=profile.poc.lower&&b.upper>profile.poc.lower);inspectProfile(Math.max(0,i));}});
    root.addEventListener('blur',clearInspect);
    root.addEventListener('keydown',event=>{if(!layout)return;const keys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Escape'];if(!keys.includes(event.key))return;event.preventDefault();if(event.key==='Escape')return clearInspect();
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){if(!layout.timeBars.length)return;const base=selection.kind==='time'?selection.index:0;return inspectTime(Math.max(0,Math.min(layout.timeBars.length-1,event.key==='ArrowRight'?base+1:base-1)));}
      const base=selection.kind==='profile'?selection.index:0;if(event.key==='Home')return inspectProfile(0);if(event.key==='End')return inspectProfile(layout.rows.length-1);inspectProfile(Math.max(0,Math.min(layout.rows.length-1,event.key==='ArrowUp'?base+1:base-1)));});
    draw();
    const resize=()=>{cancelAnimationFrame(frame);lastKey='';frame=requestAnimationFrame(draw);};
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(host);if(!observer)window.addEventListener('resize',resize);
    const cleanup=()=>{observer?.disconnect();if(!observer)window.removeEventListener('resize',resize);cancelAnimationFrame(frame);root.remove();instances.delete(host);};
    instances.set(host,cleanup);return cleanup;
  }

  globalThis.ProfileChart=Object.freeze({render});
})();
