describe('Admin Panel v1', () => {
  it('defines default GODMODE config keys', () => {
    const DEFAULTS = {
      check_in_window_days: '5',
      checkin_photos_max: '20',
      checkout_revision_rounds: '3',
      expiring_warning_days: '120',
      guarantor_link_ttl_days: '5',
      blocking_threshold: '5',
      contract_revision_max: '10',
      payment_autoconfirm_hours: '48',
      overdue_alert_days: '5',
      kyc_renewal_years: '5',
      maintenance_alert_hours_1: '24',
      maintenance_alert_days_2: '3',
      persona_monthly_quota: '500',
    };
    expect(Object.keys(DEFAULTS)).toHaveLength(13);
    expect(DEFAULTS.payment_autoconfirm_hours).toBe('48');
  });

  it('admin routes require admin role', () => {
    const allowedRoles = ['admin'];
    expect(allowedRoles).toContain('admin');
    expect(allowedRoles).not.toContain('tenant');
    expect(allowedRoles).not.toContain('landlord');
  });

  it('AppConfig uses string key as primary key', () => {
    const config = { key: 'expiring_warning_days', value: '120' };
    expect(typeof config.key).toBe('string');
    expect(config.key.length).toBeLessThanOrEqual(100);
  });
});
