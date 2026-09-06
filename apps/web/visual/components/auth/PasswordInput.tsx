import { useState } from "react";
import { MAROON, SAFFRON } from "@nakshra/shared-config/theme";
import { AuthInput } from "./AuthInput";

export function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const strength = value.length===0?0:value.length<6?1:value.length<10?2:3;
  const sc = ["transparent","#E74C3C",SAFFRON,"#4A8A4A"][strength];
  return (
    <div>
      <AuthInput label={label} type={show?"text":"password"} value={value} onChange={onChange}
        right={<button type="button" onClick={()=>setShow(s=>!s)} className="text-[11px] font-semibold" style={{color:MAROON}}>{show?"Hide":"Show"}</button>}
      />
      {value.length>0&&(
        <div className="flex items-center gap-2 mt-2">
          <div className="flex gap-1 flex-1">
            {[1,2,3].map(l=><div key={l} className="flex-1 h-1 rounded-full transition-all duration-300" style={{background:strength>=l?sc:"rgba(91,31,36,0.08)"}}/>)}
          </div>
          <span className="text-[10px] font-semibold" style={{color:sc}}>{["","Weak","Good","Strong"][strength]}</span>
        </div>
      )}
    </div>
  );
}
