import { useState, useEffect } from "react";
import { MAROON, SERIF } from "@nakshra/shared-config/theme";

export function Countdown({ seconds, onEnd }:{seconds:number;onEnd:()=>void;}) {
  const [t,setT]=useState(seconds);
  useEffect(()=>{
    if(t<=0){onEnd();return;}
    const id=setTimeout(()=>setT(s=>s-1),1000);return()=>clearTimeout(id);
  },[t]);
  return <span style={{color:MAROON,fontFamily:SERIF}}>{String(Math.floor(t/60)).padStart(2,"0")}:{String(t%60).padStart(2,"0")}</span>;
}
