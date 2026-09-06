import { useState } from "react";
import { GOLD, SANS } from "@nakshra/shared-config/theme";

export function CardInput({value,onChange,placeholder,maxLength,type="text"}:{value:string;onChange:(v:string)=>void;placeholder:string;maxLength?:number;type?:string;}){
  const[focused,setFocused]=useState(false);
  return(
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
      placeholder={placeholder} maxLength={maxLength} autoComplete="off"
      className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all duration-200"
      style={{ border:`1.5px solid ${focused?GOLD:"rgba(91,31,36,0.14)"}`,
        boxShadow:focused?`0 0 0 3px rgba(200,160,68,0.1)`:"none",
        background:"#FFFFFF", color:"#222222", fontFamily:SANS, letterSpacing:"0.04em" }}/>
  );
}
