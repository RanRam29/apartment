import React, { useState, useEffect, useRef } from 'react';
import api from './services/api';

function App() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);
  const [step, setStep] = useState(1); // 1: Details, 2: Persona KYC, 3: Signature
  
  // KYC simulated state
  const [kycProgress, setKycProgress] = useState(0);
  const [kycScanning, setKycScanning] = useState(false);
  const [kycApproved, setKycApproved] = useState(false);

  // Flow end states
  const [declined, setDeclined] = useState(false);
  const [signed, setSigned] = useState(false);

  // Canvas drawing ref
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    // Resilient extraction of public token from path or query params
    const pathToken = window.location.pathname.split('/').pop();
    const queryToken = new URLSearchParams(window.location.search).get('token');
    const activeToken = (pathToken && pathToken !== 'guarantor' && pathToken !== 'index.html') ? pathToken : queryToken;

    if (!activeToken) {
      setError('חסר מפתח הזמנה מאובטח. אנא השתמש בקישור שנשלח אליך באימייל.');
      setLoading(false);
      return;
    }

    setToken(activeToken);

    // Fetch agreement/guarantor details publicly
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

  // Signature Canvas Drawing Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#5f5ce5';

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0]?.clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0]?.clientY)) - rect.top;

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
  };

  // Decline invitation handler
  const handleDecline = () => {
    if (!window.confirm('האם אתה בטוח שברצונך לדחות את הבקשה להיות ערב בחוזה זה?')) return;
    setLoading(true);
    api.declineInvitation(token)
      .then(() => {
        setDeclined(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        alert('שגיאה בדחיית הבקשה. נסה שנית.');
        setLoading(false);
      });
  };

  // Simulated Persona Verification Flow
  const startPersonaVerification = () => {
    setKycScanning(true);
    setKycProgress(0);
    const interval = setInterval(() => {
      setKycProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setKycScanning(false);
          setKycApproved(true);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  // Complete and Sign flow handler
  const handleCompleteAndSign = () => {
    const canvas = canvasRef.current;
    let sigData = 'mock-signature-base64-data';
    if (canvas) {
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

  if (loading) {
    return (
      <div className="app-container">
        <div className="card loading-screen">
          <div className="spinner"></div>
          <h2>טוען פרטי הזמנת ערב...</h2>
          <p>החיבור מאובטח ומפוקח.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="card error-screen">
          <div className="error-badge">✖</div>
          <h2>שגיאה בגישה לחוזה</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="app-container">
        <div className="card error-screen">
          <div className="error-badge">✕</div>
          <h2>הבקשה נדחתה בהצלחה</h2>
          <p>הודעה נשלחה למשכיר החוזה בדבר סירובך לערוב לחוזה זה.</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="app-container">
        <div className="card success-screen">
          <div className="success-badge">✔</div>
          <h2>החתימה הושלמה בהצלחה!</h2>
          <p>עברנו את תהליך אימות הזהות, וחתמת בהצלחה כערב לחוזה השכירות.</p>
          <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>עותק מהחוזה החתום והאישור ישלח בדואר אלקטרוני.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="card">
        
        {/* Header */}
        <div className="header">
          <span className="logo">🏠</span>
          <h1>אישור וחתימת ערב לחוזה</h1>
          <p>שלום {details.guarantorName}, הוזמנת להיות ערב לחוזה שכירות דרך DirApp</p>
        </div>

        {/* Steps Breadcrumbs Indicator */}
        <div className="steps-container">
          <div className={`step-progress-bar`} style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
          
          <div className={`step-item ${step >= 1 ? 'completed' : ''} ${step === 1 ? 'active' : ''}`}>
            <div className="step-bubble">1</div>
            <span className="step-label">פרטי החוזה</span>
          </div>

          <div className={`step-item ${step >= 2 ? 'completed' : ''} ${step === 2 ? 'active' : ''}`}>
            <div className="step-bubble">2</div>
            <span className="step-label">אימות זהות</span>
          </div>

          <div className={`step-item ${step >= 3 ? 'completed' : ''} ${step === 3 ? 'active' : ''}`}>
            <div className="step-bubble">3</div>
            <span className="step-label">חתימה</span>
          </div>
        </div>

        {/* Dynamic Step Panels */}
        {step === 1 && (
          <div className="info-section">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '5px' }}>אנא אשר את פרטי החוזה להלן:</h2>
            <div className="info-grid">
              
              <div className="info-card">
                <span className="info-label">כתובת הנכס</span>
                <span className="info-value">{details.propertyAddress}</span>
              </div>

              <div className="info-card">
                <span className="info-label">דמי שכירות חודשיים</span>
                <span className="info-value highlight-value">₪{details.rentAmount?.toLocaleString()}</span>
              </div>

              <div className="info-card">
                <span className="info-label">שם השוכר</span>
                <span className="info-value">{details.tenantName}</span>
              </div>

              <div className="info-card">
                <span className="info-label">שם המשכיר (בעל הבית)</span>
                <span className="info-value">{details.landlordName}</span>
              </div>

              <div className="info-card full-width">
                <span className="info-label">תקופת השכירות</span>
                <span className="info-value">{details.leasePeriod}</span>
              </div>

            </div>

            <div className="btn-group">
              <button className="btn btn-outline-danger" onClick={handleDecline}>דחה הזמנה</button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>המשך לאימות זהות</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="info-section">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '5px' }}>אימות זהות מאובטח (Persona SDK)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              חוק המקרקעין דורש מאיתנו לוודא את זהות הערבים למניעת התחזות. אימות הזהות מתבצע בצורה דיגיטלית באמצעות סריקת תעודת זהות וצילום פנים מהיר.
            </p>

            <div className="identity-mock">
              {!kycScanning && !kycApproved && (
                <>
                  <span className="identity-icon">🛡️</span>
                  <h3>מוכן להתחיל באימות זהות</h3>
                  <button className="btn btn-primary" onClick={startPersonaVerification}>התחל אימות זהות עם Persona</button>
                </>
              )}

              {kycScanning && (
                <div className="persona-sdk-frame">
                  <div className="persona-video-placeholder">
                    <div className="camera-dot"></div>
                    <div className="face-guideline"></div>
                  </div>
                  <h3>סורק פנים... {kycProgress}%</h3>
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', marginTop: '10px' }}>
                    <div style={{ width: `${kycProgress}%`, background: 'var(--accent-success)', height: '100%', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '10px' }}>נא להביט ישירות למצלמה ולשמור על פנים יציבות</p>
                </div>
              )}

              {kycApproved && (
                <>
                  <span className="identity-icon" style={{ color: 'var(--accent-success)' }}>✅</span>
                  <h3 style={{ color: 'var(--accent-success)' }}>זהותך אומתה בהצלחה!</h3>
                  <p style={{ fontSize: '0.9rem' }}>תעודת הזהות נמצאה תקינה וצילום הסלפי תואם למאגרים.</p>
                </>
              )}
            </div>

            <div className="btn-group">
              <button className="btn btn-outline-danger" onClick={() => setStep(1)}>חזור</button>
              <button className="btn btn-primary" disabled={!kycApproved} onClick={() => setStep(3)}>המשך לחתימה דיגיטלית</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="info-section">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '5px' }}>חתימה דיגיטלית על כתב הערבות</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              חתימתך על מסך זה מהווה הסכמה מלאה ומשפטית לשמש כערב לכל תנאי חוזה השכירות המפורטים בשלב 1.
            </p>

            <div className="signature-box">
              <h3>צייר את חתימתך בתיבה להלן:</h3>
              <div className="canvas-container">
                <canvas 
                  ref={canvasRef}
                  width="550"
                  height="180"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <div className="canvas-placeholder-text">חתום כאן (באמצעות העכבר או האצבע)</div>
              </div>
              
              <div className="signature-actions">
                <button className="clear-btn" onClick={clearSignature}>נקה חתימה</button>
              </div>
            </div>

            <div className="btn-group">
              <button className="btn btn-outline-danger" onClick={() => setStep(2)}>חזור</button>
              <button className="btn btn-primary" onClick={handleCompleteAndSign}>אשר וחתום סופית</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
