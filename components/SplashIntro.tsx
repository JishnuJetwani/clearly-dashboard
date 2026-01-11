"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Phase = "hidden" | "show" | "split";

export default function SplashIntro() {
  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    // show only once per tab session
    try {
      const seen = sessionStorage.getItem("clearly_splash_seen");
      if (seen) return;
      sessionStorage.setItem("clearly_splash_seen", "1");
    } catch {
      // ignore if sessionStorage unavailable
    }

    setPhase("show");

    const t1 = setTimeout(() => setPhase("split"), 1200); // wait before split
    const t2 = setTimeout(() => setPhase("hidden"), 2200); // remove overlay after split completes

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "hidden") return null;

  const isSplit = phase === "split";

  return (
    <div className="fixed inset-0 z-[9999] bg-white">
      {/* Left panel */}
      <div
        className={[
          "absolute inset-y-0 left-0 w-1/2 bg-white",
          "transition-transform duration-700 ease-in-out",
          isSplit ? "-translate-x-full" : "translate-x-0",
        ].join(" ")}
      />

      {/* Right panel */}
      <div
        className={[
          "absolute inset-y-0 right-0 w-1/2 bg-white",
          "transition-transform duration-700 ease-in-out",
          isSplit ? "translate-x-full" : "translate-x-0",
        ].join(" ")}
      />

      {/* Logo */}
      <div
        className={[
          "absolute inset-0 flex items-center justify-center",
          "transition-opacity duration-300",
          isSplit ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        <Image
          src="/logo-v2.png"          // <-- change if yours is /assets/logo.png
          alt="Clearly"
          width={400}
          height={400}
          priority
        />
      </div>
    </div>
  );
}
