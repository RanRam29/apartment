async function registerVerifyAndLogin(request, app, user) {
  const registerRes = await request(app).post('/api/auth/register').send(user);
  const verificationToken = registerRes.body.verificationToken;
  if (verificationToken) {
    await request(app).get(`/api/auth/verify/${verificationToken}`);
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });

  return {
    registerRes,
    loginRes,
    token: loginRes.body.token,
    user: registerRes.body.user,
  };
}

module.exports = { registerVerifyAndLogin };
