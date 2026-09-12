import { useRef } from "react";
import { GOLD, MAROON, SERIF } from "@nakshra/shared-config/theme";

// Renders one box per entry in `value`, so the code length is whatever the
// caller asks for. It used to hardcode 6 everywhere — six refs, slice(0,6),
// i===5 — which silently truncated anything longer: a pasted 8-digit code lost
// its last two digits and verification then failed with no useful error.
// Twilio Verify sends 6 digits, Supabase's email codes came through as 8, so
// the length has to come from the caller rather than be assumed here.
export function OtpBoxes({ value, onChange, onComplete }: { value:string[]; onChange:(v:string[])=>void; onComplete?:(fullCode:string)=>void; }) {
  const len = value.length;
  const last = len - 1;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focus = (i:number) => refs.current[Math.max(0, Math.min(i, last))]?.focus();

  const handleKey=(i:number,e:React.KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==="Backspace"){if(!value[i]&&i>0)focus(i-1);
      const n=[...value];n[i]="";onChange(n);}
  };

  // Shared by typing multiple characters and by paste: drop non-digits, write
  // at most `len` of them, move focus to the first empty box, and fire
  // onComplete only once every box is filled.
  const fill=(raw:string,from=0)=>{
    const d=raw.replace(/\D/g,"").slice(0,len-from);
    if(!d)return false;
    const n=[...value];
    d.split("").forEach((x,idx)=>{if(from+idx<len)n[from+idx]=x;});
    onChange(n);
    focus(from+d.length);
    if(n.every(c=>c))onComplete?.(n.join(""));
    return true;
  };

  const handleChange=(i:number,raw:string)=>{
    const d=raw.replace(/\D/g,"");if(!d)return;
    if(d.length>1){fill(d,i);return;}
    const n=[...value];n[i]=d;onChange(n);
    if(i<last)focus(i+1);
    if(n.every(c=>c))onComplete?.(n.join(""));
  };

  return(
    <div className="flex gap-1.5 sm:gap-2.5 justify-center w-full my-2">
      {value.map((_,i)=>(
        <input key={i} ref={el=>{refs.current[i]=el;}} type="text" pattern="[0-9]*" maxLength={1} autoComplete="off"
          value={value[i]||""} onKeyDown={e=>handleKey(i,e)} onChange={e=>handleChange(i,e.target.value)}
          onPaste={e => { e.preventDefault(); fill(e.clipboardData.getData("text"), 0); }}
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
