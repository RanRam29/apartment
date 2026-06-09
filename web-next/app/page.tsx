import Link from "next/link";
import { LandingAnimations } from "@/components/landing/LandingAnimations";

const features = [
  { icon: "swipe_right", title: "SmartSwipe™", desc: "מערכת התאמה חכמה הלומדת את העדפותיך ומציגה רק את מה שבאמת רלוונטי עבורך." },
  { icon: "verified", title: "אימות דיירים ונכסים", desc: "פרופילים מאומתים בלבד. שקיפות מלאה לגבי היסטוריית השכירות ומצב הנכס." },
  { icon: "description", title: "חוזה דיגיטלי חכם", desc: "חתימה על חוזים תקניים ומאובטחים ישירות מהאפליקציה, עם ליווי משפטי מלא." },
  { icon: "payments", title: "ניהול תשלומים", desc: 'גביית שכ"ד אוטומטית, ניהול ערבויות ותשלומים נלווים במערכת שקופה אחת.' },
  { icon: "chat_bubble", title: "צ'אט מובנה", desc: "תקשורת ישירה ובטוחה בין שוכרים למשכירים ללא צורך בחשיפת פרטים אישיים בשלב ראשון." },
  { icon: "analytics", title: "דאשבורד משקיעים", desc: "כלי ניתוח מתקדמים למשכירים לניהול פורטפוליו נכסים, תשואות ותחזוקה." },
];

const steps = [
  { icon: "search", title: "מחפשים ומוצאים", desc: "מגדירים העדפות ומתחילים להחליק בין דירות שעברו אימות מלא." },
  { icon: "handshake", title: "מתאימים ומתקדמים", desc: "שני הצדדים הביעו עניין? הצ'אט נפתח ואפשר לקבוע ביקור בנכס." },
  { icon: "key", title: "חותמים ועוברים", desc: "חתימה דיגיטלית על החוזה, העברת ערבויות וקבלת המפתח. מזל טוב!" },
];

const landlordChecks = [
  "סינון אוטומטי של דיירים לפי פרמטרים שאתה קובע",
  'גביית שכ"ד אלקטרונית והפקת חשבוניות אוטומטית',
  "ניהול ותיעוד קריאות שירות ותחזוקה מול אנשי מקצוע",
  "גישה למאגר ערבויות ובדיקות רקע פיננסיות",
];

const stats = [
  { value: "5,000+", label: "דירות להשכרה" },
  { value: "12k", label: "שוכרים פעילים" },
  { value: "24h", label: "זמן סגירת חוזה ממוצע" },
  { value: "0%", label: "דמי תיווך" },
];

