import { useState } from "react";
import { GOLD, SANS } from "@nakshra/shared-config/theme";

export function AuthInput({ label, type = "text", value, onChange, right, name, autoComplete, placeholder }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; right?: React.ReactNode;
  name?: string; autoComplete?: string; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  let inferredAutoComplete = autoComplete || "off";
  let inferredName = name;

  const inputId = `auth-input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="relative">
      <input
        id={inputId}
        name={inferredName}
        autoComplete={inferredAutoComplete}
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className="w-full pt-6 pb-2.5 rounded-2xl text-sm outline-none transition-all duration-200"
        style={{ paddingLeft:"1rem", paddingRight: right ? "3rem":"1rem", background:"#FFFFFF",
          border:`1.5px solid ${focused ? GOLD:"rgba(91,31,36,0.14)"}`,
          boxShadow: focused ? `0 0 0 3px rgba(200,160,68,0.1)`:"none",
          color:"#222222", fontFamily:SANS }}
      />
      <label htmlFor={inputId} className="absolute pointer-events-none transition-all duration-200"
        style={{ left:"1rem", top: active?"8px":"50%",
          transform: active?"translateY(0)":"translateY(-50%)",
          fontSize: active?"10px":"13px", color: focused ? GOLD:"#9A8A78",
          fontFamily:SANS, fontWeight: active?600:400,
          letterSpacing: active?"0.06em":"0",
          textTransform: active?"uppercase":"none" }}>
        {label}
      </label>
      {right && <div className="absolute right-4 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  );
}
