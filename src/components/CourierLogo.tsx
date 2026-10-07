import React from "react";

interface CourierLogoProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-7 h-7 text-[11px]",
  md: "w-9 h-9 text-xs",
  lg: "w-11 h-11 text-sm",
  xl: "w-14 h-14 text-base",
};

const AVATAR_PALETTE = [
  "bg-indigo-600 text-white",
  "bg-blue-600 text-white",
  "bg-emerald-600 text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
  "bg-violet-600 text-white",
  "bg-cyan-600 text-white",
  "bg-orange-600 text-white",
];

const getAvatarClass = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

export default function CourierLogo({ name, size = "md", className = "" }: CourierLogoProps) {
  const norm = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  // 1. DHL (Signature Yellow Background with Red Bold Text and stripes)
  if (norm.includes("dhl")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#FFCC00] flex items-center justify-center font-black text-[#D40511] tracking-tighter shadow-xs shrink-0 select-none border border-[#E6B800] overflow-hidden ${className}`}
        title="DHL"
      >
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="font-black italic text-[110%] tracking-tight">DHL</span>
        </div>
      </div>
    );
  }

  // 2. DTDC (Signature Blue & Red with globe)
  if (norm.includes("dtdc")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 select-none overflow-hidden ${className}`}
        title="DTDC Express"
      >
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="font-black text-[#003399] tracking-tighter text-[95%]">
            DT<span className="text-[#CC0000]">DC</span>
          </span>
        </div>
      </div>
    );
  }

  // 3. Delhivery (Signature Matte Black with Red Dot)
  if (norm.includes("delhivery")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#111111] flex items-center justify-center text-white shadow-xs shrink-0 select-none border border-black overflow-hidden ${className}`}
        title="Delhivery"
      >
        <span className="font-black tracking-tight text-[80%] flex items-center">
          <span className="text-white font-extrabold">DEL</span>
          <span className="text-[#E31E24] font-black font-mono">.</span>
        </span>
      </div>
    );
  }

  // 4. Blue Dart (Signature Royal Blue with Green Arrow Motif)
  if (norm.includes("bluedart") || (norm.includes("blue") && norm.includes("dart"))) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#002B7F] text-white flex items-center justify-center shadow-xs shrink-0 select-none border border-[#001F5C] overflow-hidden ${className}`}
        title="Blue Dart"
      >
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="font-black italic text-[75%] tracking-tight text-white flex items-center gap-0.5">
            BLUE<span className="text-[#00C853] font-bold">▶</span>
          </span>
        </div>
      </div>
    );
  }

  // 5. FedEx (Signature Purple "Fed" & Orange "Ex")
  if (norm.includes("fedex")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0 select-none overflow-hidden ${className}`}
        title="FedEx"
      >
        <span className="font-black tracking-tighter text-[90%] flex items-center">
          <span className="text-[#4D148C]">Fed</span>
          <span className="text-[#FF6600]">Ex</span>
        </span>
      </div>
    );
  }

  // 6. India Post / Speed Post (Official Post Red with Golden Wing)
  if (norm.includes("indiapost") || norm.includes("speedpost") || norm.includes("post")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#C8102E] text-[#FFD100] flex items-center justify-center shadow-xs shrink-0 select-none border border-[#9E0B22] overflow-hidden ${className}`}
        title="India Post (Speed Post)"
      >
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="text-[75%] font-black tracking-tighter">POST</span>
        </div>
      </div>
    );
  }

  // 7. Shadowfax (Deep Indigo with Cyan Wing)
  if (norm.includes("shadowfax")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#1E1248] text-[#00E5FF] flex items-center justify-center shadow-xs shrink-0 select-none border border-[#140B33] overflow-hidden ${className}`}
        title="Shadowfax"
      >
        <span className="font-black italic tracking-tighter text-[80%] text-white">
          S<span className="text-[#00E5FF]">FAX</span>
        </span>
      </div>
    );
  }

  // 8. Ekart Logistics (Flipkart Blue with Yellow Lightning)
  if (norm.includes("ekart")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#2874F0] text-white flex items-center justify-center shadow-xs shrink-0 select-none border border-[#1B56B8] overflow-hidden ${className}`}
        title="Ekart Logistics"
      >
        <span className="font-black tracking-tight text-[85%] text-white">
          e<span className="text-[#FFE500]">kart</span>
        </span>
      </div>
    );
  }

  // 9. XpressBees (Bright Crimson Red & Black)
  if (norm.includes("xpress") || norm.includes("xpressbees")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#E60000] text-white flex items-center justify-center shadow-xs shrink-0 select-none border border-[#B30000] overflow-hidden ${className}`}
        title="XpressBees"
      >
        <span className="font-black italic tracking-tighter text-[80%]">
          X<span className="text-amber-300">BEES</span>
        </span>
      </div>
    );
  }

  // 10. Ecom Express (Magenta & Violet Gradient)
  if (norm.includes("ecomexpress") || norm.includes("ecom")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-gradient-to-br from-[#9C27B0] to-[#E91E63] text-white flex items-center justify-center shadow-xs shrink-0 select-none overflow-hidden ${className}`}
        title="Ecom Express"
      >
        <span className="font-black tracking-tight text-[80%] text-white">ECOM</span>
      </div>
    );
  }

  // 11. Amazon Shipping (Amazon Dark Navy with Orange Smile)
  if (norm.includes("amazon")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#131921] text-white flex items-center justify-center shadow-xs shrink-0 select-none border border-black overflow-hidden ${className}`}
        title="Amazon Shipping"
      >
        <span className="font-black tracking-tighter text-[85%]">
          amz<span className="text-[#FF9900]">✓</span>
        </span>
      </div>
    );
  }

  // 12. Aramex (Signature Red Typography)
  if (norm.includes("aramex")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#D6001C] text-white flex items-center justify-center shadow-xs shrink-0 select-none border border-[#A80016] overflow-hidden ${className}`}
        title="Aramex"
      >
        <span className="font-black tracking-tight text-[80%] lowercase">aramex</span>
      </div>
    );
  }

  // 13. UPS (Official Gold & Dark Brown Shield)
  if (norm.includes("ups")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#351C15] text-[#FFB500] flex items-center justify-center shadow-xs shrink-0 select-none border border-[#23120E] overflow-hidden ${className}`}
        title="UPS"
      >
        <span className="font-black tracking-tight text-[90%]">UPS</span>
      </div>
    );
  }

  // 14. Gati / Gati-KWE (Purple & Orange)
  if (norm.includes("gati")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#4A154B] text-[#FF8C00] flex items-center justify-center shadow-xs shrink-0 select-none border border-[#300D31] overflow-hidden ${className}`}
        title="Gati-KWE"
      >
        <span className="font-black italic tracking-tight text-[85%] text-white">
          GA<span className="text-[#FF8C00]">TI</span>
        </span>
      </div>
    );
  }

  // 15. Professional Couriers (TPC) (Red & Blue Shield)
  if (norm.includes("professional") || norm.includes("tpc")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0 select-none overflow-hidden ${className}`}
        title="The Professional Couriers"
      >
        <span className="font-black tracking-tight text-[85%] text-[#0B4A8F]">
          TP<span className="text-[#D32F2F]">C</span>
        </span>
      </div>
    );
  }

  // 16. ST Courier (Signature Forest Green & Crimson)
  if (norm.includes("stcourier") || (norm.includes("st") && norm.includes("courier"))) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#006633] text-white flex items-center justify-center shadow-xs shrink-0 select-none border border-[#004D26] overflow-hidden ${className}`}
        title="ST Courier"
      >
        <span className="font-black tracking-tight text-[85%]">
          ST<span className="text-red-400">.</span>
        </span>
      </div>
    );
  }

  // 17. Trackon Courier (Royal Blue with Crimson Flare)
  if (norm.includes("trackon")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#0D47A1] text-white flex items-center justify-center shadow-xs shrink-0 select-none border border-[#082D66] overflow-hidden ${className}`}
        title="Trackon Courier"
      >
        <span className="font-black italic tracking-tighter text-[75%]">
          TRK<span className="text-amber-400">ON</span>
        </span>
      </div>
    );
  }

  // 18. VRL Logistics (Blue & Sunshine Yellow)
  if (norm.includes("vrl")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#003366] text-[#FFCC00] flex items-center justify-center shadow-xs shrink-0 select-none border border-[#002244] overflow-hidden ${className}`}
        title="VRL Logistics"
      >
        <span className="font-black tracking-tight text-[90%]">VRL</span>
      </div>
    );
  }

  // 19. Maruti Courier / Shree Maruti Courier
  if (norm.includes("maruti")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#D32F2F] text-white flex items-center justify-center shadow-xs shrink-0 select-none border border-[#9A0007] overflow-hidden ${className}`}
        title="Shree Maruti Courier"
      >
        <span className="font-black tracking-tighter text-[80%]">SMC</span>
      </div>
    );
  }

  // 20. Nandan Couriers / Shree Nandan Courier
  if (norm.includes("nandan")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#E65100] text-white flex items-center justify-center shadow-xs shrink-0 select-none border border-[#AC3B00] overflow-hidden ${className}`}
        title="Shree Nandan Courier"
      >
        <span className="font-black tracking-tight text-[80%]">SNC</span>
      </div>
    );
  }

  // 21. Overnite Express (Navy & Crimson)
  if (norm.includes("overnite")) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#1A237E] text-white flex items-center justify-center shadow-xs shrink-0 select-none border border-[#0D124D] overflow-hidden ${className}`}
        title="Overnite Express"
      >
        <span className="font-black italic tracking-tighter text-[75%]">
          OVER<span className="text-rose-400">N</span>
        </span>
      </div>
    );
  }

  // Default clean branded avatar
  return (
    <div
      className={`${sizeClass} rounded-xl flex items-center justify-center font-black shadow-xs shrink-0 select-none uppercase ${getAvatarClass(
        name
      )} ${className}`}
      title={name}
    >
      {name.trim().slice(0, 2).toUpperCase() || "??"}
    </div>
  );
}
