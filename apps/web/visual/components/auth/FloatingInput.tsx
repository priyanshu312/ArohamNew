import { useState } from "react";
import { GOLD, SANS } from "@nakshra/shared-config/theme";

export function FloatingInput({ label, type="text", value, onChange, required=false }: {
  label:string; type?:string; value:string; onChange:(v:string)=>void; required?:boolean;
}) {
  const [focused,setFocused]=useState(false);
  const active=focused||value.length>0;
  return (
    <div className="relative">
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} required={required} autoComplete="off"
        className="w-full pt-6 pb-2 px-4 rounded-2xl text-sm outline-none transition-all duration-200"
        style={{ background:"#FFFFFF", border:`1.5px solid ${focused?GOLD:"rgba(91,31,36,0.14)"}`,
          boxShadow: focused?`0 0 0 3px rgba(200,160,68,0.1)`:"none", color:"#222222", fontFamily:SANS }}/>
      <label className="absolute left-4 transition-all duration-200 pointer-events-none"
        style={{ top:active?"8px":"50%", transform:active?"translateY(0)":"translateY(-50%)",
          fontSize:active?"10px":"13px", color:focused?GOLD:"#9A8A78", fontFamily:SANS,
          fontWeight:active?600:400, letterSpacing:active?"0.06em":"0",
          textTransform:active?"uppercase":"none" }}>
        {label}{required&&" *"}
      </label>
    </div>
  );
}
