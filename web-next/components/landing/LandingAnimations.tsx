"use client";

import { useEffect } from "react";

export function LandingAnimations() {
  useEffect(() => {
    const elements = document.querySelectorAll(".scroll-reveal");

    // Immediately reveal elements already in viewport
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add("active");
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    elements.forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = (e.currentTarget as HTMLAnchorElement).getAttribute("href");
        if (!targetId || targetId === "#") return;
        const target = document.querySelector(targetId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }, []);

  return (
    <style>{`
      .scroll-reveal {
        opacity: 0;
        transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform, opacity;
      }
      .reveal-up { transform: translateY(30px); }
      .reveal-down { transform: translateY(-30px); }
      .reveal-left { transform: translateX(30px); }
      .reveal-right { transform: translateX(-30px); }
      .scroll-reveal.active {
        opacity: 1;
        transform: translate(0, 0);
      }
      .delay-1 { transition-delay: 100ms; }
      .delay-2 { transition-delay: 200ms; }
      .delay-3 { transition-delay: 300ms; }
      .delay-4 { transition-delay: 400ms; }
      .delay-5 { transition-delay: 500ms; }
      .delay-6 { transition-delay: 600ms; }
      @media (prefers-reduced-motion: reduce) {
        .scroll-reveal {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
        }
      }
    `}</style>
  );
}
