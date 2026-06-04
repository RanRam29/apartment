import React, { useState, useEffect, useRef } from 'react';
import api from './services/api';

function App() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);
  
  // Progress Step Wizard (1: Review & Summary, 2: Identity Verification, 3: Signing & OTP)
  const [step, setStep] = useState(1);

  // Step 2: Identity Verification States
  const [idNumber, setIdNumber] = useState('');
  const [idValidationState, setIdValidationState] = useState('empty'); // 'empty' | 'valid' | 'invalid'
  const [idFrontName, setIdFrontName] = useState('');
  const [idBackName, setIdBackName] = useState('');
  const [idFrontPreview, setIdFrontPreview] = useState(null);
  const [idBackPreview, setIdBackPreview] = useState(null);
  const [kycOverlayVisible, setKycOverlayVisible] = useState(false);
  const [kycOverlayState, setKycOverlayState] = useState('loading'); // 'loading' | 'success'

  // Step 3: Signature & OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(54);
  const [legalAgreed, setLegalAgreed] = useState(false);
  const [isCanvasDirty, setIsCanvasDirty] = useState(false);

  // Flow End States
  const [declined, setDeclined] = useState(false);
  const [signed, setSigned] = useState(false);

  // Canvas Refs
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Load Agreement Token Details
  useEffect(() => {
    const pathToken = window.location.pathname.split('/').pop();
    const queryToken = new URLSearchParams(window.location.search).get('token');
    const activeToken = (pathToken && pathToken !== 'guarantor' && pathToken !== 'index.html') ? pathToken : queryToken;

    if (!activeToken) {
      setError('חסר מפתח הזמנה מאובטח. אנא השתמש בקישור שנשלח אליך באימייל.');
      setLoading(false);
      return;
    }

    setToken(activeToken);

    api.getGuarantorFlowDetails(activeToken)
      .then((data) => {
        setDetails(data);
        if (data.invitationStatus === 'APPROVED') {
          setSigned(true);
        } else if (data.invitationStatus === 'DECLINED') {
          setDeclined(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('מפתח ההזמנה אינו בתוקף או פג תוקפו.');
        setLoading(false);
      });
  }, []);

  // Timer countdown for OTP resend
  useEffect(() => {
    let interval = null;
    if (otpSent && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpTimer]);

  // Israeli ID checksum validation
  const isValidIsraeliID = (id) => {
    id = String(id).trim();
    if (id.length !== 9 || isNaN(id)) return false;
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      let incNum = Number(id[i]) * ((i % 2) + 1);
      sum += (incNum > 9) ? (incNum - 9) : incNum;
    }
    return (sum % 10 === 0);
  };

  const handleIdChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setIdNumber(val);

    if (val.length === 9) {
      if (isValidIsraeliID(val)) {
        setIdValidationState('valid');
      } else {
        setIdValidationState('invalid');
      }
    } else if (val.length > 0) {
      setIdValidationState('invalid');
    } else {
      setIdValidationState('empty');
    }
  };

  // File Upload Simulators
  const handleFrontUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIdFrontName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdFrontPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIdBackName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdBackPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFrontFile = (e) => {
    e.stopPropagation();
    setIdFrontName('');
    setIdFrontPreview(null);
  };

  const removeBackFile = (e) => {
    e.stopPropagation();
    setIdBackName('');
    setIdBackPreview(null);
  };

  // Transition from Step 2 to Step 3 with animated overlay
  const simulateIdVerification = () => {
    if (!isValidIsraeliID(idNumber) || !idFrontPreview || !idBackPreview) return;
    
    setKycOverlayVisible(true);
    setKycOverlayState('loading');

    setTimeout(() => {
      setKycOverlayState('success');
      setTimeout(() => {
        setKycOverlayVisible(false);
        setStep(3);
      }, 1500);
    }, 2000);
  };

  // OTP triggers
  const handleSendOtp = () => {
    setOtpSent(true);
    setOtpTimer(59);
  };

  const handleOtpInput = (e, index) => {
    const val = e.target.value.replace(/\D/g, '');
    const newOtpValues = [...otpValues];
    newOtpValues[index] = val;
    setOtpValues(newOtpValues);

    // Auto-focus next input box
    if (val !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    // Backspace to focus previous box
    if (e.key === 'Backspace' && otpValues[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newOtpValues = [...otpValues];
        newOtpValues[index - 1] = '';
        setOtpValues(newOtpValues);
      }
    }
  };

  // Canvas drawing logic for digital signature
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#005db6'; // Deep blue signature stroke matching the color token

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    setIsCanvasDirty(true);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsCanvasDirty(false);
  };

  // Handle Decline
  const handleDecline = () => {
    if (!window.confirm('האם אתה בטוח שברצונך לדחות את הבקשה לשמש כערב בחוזה זה?')) return;
    setLoading(true);
    api.declineInvitation(token)
      .then(() => {
        setDeclined(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        alert('שגיאה בדחיית הבקשה. נסה שוב.');
        setLoading(false);
      });
  };

  // Complete and Sign
  const handleCompleteAndSign = () => {
    const canvas = canvasRef.current;
    let sigData = 'mock-signature-base64-data';
    if (canvas && isCanvasDirty) {
      sigData = canvas.toDataURL();
    }

    setLoading(true);
    api.completeVerificationAndSign(token, sigData)
      .then(() => {
        setSigned(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        alert('שגיאה בעדכון החתימה. נסה שוב.');
        setLoading(false);
      });
  };

  // Dynamic conditions for steps button enable
  const isStep2Valid = isValidIsraeliID(idNumber) && idFrontPreview && idBackPreview;
  const isStep3Valid = otpSent && otpValues.every(val => val.length === 1) && legalAgreed && isCanvasDirty;

  if (loading) {
    return (
      <div className="loading-spinner-container">
        <div className="overlay-spinner"></div>
        <div className="loading-spinner-text">טוען פרטי הזמנת ערב מאובטחת...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-error-container">
        <div className="error-icon-wrapper">
          <span className="material-symbols-outlined text-4xl">warning</span>
        </div>
        <h2 className="error-title">שגיאה בגישה לחוזה</h2>
        <p className="error-desc">{error}</p>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="card-error-container">
        <div className="error-icon-wrapper" style={{ backgroundColor: 'var(--error-container)', color: 'var(--error)' }}>
          <span className="material-symbols-outlined text-4xl">cancel</span>
        </div>
        <h2 className="error-title">הבקשה נדחתה בהצלחה</h2>
        <p className="error-desc">הודעה נשלחה למשכיר החוזה בדבר סירובך לערוב לחוזה זה.</p>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="card-success-container">
        <div className="success-icon-wrapper">
          <span className="material-symbols-outlined text-4xl material-fill">verified_user</span>
        </div>
        <h2 className="success-title">החתימה הושלמה בהצלחה!</h2>
        <p className="success-desc">עברת את תהליך אימות הזהות וחתמת בהצלחה כערב לחוזה השכירות.</p>
        <p className="success-desc">עותק של החוזה החתום יחד עם הצהרת הערבות ישלח אליך בדואר אלקטרוני.</p>
        <p className="success-note">מערכת השירות והביטחון של DirApp</p>
      </div>
    );
  }

  return (
    <div>
      {/* Top Header Shell */}
      <header className="header-bar">
        <div className="header-brand">
          <span className="logo-text">DirApp</span>
          <div className="header-divider"></div>
          <span className="header-subtitle">אימות ערבות דיגיטלי</span>
        </div>
        <button className="btn-logout" onClick={handleDecline}>
          <span>יציאה בטוחה</span>
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </header>

      {/* Split-screen layout */}
      <main className="main-layout" dir="rtl">
        {/* Left Side: Lease Summary Panel (Persistent context) */}
        <section className="left-panel">
          <div>
            <h2 className="panel-title mb-[16px]">סיכום חוזה שכירות</h2>
            
            <div className="property-preview-container mb-[24px]">
              <img 
                className="property-image" 
                alt="רוטשילד תל אביב" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAl47w7P_M6-QMNfjsqrMj4_p71vpcsn_t08XLonQWZxdU-Krnt3QZIE-yJU47xx7vjvgNUFjDwNjgU4g8YCxbwWnChjbZrQmsVyT54l-0lxInCVdZcI2bsoSDZgPCEvgc1AvQR-g0RjPhf5GnDfHzA0BMs1XtRdygvsh_ikk0YYNwg5KH94sMPFiGtzNzhangfnH58RcKHlaTdzCXJBXKqQAz3jVU990ts743XNvxXA6vUQ5HhdvlnShu1JqKZCWYUq-GgWVJo6j5G"
              />
              <div className="contract-badge">#DIR-{token.substring(0, 4).toUpperCase()}</div>
            </div>

            <div className="summary-details-list mb-[24px]">
              <div className="summary-item">
                <span className="material-symbols-outlined summary-icon">location_on</span>
                <div className="summary-info">
                  <span className="summary-label">כתובת הנכס</span>
                  <span className="summary-value">{details.propertyAddress}</span>
                </div>
              </div>
            </div>

            <div className="details-grid mb-[24px]">
              <div className="grid-cell">
                <span className="cell-label">המשכיר</span>
                <span className="cell-value">{details.landlordName}</span>
              </div>
              <div className="grid-cell">
                <span className="cell-label">השוכר</span>
                <span className="cell-value">{details.tenantName}</span>
              </div>
              <div className="grid-cell">
                <span className="cell-label">דמי שכירות</span>
                <span className="cell-value">₪{details.rentAmount?.toLocaleString()} / חודש</span>
              </div>
              <div className="grid-cell">
                <span className="cell-label">תקופת החוזה</span>
                <span className="cell-value">{details.leasePeriod}</span>
              </div>
            </div>

            <div className="statement-box">
              <div className="statement-header">
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span>הצהרת ערבות</span>
              </div>
              <p className="statement-text">
                בתור ערב/ה לחוזה זה, הנך מתחייב/ת לעמוד בתנאי התשלום והאחריות המפורטים בנספח א' של החוזה במקרה של אי-עמידה בתנאים מצד השוכר.
              </p>
            </div>
          </div>

          <div className="footer-stamp">
            <div className="stamp-dot"></div>
            <span>חיבור מאובטח SSL 256-bit בתוקף</span>
          </div>
        </section>

        {/* Right Side: Wizard Stepper & Dynamic Screen Panels */}
        <section className="right-panel">
          <div className="wizard-container">
            {/* Horizontal Stepper Row */}
            <div className="stepper-row">
              <div className="stepper-line"></div>
              <div 
                className="stepper-line-active" 
                style={{ width: step === 1 ? '100%' : step === 2 ? '50%' : '0%' }}
              ></div>

              <div className={`step-wrapper ${step >= 1 ? 'completed' : ''} ${step === 1 ? 'active' : ''}`}>
                <div className="step-node">
                  {step > 1 ? <span className="material-symbols-outlined text-[16px] material-fill">check</span> : '1'}
                </div>
                <span className="step-title">פרטי החוזה</span>
              </div>

              <div className={`step-wrapper ${step >= 2 ? 'completed' : ''} ${step === 2 ? 'active' : ''}`}>
                <div className="step-node">
                  {step > 2 ? <span className="material-symbols-outlined text-[16px] material-fill">check</span> : '2'}
                </div>
                <span className="step-title">אימות זהות</span>
              </div>

              <div className={`step-wrapper ${step >= 3 ? 'completed' : ''} ${step === 3 ? 'active' : ''}`}>
                <div className="step-node">3</div>
                <span className="step-title">חתימה</span>
              </div>
            </div>

            {/* SCREEN 1: Review & Details */}
            {step === 1 && (
              <div className="form-stack">
                <div className="screen-header">
                  <div className="screen-headline-row">
                    <div className="screen-number-badge">1</div>
                    <h1 className="screen-title">סקירת פרטי החוזה</h1>
                  </div>
                  <p className="screen-description">
                    שלום {details.guarantorName}, הוזמנת להיות ערב לחוזה שכירות. אנא ודא כי פרטי החוזה המוצגים בצד ימין תקינים ומקובלים עליך.
                  </p>
                </div>

                <div className="glass-info-card">
                  <span className="material-symbols-outlined info-card-icon text-secondary">gavel</span>
                  <div className="info-card-text">
                    <strong>שים לב:</strong> אישור השלבים הבאים והזנת קוד ה-OTP יהוו חתימה מחייבת על כתב הערבות, בעלת תוקף משפטי מלא על פי חוק השכירות ההוגנת בישראל.
                  </div>
                </div>

                <div className="action-row">
                  <button className="btn-back" onClick={handleDecline}>
                    <span className="material-symbols-outlined">cancel</span>
                    <span>דחה הזמנה</span>
                  </button>
                  <button className="btn-next" onClick={() => setStep(2)}>
                    <span>המשך לאימות זהות</span>
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 2: Identity Verification Form */}
            {step === 2 && (
              <div className="form-stack">
                <div className="screen-header">
                  <div className="screen-headline-row">
                    <div className="screen-number-badge">2</div>
                    <h1 className="screen-title">אימות זהות מול משרד הפנים</h1>
                  </div>
                  <p className="screen-description">
                    עלינו לאמת את זהותך מול מרשם האוכלוסין כדי להבטיח את תקינות הערבות ולמנוע התחזות.
                  </p>
                </div>

                {/* ID Input */}
                <div className="form-group">
                  <label className="form-label" htmlFor="id-number">
                    <span>מספר תעודת זהות (9 ספרות)</span>
                    {idValidationState === 'valid' && (
                      <span className="text-tertiary-fixed-variant flex items-center gap-1 font-semibold">
                        תעודת זהות תקינה
                        <span className="material-symbols-outlined text-[16px] material-fill">check_circle</span>
                      </span>
                    )}
                  </label>
                  <div className="form-input-container">
                    <input 
                      type="text" 
                      id="id-number" 
                      className={`form-input ${idValidationState === 'invalid' ? 'border-error animate-shake' : ''}`}
                      maxLength="9" 
                      placeholder="000000000"
                      value={idNumber}
                      onChange={handleIdChange}
                    />
                    <div className="input-icon-right">
                      <span className="material-symbols-outlined">badge</span>
                    </div>
                  </div>
                  <span className="validation-feedback-text">אנא הזן מספר זהות כולל ספרת ביקורת</span>
                </div>

                {/* File Upload zones */}
                <div className="form-group">
                  <label className="form-label">צילום תעודת זהות</label>
                  <div className="upload-grid">
                    {/* ID Front */}
                    <div className="upload-zone">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                        onChange={handleFrontUpload}
                      />
                      {idFrontPreview ? (
                        <>
                          <img src={idFrontPreview} alt="ID Front" className="upload-preview" />
                          <button className="upload-remove" onClick={removeFrontFile}>
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="upload-icon-wrapper">
                            <span className="material-symbols-outlined text-[24px]">add_a_photo</span>
                          </div>
                          <span className="upload-title">צילום צד קדמי</span>
                          <span className="upload-subtitle">JPG, PNG עד 5MB</span>
                        </>
                      )}
                    </div>

                    {/* ID Back */}
                    <div className="upload-zone">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                        onChange={handleBackUpload}
                      />
                      {idBackPreview ? (
                        <>
                          <img src={idBackPreview} alt="ID Back" className="upload-preview" />
                          <button className="upload-remove" onClick={removeBackFile}>
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="upload-icon-wrapper">
                            <span className="material-symbols-outlined text-[24px]">upload_file</span>
                          </div>
                          <span className="upload-title">צילום צד אחורי</span>
                          <span className="upload-subtitle">JPG, PNG עד 5MB</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="glass-info-card">
                  <span className="material-symbols-outlined info-card-icon text-tertiary">shield_lock</span>
                  <div className="info-card-text">
                    התמונות המועלות משמשות לאימות בלבד. המערכת מוצפנת בסטנדרט בנקאי גבוה (AES-256) ואינה שומרת את תמונות התעודה בשרתיה לאחר השלמת התהליך.
                  </div>
                </div>

                <div className="action-row">
                  <button className="btn-back" onClick={() => setStep(1)}>
                    <span className="material-symbols-outlined">arrow_forward</span>
                    <span>חזור לפרטים</span>
                  </button>
                  <button 
                    className="btn-next" 
                    disabled={!isStep2Valid} 
                    onClick={simulateIdVerification}
                  >
                    <span>המשך לחתימה דיגיטלית</span>
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 3: Sign Guarantee & OTP Verification */}
            {step === 3 && (
              <div className="form-stack">
                <div className="screen-header">
                  <div className="screen-headline-row">
                    <div className="screen-number-badge">3</div>
                    <h1 className="screen-title">חתימה דיגיטלית ואישור</h1>
                  </div>
                  <p className="screen-description">
                    עבור על סעיפי הערבות וחתום בתוך תיבת החתימה. להשלמת התהליך הזן את קוד ה-OTP שנשלח לנייד שלך.
                  </p>
                </div>

                {/* Clause Review Box */}
                <div className="legal-scroll-box">
                  <div className="legal-scroll-header">
                    <span className="legal-scroll-title">נספח ערבות לחוזה</span>
                    <span className="legal-scroll-badge">תצוגה משפטית</span>
                  </div>
                  <div className="legal-scroll-content">
                    <p className="legal-scroll-paragraph">
                      <strong>סעיף 14.2: ערבות אישית ואוניברסלית.</strong> החתום מטה (להלן "הערב") מתחייב באופן בלתי חוזר ובלתי מותנה לפרוע ולקיים את כל ההתחייבויות, התשלומים והחובות של השוכר לפי חוזה שכירות זה במלואם ובמועדם.
                    </p>
                    <p className="legal-scroll-paragraph">
                      על פי <strong>חוק השכירות ההוגנת (התשע"ז-2017)</strong>, ערבות זו מוגבלת לתקופה מקסימלית של 36 חודשים ממועד תחילת השכירות, אלא אם הוארכה במפורש בכתב על ידי הערב. הערב מצהיר כי הוא מבין את גובה האחראיות המשפטית של מסמך זה.
                    </p>
                    <div className="legal-scroll-highlight">
                      "הערב מוותר בזה על כל זכות לדרוש מהמשכיר לפנות לשוכר תחילה, ומסכים כי ערבות זו היא ערבות לפירעון ולא אך ורק לגבייה."
                    </div>
                  </div>
                </div>

                {/* Digital Signature Hash */}
                <div className="hash-card">
                  <div className="hash-title-row">
                    <span className="material-symbols-outlined text-secondary">fingerprint</span>
                    <span>קוד זיהוי חתימה דיגיטלית</span>
                  </div>
                  <div className="hash-box">
                    <div className="hash-label">קוד אימות הצפנה (SHA-256)</div>
                    <code className="hash-code">SHA-256: 8f2b3e41b7123aa24c{token.substring(0, 6)}c1d0a</code>
                    <div className="hash-meta">
                      <span className="material-symbols-outlined text-[14px]">verified_user</span>
                      <span>מפתח מאובטח: #TRX-{token.substring(0, 4).toUpperCase()}-V3</span>
                    </div>
                  </div>
                </div>

                {/* Canvas Signature Box */}
                <div className="form-group">
                  <label className="form-label">צייר את חתימתך:</label>
                  <div className="signature-canvas-container">
                    <div className="signature-canvas-header">
                      <span className="signature-canvas-title">צייר באמצעות העכבר או האצבע</span>
                      <button className="btn-clear-canvas" onClick={clearSignature}>נקה לוח</button>
                    </div>
                    <div className="relative">
                      <canvas 
                        ref={canvasRef}
                        className="canvas-element"
                        width="550"
                        height="140"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                      {!isCanvasDirty && (
                        <div className="canvas-hint">חתום כאן</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* OTP Verification Section */}
                <div className="form-group" style={{ padding: '20px', border: '1px solid var(--outline-variant)', borderRadius: '16px', backgroundColor: '#fff' }}>
                  <h3 className="form-label mb-2" style={{ fontSize: '16px' }}>קוד אימות חד-פעמי (OTP)</h3>
                  
                  {!otpSent ? (
                    <button 
                      className="btn-next w-full justify-center" 
                      style={{ borderRadius: '12px', height: '48px' }}
                      onClick={handleSendOtp}
                    >
                      <span className="material-symbols-outlined">send</span>
                      <span>שלח קוד אימות לטלפון הנייד</span>
                    </button>
                  ) : (
                    <div className="otp-container">
                      <p className="font-label-sm text-[13px] text-on-surface-variant text-center">
                        שלחנו קוד בן 6 ספרות למספר הטלפון הנייד הרשום שלך.
                      </p>
                      
                      <div className="otp-grid">
                        {otpValues.map((val, idx) => (
                          <input 
                            key={idx}
                            id={`otp-${idx}`}
                            type="text"
                            maxLength="1"
                            className="otp-box"
                            value={val}
                            onChange={(e) => handleOtpInput(e, idx)}
                            onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                            autoFocus={idx === 0}
                          />
                        ))}
                      </div>

                      <div className="otp-timer-row">
                        {otpTimer > 0 ? (
                          <span className="otp-timer-label">ניתן לשלוח קוד חדש בעוד {otpTimer} שניות</span>
                        ) : (
                          <button className="btn-resend-otp" onClick={handleSendOtp}>
                            <span className="material-symbols-outlined text-[16px]">refresh</span>
                            <span>שלח קוד מחדש</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Legal Consent checkbox */}
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    className="checkbox-input"
                    checked={legalAgreed}
                    onChange={(e) => setLegalAgreed(e.target.checked)}
                  />
                  <span className="checkbox-text">
                    אני מסכים/ה לתנאי הערבות כפי שפורטו בנספח א' של חוזה השכירות, ומאשר/ת לצרף את חתימתי הדיגיטלית לחוזה זה.
                  </span>
                </label>

                {/* Final Sign Trigger */}
                <div className="action-row">
                  <button className="btn-back" onClick={() => setStep(2)}>
                    <span className="material-symbols-outlined">arrow_forward</span>
                    <span>חזור לאימות זהות</span>
                  </button>
                  <button 
                    className="btn-next" 
                    disabled={!isStep3Valid}
                    onClick={handleCompleteAndSign}
                    style={{ backgroundColor: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)' }}
                  >
                    <span className="material-symbols-outlined">verified</span>
                    <span>אישור וחתימה על החוזה</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Floating blur glow decorations */}
      <div className="decor-glow-1"></div>
      <div className="decor-glow-2"></div>

      {/* Verification success full-screen animated overlay */}
      {kycOverlayVisible && (
        <div className="overlay-container">
          <div className="overlay-card">
            {kycOverlayState === 'loading' ? (
              <>
                <div className="overlay-spinner mb-6"></div>
                <h3 className="overlay-title">בודק נתוני זהות...</h3>
                <p className="overlay-text">אנו מאמתים את פרטי תעודת הזהות שלך מול מרשם האוכלוסין הממשלתי.</p>
              </>
            ) : (
              <>
                <div className="overlay-icon-badge">
                  <span className="material-symbols-outlined text-4xl material-fill">verified_user</span>
                </div>
                <h3 className="overlay-title" style={{ color: 'var(--tertiary-container)' }}>הזהות אומתה בהצלחה</h3>
                <p className="overlay-text">תעודת הזהות נמצאה תקינה. אנו מעבירים אותך לשלב החתימה הדיגיטלית.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
