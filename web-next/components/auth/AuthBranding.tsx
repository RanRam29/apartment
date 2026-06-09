"use client";

import { useEffect, useRef, useState } from "react";

const features = [
  {
    icon: "verified_user",
    color: "landlord-green",
    title: "חוזים דיגיטליים",
    body: "חתימה מאובטחת על חוזי שכירות וניהול נכסים מכל מקום.",
  },
  {
    icon: "dashboard",
    color: "secondary-fixed",
    title: "ניהול ותשלומים",
    body: "מעקב אחר תשלומים, תחזוקה ודוחות בלוח בקרה אחד.",
  },
  {
    icon: "group_add",
    color: "tertiary-fixed",
    title: "התאמה חכמה",
    body: "מערכת לסינון דיירים ומציאת הדירה המושלמת עבורכם.",
  },
];

export function AuthBranding() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
      const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
      const blobs = containerRef.current.querySelectorAll<HTMLElement>("[data-blob]");
      blobs.forEach((blob) => {
        blob.style.transform = `translate(${moveX}px, ${moveY}px)`;
      });
    }
    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section
      ref={containerRef}
      className="hidden md:flex flex-1 bg-gradient-dirapp relative overflow-hidden items-center justify-center p-[--spacing-margin-desktop]"
    >
      <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
        <div
          data-blob
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#5dfbd7] rounded-full blur-[120px]"
        />
        <div
          data-blob
          className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-landlord-green rounded-full blur-[100px]"
        />
      </div>

      <div className="relative z-10 w-full max-w-xl text-right">
        <div className="mb-12">
          <span className="text-[36px] leading-[44px] font-extrabold text-white tracking-tight">
            DirApp
          </span>
        </div>

        <h2 className="text-[48px] leading-tight font-extrabold text-white mb-16">
          הדרך החכמה <br />
          <span className="text-landlord-green">לשכור או לנהל דירה</span>
        </h2>

        <div className="relative h-[300px] flex items-center justify-center">
          {features.map((feature, index) => (
            <div
              key={feature.icon}
              className={`absolute bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 w-72 soft-shadow transition-all duration-600 ${
                index === activeIndex
                  ? "opacity-100 translate-y-0 scale-100 z-10"
                  : "opacity-0 translate-y-5 scale-95"
              }`}
              style={{
                top: index === 0 ? "10%" : index === 1 ? "25%" : undefined,
                bottom: index === 2 ? "10%" : undefined,
                right: index === 0 ? "5%" : index === 2 ? "15%" : undefined,
                left: index === 1 ? "0%" : undefined,
              }}
            >
              <div className="flex items-center gap-4 mb-3">
                <div
                  className={`w-10 h-10 rounded-full bg-${feature.color}/20 flex items-center justify-center text-${feature.color}`}
                >
                  <span className="material-symbols-outlined">{feature.icon}</span>
                </div>
                <span className="text-[18px] font-semibold text-white">
                  {feature.title}
                </span>
              </div>
              <p className="text-white/80 text-[12px] leading-[16px]">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
