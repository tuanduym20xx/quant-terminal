function fixedTest(b,{kind='rsi',rr=6,capital=5000,fee=.0005}={}){let eq=capital,peak=eq,low=eq,dd=0,p=null,next=null,u=0,d=0,sum=0,curve=[eq],trades=[],fees=0;for(let i=0;i<b.length;i++){let [t,o,h,l,c]=b[i],prev=b[Math.max(0,i-1)][4];sum+=c;if(i>=200)sum-=b[i-200][4];u=(u+Math.max(c-prev,0))/2;d=(d+Math.max(prev-c,0))/2;if(next&&!p){let {s}=next,e=o+s*.2,q=Math.max(0,Math.min(5000,capital,eq))/e;if(q>0){let dist=50/q;p={s,e,q,sl:e-s*dist,tp:e+s*dist*rr,i}};next=null}if(p){let hs=p.s>0?l<=p.sl:h>=p.sl,ht=p.s>0?h>=p.tp:l<=p.tp;if(hs||ht){let ex=(hs?(p.s>0?Math.min(o,p.sl):Math.max(o,p.sl)):p.tp)-p.s*.2,f=(ex+p.e)*p.q*fee,net=(ex-p.e)*p.s*p.q-f;eq+=net;fees+=f;trades.push({...p,j:i,ex,net});p=null;peak=Math.max(peak,eq);low=Math.min(low,eq);dd=Math.max(dd,(peak-eq)/peak)}}if(!p&&i>=200&&eq>0){let s=0;if(kind==='rsi'){let r=d===0?100:100-100/(1+u/d);s=c>sum/200&&r<10?1:c<sum/200&&r>90?-1:0}else{let v=b.slice(i-20,i);s=c>Math.max(...v.map(x=>x[2]))?1:c<Math.min(...v.map(x=>x[3]))?-1:0}if(s)next={s}}curve.push(eq)}let w=trades.filter(t=>t.net>0),l=trades.filter(t=>t.net<=0),gp=w.reduce((s,t)=>s+t.net,0),gl=-l.reduce((s,t)=>s+t.net,0);return{eq,net:eq-capital,low,peak,dd,fees,trades,curve,p,wr:trades.length?w.length/trades.length:0,pf:gl?gp/gl:null,rr:w.length&&gl?gp/w.length/(gl/l.length):null}}

export function test(b,o={}) {
 if(o.kind!=='original') return fixedTest(b,o);
 const capital=o.capital??5000,fee=o.fee??.0005;
 let eq=capital,peak=eq,low=eq,dd=0,p=null,next=null,u=0,d=0,sum=0,fast=0,fees=0,curve=[eq],trades=[];
 for(let i=0;i<b.length;i++){
  const [,open,,,c]=b[i],prev=b[Math.max(0,i-1)][4];
  sum+=c;fast+=c;if(i>=200)sum-=b[i-200][4];if(i>=5)fast-=b[i-5][4];
  if(i===2){u=(Math.max(b[1][4]-b[0][4],0)+Math.max(c-prev,0))/2;d=(Math.max(b[0][4]-b[1][4],0)+Math.max(prev-c,0))/2;}
  else if(i>2){u=(u+Math.max(c-prev,0))/2;d=(d+Math.max(prev-c,0))/2;}
  if(next?.exit&&p){let ex=open,f=(ex+p.e)*p.q*fee,net=(ex-p.e)*p.s*p.q-f;eq+=net;fees+=f;trades.push({...p,j:i,ex,net});p=null;peak=Math.max(peak,eq);low=Math.min(low,eq);dd=Math.max(dd,(peak-eq)/peak);}
  else if(next&&!p&&eq>0){let q=next.notional/open;if(q>0)p={s:next.s,e:open,q,i};}
  next=null;
  if(i>=199){let r=d===0?(u===0?50:100):100-100/(1+u/d);
   if(p){if(p.s>0?c>fast/5:c<fast/5)next={exit:true};}
   else if(eq>0){let s=c>sum/200&&r<10?1:c<sum/200&&r>90?-1:0;if(s)next={s,notional:eq*.95};}
  }
  curve.push(eq);
 }
 let w=trades.filter(t=>t.net>0),l=trades.filter(t=>t.net<=0),gp=w.reduce((s,t)=>s+t.net,0),gl=-l.reduce((s,t)=>s+t.net,0);
 return {eq,net:eq-capital,low,peak,dd,fees,trades,curve,p,wr:trades.length?w.length/trades.length:0,pf:gl?gp/gl:null,rr:w.length&&gl?gp/w.length/(gl/l.length):null};
}
