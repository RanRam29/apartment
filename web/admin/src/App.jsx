import React, { useState, useEffect } from 'react';
import api from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data States
  const [configs, setConfigs] = useState([]);
  const [users, setUsers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(false);

  // Editable config values locally
  const [configEdits, setConfigEdits] = useState({});

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setIsAuthenticated(true);
      loadAllData();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    localStorage.setItem('admin_token', tokenInput.trim());
    setIsAuthenticated(true);
    loadAllData();
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setTokenInput('');
  };

  const loadAllData = () => {
    setLoading(true);
    Promise.all([
      api.getConfigs().catch(() => []),
      api.getUsers().catch(() => ({ rows: [] })),
      api.getContracts().catch(() => []),
      api.getLedgers().catch(() => []),
      api.getMaintenanceTickets().catch(() => []),
    ]).then(([configsData, usersData, contractsData, ledgersData, maintenanceData]) => {
      setConfigs(configsData);
      setUsers(usersData.rows || []);
      setContracts(contractsData);
      setLedgers(ledgersData);
      setMaintenance(maintenanceData);
      
      // Initialize config edits state
      const edits = {};
      configsData.forEach(c => edits[c.key] = c.value);
      setConfigEdits(edits);

      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  // Actions
  const handleUpdateConfig = (key) => {
    const val = configEdits[key];
    api.updateConfig(key, val)
      .then(() => {
        alert('הגדרת המערכת עודכנה בהצלחה.');
        loadAllData();
      })
      .catch(() => alert('עדכון ההגדרה נכשל.'));
  };

  const handleUnlockUser = (id) => {
    api.unlockUser(id)
      .then(() => {
        alert('המשתמש שוחרר מנעילה בהצלחה.');
        loadAllData();
      })
      .catch(() => alert('פעולת השחרור נכשלה.'));
  };

  const handleKycOverride = (id, status) => {
    api.kycOverride(id, status)
      .then(() => {
        alert(`סטטוס KYC עודכן ל-${status}.`);
        loadAllData();
      })
      .catch(() => alert('עדכון סטטוס KYC נכשל.'));
  };

  const handleOverrideContractStatus = (id, status) => {
    api.overrideContractStatus(id, status)
      .then(() => {
        alert(`סטטוס החוזה עודכן ל-${status}.`);
        loadAllData();
      })
      .catch(() => alert('עדכון סטטוס החוזה נכשל.'));
  };

  const handleCloseTicket = (id) => {
    api.closeMaintenanceTicket(id)
      .then(() => {
        alert('קריאת השירות נסגרה בהצלחה.');
        loadAllData();
      })
      .catch(() => alert('סגירת הקריאה נכשלה.'));
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-gate glowing-card">
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>כניסה למערכת GODMODE 🛡️</h2>
        <form onSubmit={handleLogin}>
          <input 
            type="password" 
            className="auth-input" 
            placeholder="הזן מפתח JWT של מנהל מערכת"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
          />
          <button type="submit" className="auth-btn">התחבר לממשק</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      
      {/* Header */}
      <div className="admin-header">
        <button onClick={handleLogout} className="action-btn">התנתק</button>
        <span className="badge-godmode">GODMODE ACTIVE</span>
        <div className="admin-title-box">
          <h1>ממשק ניהול מרכזי — DirApp Admin</h1>
          <p>שליטה מלאה בפרמטרים, משתמשים, חוזים ותשלומים</p>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="dashboard-grid">
        
        {/* Sidebar Nav */}
        <div className="nav-sidebar">
          <button 
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 דשבורד ונתונים
          </button>
          <button 
            className={`nav-link ${activeTab === 'configs' ? 'active' : ''}`}
            onClick={() => setActiveTab('configs')}
          >
            ⚙️ הגדרות מערכת (AppConfig)
          </button>
          <button 
            className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 ניהול משתמשים
          </button>
          <button 
            className={`nav-link ${activeTab === 'contracts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contracts')}
          >
            📝 חוזי שכירות
          </button>
          <button 
            className={`nav-link ${activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenance')}
          >
            🔧 קריאות שירות
          </button>
        </div>

        {/* Content Pane */}
        <div className="glowing-card" style={{ flex: 1, minHeight: '500px' }}>
          
          {loading && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>טוען נתונים מהשרת...</p>
          )}

          {!loading && activeTab === 'dashboard' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>📊 דשבורד בקרה כללי</h2>
              <div className="metrics-row">
                <div className="metric-card">
                  <span className="metric-label">סה״כ משתמשים</span>
                  <span className="metric-value">{users.length}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">חוזי שכירות</span>
                  <span className="metric-value">{contracts.length}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">שורות תשלום (Ledger)</span>
                  <span className="metric-value">{ledgers.length}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">קריאות שירות</span>
                  <span className="metric-value">{maintenance.length}</span>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'configs' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>⚙️ ניהול פרמטרים והגדרות מערכת</h2>
              {configs.length > 0 ? (
                configs.map(cfg => (
                  <div key={cfg.key} className="config-form-group">
                    <div className="config-edit-box">
                      <input 
                        type="text" 
                        className="config-input" 
                        value={configEdits[cfg.key] || ''}
                        onChange={(e) => setConfigEdits({ ...configEdits, [cfg.key]: e.target.value })}
                      />
                      <button className="action-btn" onClick={() => handleUpdateConfig(cfg.key)}>שמור</button>
                    </div>
                    <div className="config-info">
                      <span className="config-key">{cfg.key}</span>
                      <span className="config-desc">{cfg.description || 'פרמטר שליטה גלובלי למערכת.'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#9aa0b9' }}>לא נמצאו הגדרות מערכת רשומות.</p>
              )}
            </div>
          )}

          {!loading && activeTab === 'users' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>👥 רשימת משתמשים רשומים במערכת</h2>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>אימייל</th>
                      <th>שם</th>
                      <th>תפקיד פעיל</th>
                      <th>סטטוס נעילה</th>
                      <th>אישור זהות (KYC)</th>
                      <th>פעולות מנהל</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>{u.firstName} {u.lastName}</td>
                        <td>{u.activeRole || u.role}</td>
                        <td style={{ color: u.isLocked ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                          {u.isLocked ? `נעול (${u.blockedCount})` : 'פעיל תקין'}
                        </td>
                        <td>APPROVED</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {u.isLocked && (
                              <button className="action-btn btn-success" onClick={() => handleUnlockUser(u.id)}>שחרר נעילה</button>
                            )}
                            <button className="action-btn" onClick={() => handleKycOverride(u.id, 'APPROVED')}>אשר זהות ידנית</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && activeTab === 'contracts' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>📝 מעקב חוזי שכירות וסטטוסים</h2>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>מפתח חוזה</th>
                      <th>מזהה משכיר</th>
                      <th>שכר דירה</th>
                      <th>סטטוס נוכחי</th>
                      <th>שינוי סטטוס (GODMODE)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontSize: '0.8rem' }}>{c.id}</td>
                        <td style={{ fontSize: '0.8rem' }}>{c.landlordId}</td>
                        <td>₪{parseFloat(c.monthlyRentIls || c.monthlyRent || 0).toLocaleString()}</td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>{c.status}</td>
                        <td>
                          <select 
                            className="config-input" 
                            style={{ width: '130px', background: '#0a0a12' }}
                            value={c.status}
                            onChange={(e) => handleOverrideContractStatus(c.id, e.target.value)}
                          >
                            <option value="UPLOAD">UPLOAD</option>
                            <option value="PENDING_SIGN">PENDING_SIGN</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="EXPIRING">EXPIRING</option>
                            <option value="ENDED">ENDED</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && activeTab === 'maintenance' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>🔧 מעקב קריאות שירות ותקלות</h2>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>מפתח קריאה</th>
                      <th>תיאור תקלה</th>
                      <th>סטטוס</th>
                      <th>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenance.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontSize: '0.8rem' }}>{t.id}</td>
                        <td>{t.description}</td>
                        <td style={{ color: t.status === 'CLOSED' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                          {t.status}
                        </td>
                        <td>
                          {t.status !== 'CLOSED' && (
                            <button className="action-btn btn-success" onClick={() => handleCloseTicket(t.id)}>סגור קריאה סופית</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>
      
    </div>
  );
}

export default App;
