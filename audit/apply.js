// apply.js ops.json — точкові правки карток у dict.js
// {c:"en|ua0", ea:[], ua:[], rep:[old,new], mv:"глос"} або {p:"голий промпт", ea:[]} (усім карткам з цим ua)
const fs=require("fs"),vm=require("vm"),P=require("path").join(__dirname,"..","dict.js");
let s=fs.readFileSync(P,"utf8");const ops=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const q=JSON.stringify,bare=u=>String(u).replace(/\s*\([^)]*\)/g,"").trim();
const has=(arr,x)=>arr.some(y=>y.toLowerCase()===x.toLowerCase());
const ser=v=>Array.isArray(v)?"["+v.map(q).join(",")+"]":q(v);
// усі літерали карток у блоці WORDS
const wEnd=s.indexOf("\n];",s.indexOf("const WORDS = ["));
function cards(){const out=[];const re=/\{en:"[^}]*\}/g;let m;const WE=s.indexOf("\n];",s.indexOf("const WORDS = ["));re.lastIndex=s.indexOf("const WORDS = [");
  while((m=re.exec(s))&&m.index<WE){out.push({pos:m.index,lit:m[0],get obj(){return this._o||(this._o=new Function("return ("+this.lit+")")());}});}return out;}
let n=0,miss=[];
for(const op of ops){
  const all=cards();let targets;
  if(op.p)targets=all.filter(c=>[].concat(c.obj.ua).some(u=>bare(u)===op.p));
  else{const[en,ua0]=op.c.split("|");targets=all.filter(c=>[].concat(c.obj.en)[0]===en&&[].concat(c.obj.ua)[0]===ua0);}
  if(!targets.length){miss.push(op.c||op.p);continue;}
  for(const t of targets.reverse()){const o=t.obj,en=[].concat(o.en)[0];
    const swap=(old,nw)=>{const arr=[].concat(o.ua);const i=arr.indexOf(old);if(i<0){miss.push("rep:"+old);return;}
      if(nw===null)arr.splice(i,1);else arr[i]=nw;o.ua=arr.length===1?arr[0]:arr;
      o.uaAlt=o.uaAlt||[];if(!has(o.uaAlt,old)&&!has([].concat(o.ua),old))o.uaAlt.unshift(old);
      if(nw)for(const k of[q(en+":"+old)])if(s.includes(k))s=s.split(k).join(q(en+":"+nw));};
    if(op.rep)swap(op.rep[0],op.rep[1]);
    if(op.mv)swap(op.mv,null);
    if(o.uaAlt)o.uaAlt=o.uaAlt.filter(x=>!has([].concat(o.ua),x));
    for(const x of op.ua||[]){o.uaAlt=o.uaAlt||[];if(!has([].concat(o.ua),x)&&!has(o.uaAlt,x))o.uaAlt.push(x);}
    for(const x of op.ea||[]){if(has([].concat(o.en),x))continue;o.enAlt=o.enAlt||[];if(!has(o.enAlt,x))o.enAlt.push(x);}
    const keys=Object.keys(o).filter(k=>o[k]!==undefined&&!(Array.isArray(o[k])&&!o[k].length&&k!=="ua"));
    const out="{"+keys.map(k=>k+":"+ser(o[k])).join(",")+"}";
    const pos=s.indexOf(t.lit,t.pos);s=s.slice(0,pos)+out+s.slice(pos+t.lit.length);n++;}
}
fs.writeFileSync(P,s);console.log("applied",n,"miss",miss.length,miss.slice(0,30));
