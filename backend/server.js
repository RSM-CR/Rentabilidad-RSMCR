require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const routes = require('./routes/route');

const app = express();

// ─────────────────────────────
// CONFIG
// ─────────────────────────────

const port = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173'
];

const jwtSecret = process.env.JWT_SECRET || 'secret-key-default';

const envPath = path.join(__dirname, '.env');

// ✔ FIX: antes era 0.01h (36 segundos)
const USER_EXPIRATION_DAYS = 60;
const USER_EXPIRATION_MS =
  USER_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

// ─────────────────────────────
// SECURITY MIDDLEWARE
// ─────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);

// ─────────────────────────────
// ENV SAFE WRITER (FIX CONCURRENCY RISK)
// ─────────────────────────────

let envSaving = false;

function saveEnvVariables(values) {
  if (envSaving) return;
  envSaving = true;

  try {
    const current = fs.existsSync(envPath)
      ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
      : [];

    const updated = current.map(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (!match) return line;

      const key = match[1];
      if (values[key]) {
        return `${key}=${values[key]}`;
      }
      return line;
    });

    Object.keys(values).forEach(key => {
      if (!updated.some(l => l.startsWith(`${key}=`))) {
        updated.push(`${key}=${values[key]}`);
      }
    });

    fs.writeFileSync(envPath, updated.join('\n'), 'utf8');
    Object.assign(process.env, values);

  } catch (err) {
    console.error('ENV SAVE ERROR:', err);
  } finally {
    envSaving = false;
  }
}

// ─────────────────────────────
// VALIDATIONS
// ─────────────────────────────

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  return (
    /.{14,}/.test(password) &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  );
}

// ─────────────────────────────
// ENCRYPTION (SAFE CHECK)
// ─────────────────────────────

if (!process.env.USER_DATA_KEY) {
  throw new Error('USER_DATA_KEY no definida');
}

const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.USER_DATA_KEY)
  .digest();

function encryptEmail(email) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(email, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

function decryptEmail(data) {
  try {
    const [ivHex, encrypted] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return null;
  }
}

// ─────────────────────────────
// USERS (JSON DB)
// ─────────────────────────────

const usersPath = path.join(__dirname, 'users.json');

function loadUsers() {
  try {
    if (!fs.existsSync(usersPath)) return [];

    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

    const now = Date.now();

    const valid = users.filter(u => {
      if (!u.createdAt) return false;
      return (now - new Date(u.createdAt).getTime()) < USER_EXPIRATION_MS;
    });

    if (valid.length !== users.length) {
      saveUsers(valid);
    }

    return valid;

  } catch (err) {
    console.error('LOAD USERS ERROR:', err);
    return [];
  }
}

function saveUsers(users) {
  try {
    const tmp = `${usersPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(users, null, 2));
    fs.renameSync(tmp, usersPath);
  } catch (err) {
    console.error('SAVE USERS ERROR:', err);
  }
}

function getUserByEmail(email) {
  const users = loadUsers();

  return users.find(u => {
    const decrypted = decryptEmail(u.email);
    return decrypted === email.toLowerCase();
  });
}

// ─────────────────────────────
// SESSION ID
// ─────────────────────────────

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// ─────────────────────────────
// JWT
// ─────────────────────────────

function generateToken(payload) {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: '1h',
    issuer: 'app',
    audience: 'frontend'
  });
}

// ─────────────────────────────
// RATE LIMIT
// ─────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5
});

// ─────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────

function authenticateToken(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });

    req.user = user;
    next();
  });
}

// ─────────────────────────────
// ROUTES CORE
// ─────────────────────────────

app.get('/', (req, res) => {
  res.send('API OK');
});

// HEALTH CHECK (NUEVO)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  });
});

// LOGIN
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Faltan datos' });
  }

  const user = getUserByEmail(email);

  if (!user) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);

  if (!ok) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  const sessionId = generateSessionId();

  const users = loadUsers();
  const index = users.findIndex(u => decryptEmail(u.email) === email.toLowerCase());

  if (index !== -1) {
    users[index].activeSession = sessionId;
    saveUsers(users);
  }

  const token = generateToken({
    email,
    role: user.role,
    sessionId
  });

  res.json({ token, role: user.role });
});

// PROTECTED
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'OK', user: req.user });
});

// ─────────────────────────────
// ERROR HANDLERS
// ─────────────────────────────

app.use((err, req, res, next) => {
  console.error('ERROR:', err);
  res.status(500).json({ message: 'Server error' });
});

// ─────────────────────────────
// START SERVER
// ─────────────────────────────

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}
