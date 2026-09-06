import { useRef } from "react";
import { GOLD, MAROON, SERIF } from "@nakshra/shared-config/theme";

export function OtpBoxes({ value, onChange, onComplete }: { value:string[]; onChange:(v:string[])=>void; onComplete?:(fullCode:string)=>void; }) {
  const r0=useRef<HTMLInputElement>(null),r1=useRef<HTMLInputElement>(null),
        r2=useRef<HTMLInputElement>(null),r3=useRef<HTMLInputElement>(null),
        r4=useRef<HTMLInputElement>(null),r5=useRef<HTMLInputElement>(null);
  const refs=[r0,r1,r2,r3,r4,r5];
  const handleKey=(i:number,e:React.KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==="Backspace"){if(!value[i]&&i>0)refs[i-1].current?.focus();
      const n=[...value];n[i]="";onChange(n);}
  };
  const handleChange=(i:number,raw:string)=>{
    const d=raw.replace(/\D/g,"");if(!d)return;
    if(d.length>1){const arr=d.slice(0,6).split("");const n=[...value];
      arr.forEach((x,idx)=>{if(idx<6)n[idx]=x;});onChange(n);
      refs[Math.min(arr.length,5)].current?.focus();if(arr.length>=6)onComplete?.(n.join(""));return;}
    const n=[...value];n[i]=d;onChange(n);
    if(i<5)refs[i+1].current?.focus();if(i===5)onComplete?.(n.join(""));
  };
  return(
    <div className="flex gap-1.5 sm:gap-2.5 justify-center w-full my-2">
      {Array.from({length:6}).map((_,i)=>(
        <input key={i} ref={refs[i]} type="text" pattern="[0-9]*" maxLength={1} autoComplete="off"
          value={value[i]||""} onKeyDown={e=>handleKey(i,e)} onChange={e=>handleChange(i,e.target.value)}
          onPaste={e => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (pasted) {
              const arr = pasted.split("");
              const n = [...value];
              arr.forEach((x, idx) => { if (idx < 6) n[idx] = x; });
              onChange(n);
              refs[Math.min(arr.length, 5)].current?.focus();
              if (arr.length >= 6) onComplete?.(n.join(""));
            }
          }}
          className="w-9 sm:w-11 h-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl sm:rounded-2xl outline-none transition-all duration-200"
          style={{ border:`2px solid ${value[i]?GOLD:"rgba(91,31,36,0.15)"}`,
            background:value[i]?"rgba(200,160,68,0.06)":"#FFFFFF", color:MAROON,
            fontFamily:SERIF, boxShadow:value[i]?`0 0 0 3px rgba(200,160,68,0.1)`:"none" }}
          onFocus={e=>{e.target.style.borderColor=GOLD;e.target.style.boxShadow=`0 0 0 3px rgba(200,160,68,0.12)`;}}
          onBlur={e=>{e.target.style.borderColor=value[i]?GOLD:"rgba(91,31,36,0.15)";
            e.target.style.boxShadow=value[i]?`0 0 0 3px rgba(200,160,68,0.1)`:"none";}}/>
      ))}
    </div>
  );
}
