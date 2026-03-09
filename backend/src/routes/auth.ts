import { Router } from 'express';

const router = Router();

// MVP credentials — stored server-side only
const VALID_LOGIN = 'admin';
const VALID_PASSWORD = 'admin123';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { login, password } = req.body;

  if (login === VALID_LOGIN && password === VALID_PASSWORD) {
    req.session.authenticated = true;
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Błąd sesji' });
      }
      return res.json({ success: true });
    });
    return;
  }

  return res.status(401).json({ success: false, message: 'Nieprawidłowy login lub hasło' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/auth/session
router.get('/session', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

export default router;
