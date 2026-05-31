const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

/** All config keys with defaults — seeded on startup via seedAppConfig(). */
const CONFIG_DEFAULTS = {
  // ── Existing ──
  check_in_window_days: '7', checkin_photos_max: '20', checkout_revision_rounds: '3',
  expiring_warning_days: '30', guarantor_link_ttl_days: '7', blocking_threshold: '5',
  contract_revision_max: '5', payment_autoconfirm_hours: '48', overdue_alert_days: '7',
  kyc_renewal_years: '3', maintenance_alert_hours_1: '24', maintenance_alert_days_2: '3',
  persona_monthly_quota: '10',
  // ── Users ──
  max_login_attempts: '5', lockout_duration_minutes: '30', session_timeout_hours: '72',
  initial_trust_score: '50', max_trust_score: '100', inactive_user_days: '90',
  // ── Listings ──
  max_images_per_listing: '10', max_active_listings_per_landlord: '20',
  listing_expiry_days: '60', listing_boost_duration_days: '7',
  min_listing_price_ils: '500', max_listing_price_ils: '50000',
  // ── Swipe & Match ──
  daily_swipe_limit: '50', daily_superlike_limit: '3', match_expiry_days: '14',
  premium_daily_swipe_limit: '0',
  // ── Payments ──
  late_fee_percentage: '2', payment_reminder_days_before: '3',
  payment_grace_period_days: '5', deposit_months_default: '2', cpi_auto_adjust: 'true',
  // ── Chat ──
  max_message_length: '2000', chat_image_max_size_mb: '5', chat_history_retention_days: '365',
  // ── Notifications ──
  email_digest_frequency_hours: '24', push_notifications_enabled: 'true',
  reminder_new_matches_hours: '12',
  // ── Gamification ──
  points_per_swipe: '1', points_per_match: '10', points_per_contract_signed: '50',
  points_per_payment_on_time: '20', level_2_threshold: '100',
  level_3_threshold: '500', level_4_threshold: '1000',
  // ── Security ──
  api_rate_limit_per_minute: '60', file_upload_max_size_mb: '10',
  require_email_verification: 'true', audit_log_retention_days: '90', min_password_length: '8',
};

const AppConfig = sequelize.define('AppConfig', {
  key: {
    type: DataTypes.STRING(100),
    primaryKey: true,
  },
  value: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'app_config',
});

/** Seed all defaults — findOrCreate so existing values are preserved. */
async function seedAppConfig() {
  for (const [key, value] of Object.entries(CONFIG_DEFAULTS)) {
    await AppConfig.findOrCreate({ where: { key }, defaults: { key, value } });
  }
}

AppConfig.CONFIG_DEFAULTS = CONFIG_DEFAULTS;
AppConfig.seedAppConfig = seedAppConfig;

module.exports = AppConfig;