export default function LandingPage() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* 1. Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[rgba(248,249,255,0.8)] backdrop-blur-[12px] border-b border-outline-variant/20 h-[64px]">
        <div className="max-w-7xl mx-auto px-[32px] flex flex-row-reverse justify-between items-center h-full">
          <div className="flex items-center gap-2">
            <span className="text-[28px] leading-[36px] text-tenant-blue font-extrabold tracking-tight">DirApp</span>
          </div>
          <div className="hidden md:flex flex-row-reverse gap-8 items-center text-[16px] text-on-surface-variant">
            <a className="hover:text-landlord-green transition-colors" href="#features">יתרונות</a>
            <a className="hover:text-landlord-green transition-colors" href="#how-it-works">איך זה עובד</a>
            <a className="hover:text-landlord-green transition-colors" href="#join">הצטרפו</a>
          </div>
          <Link
            href="/login"
            className="bg-tenant-blue text-white px-6 py-2 rounded-full text-[14px] font-medium hover:bg-opacity-90 transition-all"
          >
            כניסה למערכת
          </Link>
        </div>
      </nav>

      {/* 2. Hero */}
      <section className="bg-[radial-gradient(circle_at_20%_30%,#002045_0%,#00091b_100%)] pt-32 pb-20 px-[32px] overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="text-right space-y-6 order-2 md:order-1">
            <h1 className="text-[48px] leading-tight font-extrabold text-white scroll-reveal reveal-right">
              מצא את הדירה שלך <br />
              <span className="text-landlord-green">בהחלקה אחת</span>
            </h1>
            <p className="text-[22px] leading-[30px] font-semibold text-[#aec7f5] max-w-xl scroll-reveal reveal-right delay-1">
              הדרך המודרנית, השקופה והבטוחה ביותר לשכור ולהשכיר דירות בישראל. בלי מתווכים, בלי כאבי ראש, הכל בדיגיטל.
            </p>
            <div className="flex flex-row-reverse gap-4 pt-4 scroll-reveal reveal-right delay-2">
              <Link
                href="/register"
                className="bg-landlord-green text-tenant-blue px-8 py-3 rounded-full text-[14px] font-bold text-lg hover:scale-105 transition-transform hover:shadow-xl duration-300"
              >
                הצטרף כשוכר
              </Link>
              <Link
                href="/register"
                className="border-2 border-[#aec7f5] text-white px-8 py-3 rounded-full text-[14px] font-bold text-lg hover:bg-white/10 hover:scale-105 transition-all duration-300"
              >
                אני משכיר
              </Link>
            </div>
            <div className="flex flex-row-reverse items-center gap-6 pt-8 opacity-70 scroll-reveal reveal-right delay-3">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-landlord-green">verified_user</span>
                <span className="text-sm">מאובטח ומוצפן</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-landlord-green">check_circle</span>
                <span className="text-sm">100% דירות מאומתות</span>
              </div>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="relative order-1 md:order-2 flex justify-center items-center scroll-reveal reveal-left">
            <div className="relative w-[300px] h-[600px] bg-[#00091b] rounded-[3rem] border-[8px] border-surface-variant shadow-2xl overflow-hidden">
              <div className="w-full h-full bg-gradient-to-b from-tenant-blue to-[#1a365d] flex items-center justify-center">
                <span className="text-landlord-green text-[64px] font-extrabold">D</span>
              </div>
            </div>
            <div className="absolute -right-10 top-20 bg-white p-4 rounded-2xl shadow-lg border border-outline-variant/30 animate-bounce">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#9cefdf] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#006b5f]">favorite</span>
                </div>
                <div>
                  <p className="text-xs font-bold">דירה חדשה בקרבתך!</p>
                  <p className="text-[10px] text-outline">רמת גן, 3 חדרים</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Stats Bar */}
      <div className="bg-[#00091b] py-12 border-y border-[rgba(46,71,110,0.2)]">
        <div className="max-w-7xl mx-auto px-[32px] grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <div key={stat.label} className={`scroll-reveal reveal-up delay-${i + 1}`}>
              <p className="text-[48px] leading-tight font-extrabold text-landlord-green">{stat.value}</p>
              <p className="text-[12px] text-[#aec7f5]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Features */}
      <section className="py-24 px-[32px] bg-surface" id="features">
        <div className="max-w-7xl mx-auto text-center mb-16 scroll-reveal reveal-up">
          <h2 className="text-[36px] leading-[44px] font-bold text-tenant-blue mb-4">למה DirApp?</h2>
          <p className="text-[16px] text-on-surface-variant">הכלים המתקדמים ביותר לשוכרים ומשכירים במקום אחד</p>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div
              key={f.icon}
              className={`group bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl scroll-reveal reveal-up delay-${i + 1}`}
            >
              <span className="material-symbols-outlined text-4xl text-landlord-green mb-4 block transition-transform duration-300 group-hover:scale-110">
                {f.icon}
              </span>
              <h3 className="text-[22px] leading-[30px] font-semibold text-tenant-blue mb-2">{f.title}</h3>
              <p className="text-[16px] text-on-surface-variant text-sm mb-4">{f.desc}</p>
              <div className="flex items-center gap-1 text-landlord-green font-medium text-sm transition-all duration-300 group-hover:-translate-x-1">
                <span>למידע נוסף</span>
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. How It Works */}
      <section className="py-24 px-[32px] bg-surface-container-low overflow-hidden" id="how-it-works">
        <div className="max-w-7xl mx-auto text-center mb-20 scroll-reveal reveal-up">
          <h2 className="text-[36px] leading-[44px] font-bold text-tenant-blue mb-4">איך זה עובד?</h2>
          <p className="text-[16px] text-on-surface-variant">תהליך פשוט ומהיר, מהחיפוש ועד המפתח</p>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row-reverse justify-between items-center relative gap-12">
          {steps.map((step, i) => (
            <div key={step.icon} className={`flex-1 flex flex-col items-center text-center z-10 relative scroll-reveal reveal-up delay-${i + 1}`}>
              {i > 0 && (
                <div className="hidden md:block absolute top-10 right-full w-full border-t-2 border-dashed border-landlord-green opacity-30" />
              )}
              <div className="w-20 h-20 bg-landlord-green rounded-full flex items-center justify-center text-tenant-blue mb-6 shadow-xl shadow-landlord-green/20">
                <span className="material-symbols-outlined text-3xl font-bold">{step.icon}</span>
              </div>
              <h4 className="text-[22px] leading-[30px] font-semibold text-tenant-blue mb-2">{step.title}</h4>
              <p className="text-[16px] text-sm text-on-surface-variant max-w-[240px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. For Landlords */}
      <section className="py-24 px-[32px] bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 w-full bg-surface-container rounded-3xl p-8 shadow-inner scroll-reveal reveal-right">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-outline-variant/50">
              <div className="bg-tenant-blue p-4 flex justify-between items-center text-white">
                <span className="font-bold">ניהול נכסים - DirApp Admin</span>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ba1a1a]" />
                  <div className="w-3 h-3 rounded-full bg-landlord-green" />
                </div>
              </div>
              <div className="h-[300px] bg-gradient-to-b from-surface-container-low to-surface flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[80px] opacity-20">dashboard</span>
              </div>
            </div>
          </div>
          <div className="flex-1 text-right space-y-8 scroll-reveal reveal-left">
            <h2 className="text-[36px] leading-[44px] font-bold text-tenant-blue">ניהול נכסים מקצה לקצה</h2>
            <p className="text-[16px] text-on-surface-variant">
              המשכירים המקצועיים בישראל כבר עברו לניהול דיגיטלי. DirApp חוסכת לך שעות של עבודה ידנית ובירוקרטיה.
            </p>
            <ul className="space-y-4">
              {landlordChecks.map((text, i) => (
                <li key={i} className={`flex flex-row-reverse items-center gap-4 scroll-reveal reveal-up delay-${i + 1}`}>
                  <span className="material-symbols-outlined text-landlord-green bg-[#9cefdf] p-2 rounded-full">check</span>
                  <span className="text-[16px] text-tenant-blue font-medium">{text}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-block bg-tenant-blue text-white px-10 py-4 rounded-full text-[14px] font-bold text-lg hover:shadow-xl transition-all mt-4"
            >
              התחל לנהל את הנכסים שלך
            </Link>
          </div>
        </div>
      </section>

      {/* 7. CTA */}
      <section className="py-20 px-[32px]" id="join">
        <div className="max-w-5xl mx-auto bg-landlord-green rounded-[40px] p-12 text-center text-tenant-blue relative overflow-hidden scroll-reveal reveal-up">
          <div className="relative z-10 space-y-6">
            <h2 className="text-[48px] leading-tight font-extrabold">מוכן/ה לדירה הבאה?</h2>
            <p className="text-[22px] leading-[30px] font-semibold max-w-2xl mx-auto opacity-80">
              הצטרפו לאלפי ישראלים שכבר שינו את הדרך בה הם מוצאים בית. הרשמו עכשיו וקבלו התראות על דירות חדשות לפני כולם.
            </p>
            <div className="flex flex-col md:flex-row-reverse gap-4 justify-center items-center mt-8">
              <input
                className="w-full md:w-80 h-[48px] rounded-full px-6 border-none text-right text-[16px] focus:ring-2 focus:ring-tenant-blue shadow-lg"
                placeholder="הכנס אימייל"
                type="email"
              />
              <Link
                href="/register"
                className="bg-tenant-blue text-white h-[48px] px-10 rounded-full text-[14px] font-bold flex items-center hover:bg-opacity-90 transition-all shadow-lg"
              >
                אני בפנים
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-[#00091b] text-[#aec7f5] pt-20 pb-10 px-[32px]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-right border-b border-[rgba(46,71,110,0.2)] pb-16">
          <div className="space-y-4">
            <span className="text-[28px] text-landlord-green font-bold">DirApp</span>
            <p className="text-[12px] text-[#aec7f5] leading-relaxed">
              משנים את פני שוק השכירות בישראל באמצעות טכנולוגיה, אמון ושקיפות מלאה.
            </p>
          </div>
          <div>
            <h5 className="text-[22px] leading-[30px] font-semibold text-white mb-6">המוצר</h5>
            <ul className="space-y-3 text-[12px] text-[#aec7f5]">
              <li><a className="hover:text-landlord-green transition-colors" href="#">חיפוש דירה</a></li>
              <li><a className="hover:text-landlord-green transition-colors" href="#">פרסום נכס</a></li>
              <li><a className="hover:text-landlord-green transition-colors" href="#">ניהול שוכרים</a></li>
              <li><a className="hover:text-landlord-green transition-colors" href="#">מערכת חוזים</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-[22px] leading-[30px] font-semibold text-white mb-6">החברה</h5>
            <ul className="space-y-3 text-[12px] text-[#aec7f5]">
              <li><a className="hover:text-landlord-green transition-colors" href="#">אודותינו</a></li>
              <li><a className="hover:text-landlord-green transition-colors" href="#">קריירה</a></li>
              <li><a className="hover:text-landlord-green transition-colors" href="#">בלוג</a></li>
              <li><a className="hover:text-landlord-green transition-colors" href="#">צור קשר</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-[22px] leading-[30px] font-semibold text-white mb-6">משפטי וקהילה</h5>
            <ul className="space-y-3 text-[12px] text-[#aec7f5]">
              <li><a className="hover:text-landlord-green transition-colors" href="#">מדיניות פרטיות</a></li>
              <li><a className="hover:text-landlord-green transition-colors" href="#">תקנון האתר</a></li>
              <li><a className="hover:text-landlord-green transition-colors" href="#">פורום משכירים</a></li>
              <li><a className="hover:text-landlord-green transition-colors" href="#">שאלות ותשובות</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 flex flex-col md:flex-row-reverse justify-between items-center gap-4">
          <p className="text-[12px] text-[#aec7f5] opacity-60">© 2024 DirApp. כל הזכויות שמורות.</p>
        </div>
      </footer>

      <LandingAnimations />
    </>
  );
}
