const { sequelize } = require('../src/config/database');

async function run() {
  try {
    await sequelize.authenticate();
    
    const [databases] = await sequelize.query(
      "SELECT datname FROM pg_database WHERE datistemplate = false;"
    );
    
    console.log(`\n=== DATABASES ON POSTGRES SERVER ===`);
    databases.forEach(db => {
      console.log(`- ${db.datname}`);
    });
    console.log(`====================================\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to list databases:', error);
    process.exit(1);
  }
}

run();
