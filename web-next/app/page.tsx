export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-dirapp flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-[48px] font-extrabold text-white leading-tight mb-4">
          DirApp
        </h1>
        <p className="text-[20px] text-white/80 mb-8">
          הדרך החכמה לשכור או לנהל דירה
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="h-[48px] px-8 bg-landlord-green text-white font-bold rounded-full flex items-center hover:brightness-95 transition-all soft-shadow"
          >
            התחבר
          </a>
          <a
            href="/register"
            className="h-[48px] px-8 border-2 border-white text-white font-bold rounded-full flex items-center hover:bg-white/10 transition-all"
          >
            הרשם
          </a>
        </div>
      </div>
    </main>
  );
}
