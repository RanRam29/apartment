function generateStrongTestPassword() {
  return `T-${Date.now()}-${Math.random().toString(36).slice(2, 12)}-Aa1!`;
}

module.exports = {
  generateStrongTestPassword,
};
