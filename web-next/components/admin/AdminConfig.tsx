"use client";

import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ConfigItem {
  id?: number;
  key: string;
  value: string;
  createdAt?: string;
  updatedAt?: string;
}

export function AdminConfig() {
  const { token } = useAuth();
  
  // Fetch configurations
  const { data: rawConfigs, isLoading, mutate } = useApi<ConfigItem[]>("/api/v3/admin/config");

  // Local state for editing values
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  // Track which keys are modified compared to saved server values
  const [dirtyKeys, setDirtyKeys] = useState<Record<string, boolean>>({});
  // Track saving states for individual keys
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});

  // Active accordion section
  const [openSection, setOpenSection] = useState<string>("general");

  // Predefined configuration metadata for UI layout grouping
  const configMetadata = [
    {
      section: "general",
      title: "הגדרות כלליות ותקשורת",
      icon: "chat",
      fields: [
        {
          key: "whatsapp_notifications_enabled",
          label: "התראות WhatsApp פעילות במערכת",
          type: "boolean",
          description: "שליחת התראות אוטומטיות לנייד של דיירים ומשכירים",
        },
        {
          key: "chat_inappropriate_words",
          label: "סינון מילים פוגעניות בצ'אט",
          type: "text",
          description: "רשימת מילים חסומות מופרדות בפסיקים",
        },
      ],
    },
    {
      section: "security",
      title: "אבטחה ואימות זהות (KYC)",
      icon: "security",
      fields: [
        {
          key: "kyc_required",
          label: "חובת אימות זהות KYC מלא לשוכרים",
          type: "boolean",
          description: "חסימת שליחת הצעות והתאמות ללא אימות תעודת זהות",
        },
        {
          key: "tenant_min_trust_score",
          label: "ציון אמינות מינימלי ליצירת קשר",
          type: "number",
          description: "חסימת שוכרים עם דירוג אמינות נמוך מזה (0-100)",
        },
        {
          key: "failed_logins_max_attempts",
          label: "ניסיונות התחברות כושלים עד לנעילת חשבון",
          type: "number",
          description: "נעילה אוטומטית של משתמשים המקלידים סיסמה שגויה",
        },
      ],
    },
    {
      section: "billing",
      title: "תמחור, עמלות ומנויים",
      icon: "payments",
      fields: [
        {
          key: "landlord_subscription_price",
          label: "מחיר מנוי חודשי למשכיר (שקלים)",
          type: "number",
          description: "עלות חודשית עבור פרסום מעל 2 דירות פעילות",
        },
        {
          key: "commission_rate",
          label: "עמלת סגירת חוזה דיגיטלי (%)",
          type: "number",
          description: "עמלה חד-פעמית הנגבית מהמשכיר עם חתימת החוזה",
        },
      ],
    },
    {
      section: "matching",
      title: "אלגוריתם התאמות שוכרים-משכירים",
      icon: "handshake",
      fields: [
        {
          key: "matching_weight_price",
          label: "משקל מחיר שכירות בהתאמה (1-10)",
          type: "slider",
          description: "רמת החשיבות של התאמה תקציבית בציון ההתאמה הסופי",
        },
        {
          key: "matching_weight_amenities",
          label: "משקל אבזור ונוחות בהתאמה (1-10)",
          type: "slider",
          description: "רמת החשיבות של מפרט הדירה והאזור בציון ההתאמה",
        },
      ],
    },
    {
      section: "maintenance",
      title: "ניהול חוזים ותחזוקת דירות",
      icon: "build",
      fields: [
        {
          key: "maintenance_sla_hours",
          label: "זמן תגובה מחייב למשכיר לתקלות (SLA שעות)",
          type: "number",
          description: "מספר שעות מקסימלי למשכיר לאישור תקלה בטרם תשלח התראה",
        },
        {
          key: "contract_renewal_lead_days",
          label: "ימים להתראה לפני פקיעת חוזה",
          type: "number",
          description: "שליחת התראת חידוש חוזה ואיסוף נתוני לדג'ר חדשים",
        },
      ],
    },
  ];

  // Default values mapping if database is empty/fresh
  const defaultValues: Record<string, string> = {
    whatsapp_notifications_enabled: "true",
    chat_inappropriate_words: "ספאם, גנב, שקרן",
    kyc_required: "true",
    tenant_min_trust_score: "40",
    failed_logins_max_attempts: "5",
    landlord_subscription_price: "99",
    commission_rate: "1.5",
    matching_weight_price: "8",
    matching_weight_amenities: "5",
    maintenance_sla_hours: "24",
    contract_renewal_lead_days: "90",
  };

  // Sync loaded configs to local editing values
  useEffect(() => {
    const loadedMap: Record<string, string> = { ...defaultValues };
    if (rawConfigs && Array.isArray(rawConfigs)) {
      rawConfigs.forEach((c) => {
        loadedMap[c.key] = c.value;
      });
    }
    setLocalValues(loadedMap);
    setDirtyKeys({});
  }, [rawConfigs]);

  // Handle Input Change
  const handleChange = (key: string, val: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: val }));
    
    // Check if it's dirty
    const serverVal = rawConfigs?.find((c) => c.key === key)?.value ?? defaultValues[key];
    setDirtyKeys((prev) => ({
      ...prev,
      [key]: val !== serverVal,
    }));
  };

  // Save Single Config Key
  const handleSave = async (key: string) => {
    const value = localValues[key];
    try {
      setSavingKeys((prev) => ({ ...prev, [key]: true }));
      
      // Call PUT /api/v3/admin/config/:key
      await api(`/api/v3/admin/config/${key}`, {
        method: "PUT",
        body: { value },
        token: token || undefined,
      });

      toast.success(`הגדרת ${key} עודכנה בהצלחה`);
      
      // Update SWR cache and clear dirty status
      mutate();
      setDirtyKeys((prev) => ({ ...prev, [key]: false }));
    } catch (err) {
      console.error(err);
      toast.error(`עדכון הגדרת ${key} נכשל`);
    } finally {
      setSavingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-label text-body">טוען קונפיגורציית מערכת...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-right" dir="rtl">
      
      {/* Header */}
      <div>
        <h2 className="text-h1-web font-extrabold text-tenant-blue">הגדרות קונפיגורציה (AppConfig)</h2>
        <p className="text-body text-on-surface-variant font-medium">
          שינוי תצורות פעילות בזמן אמת, הגדרת עמלות, מנויים, ומשקלים לאלגוריתם ההתאמה
        </p>
      </div>

      {/* Accordion list */}
      <div className="space-y-4">
        {configMetadata.map((sect) => {
          const isOpened = openSection === sect.section;
          return (
            <article 
              key={sect.section} 
              className="bg-white rounded-2xl border border-outline-variant/30 soft-shadow overflow-hidden"
            >
              {/* Header Toggle button */}
              <button
                onClick={() => setOpenSection(isOpened ? "" : sect.section)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-tenant-blue flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">{sect.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-tenant-blue text-label">{sect.title}</h3>
                    <p className="text-[11px] text-on-surface-variant">הגדרות מודול {sect.title.split(" ")[0]}</p>
                  </div>
                </div>
                <span className={`material-symbols-outlined transition-transform duration-300 ${isOpened ? "rotate-180" : ""}`}>
                  keyboard_arrow_down
                </span>
              </button>

              {/* Accordion fields panel */}
              {isOpened && (
                <div className="p-6 border-t border-outline-variant/20 bg-slate-50/20 divide-y divide-outline-variant/30">
                  {sect.fields.map((field) => {
                    const isDirty = dirtyKeys[field.key];
                    const isSaving = savingKeys[field.key];
                    const currentVal = localValues[field.key] ?? "";

                    return (
                      <div
                        key={field.key}
                        className={`py-5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 rounded-lg px-2 -mx-2 ${
                          isDirty ? "bg-yellow-50/40 shadow-[0_0_12px_rgba(234,179,8,0.2)] border border-yellow-200/50" : ""
                        }`}
                      >
                        {/* Label & Description */}
                        <div className="flex-1 max-w-md space-y-1">
                          <label className="font-bold text-tenant-blue text-caption leading-tight block">
                            {field.label}
                          </label>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed">
                            {field.description}
                          </p>
                        </div>

                        {/* Input Control */}
                        <div className="flex items-center gap-4 shrink-0">
                          {field.type === "boolean" && (
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentVal === "true"}
                                onChange={(e) => handleChange(field.key, e.target.checked ? "true" : "false")}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-landlord-green" />
                            </label>
                          )}

                          {field.type === "number" && (
                            <input
                              type="number"
                              value={currentVal}
                              onChange={(e) => handleChange(field.key, e.target.value)}
                              className="w-32 px-3 py-1.5 bg-white border border-outline-variant rounded-lg text-caption text-tenant-blue font-bold focus:outline-none focus:border-landlord-green text-center"
                            />
                          )}

                          {field.type === "text" && (
                            <input
                              type="text"
                              value={currentVal}
                              onChange={(e) => handleChange(field.key, e.target.value)}
                              className="w-56 px-3 py-1.5 bg-white border border-outline-variant rounded-lg text-caption text-tenant-blue font-medium focus:outline-none focus:border-landlord-green"
                            />
                          )}

                          {field.type === "slider" && (
                            <div className="flex items-center gap-3 w-48">
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={currentVal || "5"}
                                onChange={(e) => handleChange(field.key, e.target.value)}
                                className="w-full accent-landlord-green"
                              />
                              <span className="font-extrabold text-tenant-blue bg-white border border-outline-variant px-2 py-0.5 rounded text-caption">
                                {currentVal}
                              </span>
                            </div>
                          )}

                          {/* Save Button */}
                          <div className="w-20">
                            {isDirty && (
                              <button
                                onClick={() => handleSave(field.key)}
                                disabled={isSaving}
                                className="w-full py-1.5 px-3 bg-landlord-green text-white rounded-lg text-caption font-bold hover:bg-landlord-green/90 transition-all flex items-center justify-center gap-1 shadow-sm active:scale-[0.97]"
                              >
                                {isSaving ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <span>שמור</span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Audit config warning footer */}
      <section className="bg-amber-50/30 border border-amber-200/50 p-4 rounded-xl flex gap-3 items-start text-caption">
        <span className="material-symbols-outlined text-[#e28743] shrink-0 text-[20px]">info</span>
        <div className="space-y-1">
          <p className="font-bold text-tenant-blue">שים לב להשלכות שינוי הגדרות</p>
          <p className="text-on-surface-variant">
            כל שינוי בהגדרות אלו נרשם מיידית ביומן הפעילות (Audit Log) של המערכת ומשפיע מיידית על התנהגות האפליקציה בקרב כלל השוכרים והמשכירים.
          </p>
        </div>
      </section>

    </div>
  );
}
