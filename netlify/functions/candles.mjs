
import { inflateRawSync } from 'node:zlib';

function unzip(b) {
  let p = b.length - 22;
  while (p >= Math.max(0,b.length-65557)) {
    if (b.readUInt32LE(p) === 0x06054b50) break;
    p--;
  }
  if (p < 0 || b.readUInt32LE(p) !== 0x06054b50)
    throw Error('Invalid ZIP');

  let c = b.readUInt32LE(p+16);
  const total = b.readUInt16LE(p+10);

  for(let j=0;j<total;j++){
    if(b.readUInt32LE(c)!==0x02014b50)
      throw Error('Invalid ZIP directory');

    const method=b.readUInt16LE(c+10);
    const size=b.readUInt32LE(c+20);
    const nl=b.readUInt16LE(c+28);
    const el=b.readUInt16LE(c+30);
    const cl=b.readUInt16LE(c+32);
    const off=b.readUInt32LE(c+42);
    const name=b.toString('utf8',c+46,c+46+nl);

    if(name.endsWith('.csv')){
      const start=off+30+
        b.readUInt16LE(off+26)+
        b.readUInt16LE(off+28);

      const data=b.subarray(start,start+size);

      if(method===0) return data.toString('utf8');
      if(method===8)
        return inflateRawSync(data).toString('utf8');

      throw Error('Unsupported ZIP');
    }
    c+=46+nl+el+cl;
  }
  throw Error('CSV not found');
}

export default async function(req){
  try{
    const q=new URL(req.url).searchParams;
    const s=(q.get('symbol')||'BTCUSDT').toUpperCase();
    const i=q.get('interval')||'30m';
    const n=Math.floor(Math.min(9000,Math.max(
      300,Number(q.get('count'))||1500
    )));

    const steps={
      '5m':300000,
      '15m':900000,
      '30m':1800000,
      '1h':3600000,
      '4h':14400000,
      '1d':86400000
    };

    if(!/^[A-Z0-9]{3,20}$/.test(s)||!steps[i])
      return Response.json(
        {error:'Invalid parameters'},{status:400}
      );

    const root='https://data.binance.vision/data/futures/um/monthly/klines';
    const now=new Date();
    const rows=new Map();

    const months=Math.ceil(
      n*steps[i]/(28*86400000)
    )+2;

    for(let k=1;k<=months;k+=6){
      const jobs=[];

      for(let j=k;j<Math.min(k+6,months+1);j++){
        const d=new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth()-j,1
        ));

        const m=d.toISOString().slice(0,7);
        const url=`${root}/${s}/${i}/${s}-${i}-${m}.zip`;

        jobs.push((async()=>{
          const r=await fetch(url,{
            signal:AbortSignal.timeout(12000)
          });

          if(r.status===404)return [];
          if(!r.ok)
            throw Error('Archive HTTP '+r.status);

          const csv=unzip(
            Buffer.from(await r.arrayBuffer())
          );

          return csv.trim().split(/\r?\n/)
            .map(x=>x.split(',').slice(0,6).map(Number))
            .filter(x=>x.length===6 &&
              x.every(Number.isFinite) &&
              x[0]>0 && x[2]>=x[3]);
        })());
      }

      const batches=await Promise.all(jobs);

      for(const batch of batches)
        for(const x of batch)rows.set(x[0],x);

      if(rows.size>=n)break;
    }

    const data=[...rows.values()]
      .sort((a,b)=>a[0]-b[0]).slice(-n);

    if(data.length<300)
      throw Error('Not enough historical candles');

    for(let j=1;j<data.length;j++){
      if(data[j][0]-data[j-1][0]!==steps[i])
        throw Error('Missing candles in archive');
    }

    return Response.json(data,{
      headers:{
        'Cache-Control':'public, max-age=3600',
        'X-Data-Source':'Binance Futures Archive'
      }
    });

  }catch(e){
    return Response.json(
      {error:e.message},{status:502}
    );
  }
}
