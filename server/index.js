import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query, setupDatabase } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('etag');
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});
app.use(express.json({ limit: '50mb' })); // Allow large payloads (e.g. master lists)
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Cache the admin-controlled active academic year from the database
let cachedActiveYear = '2025-2026';
async function refreshActiveYear() {
  try {
    const res = await query("SELECT academic_year FROM academic_years WHERE status = 'ACTIVE' LIMIT 1");
    if (res.rows.length > 0) {
      cachedActiveYear = res.rows[0].academic_year;
    }
  } catch (err) {
    console.error('Failed to fetch active academic year:', err.message);
  }
}
// Refresh on startup (after DB is ready) and every 60 seconds
setTimeout(() => refreshActiveYear(), 3000);
setInterval(() => refreshActiveYear(), 60000);

// Extract academic year: admin can choose via header; students/coordinators always get the active year
app.use((req, res, next) => {
  // The role will be checked after JWT verification in authenticateToken.
  // At this middleware stage we only read the header; the authenticateToken
  // middleware below will override req.academicYear for non-admin roles.
  req.academicYear =
    req.headers['x-academic-year'] ||
    req.query.academicYear ||
    req.query.year ||
    cachedActiveYear;
  next();
});

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Expose static uploads folder
app.use('/uploads', express.static(uploadDir));
app.use('/mobile', express.static(path.join(__dirname, '../mobile/dist')));

const JWT_SECRET = process.env.JWT_SECRET || 'placepro-secret-key-123';

// Helpers to map database naming conventions (snake_case) to frontend naming conventions (camelCase)
const mapStudentToFrontend = (row) => ({
  rollNumber: row.roll_number,
  firstName: row.first_name,
  lastName: row.last_name,
  fullName: row.full_name,
  mailId: row.mail_id,
  alternateMailId: row.alternate_mail_id,
  phoneNumber: row.phone_number,
  alternatePhoneNumber: row.alternate_phone_number,
  aadharNumber: row.aadhar_number,
  gender: row.gender,
  country: row.country,
  state: row.state,
  city: row.city,
  branch: row.branch,
  dateOfBirth: row.date_of_birth,
  tenthPercentage: row.tenth_percentage,
  tenthYop: row.tenth_yop,
  tenthBoard: row.tenth_board,
  twelfthPercentage: row.twelfth_percentage,
  twelfthYop: row.twelfth_yop,
  twelfthBoard: row.twelfth_board,
  collegeName: row.college_name,
  btechCgpa: row.btech_cgpa,
  btechYop: row.btech_yop,
  activeBacklogs: row.active_backlogs,
  noOfBacklogs: row.no_of_backlogs,
  academicYear: row.academic_year,
});

const mapFormToFrontend = (row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  status: row.status,
  created: row.created,
  startDate: row.start_date,
  startTime: row.start_time,
  endDate: row.end_date,
  endTime: row.end_time,
  total: row.total,
  fields: row.fields,
  hasCompanyDrive: row.has_company_drive,
  companyName: row.company_name,
  companySector: row.company_sector,
  companyCategory: row.company_category,
  companyLocation: row.company_location,
  companyDriveMode: row.company_drive_mode,
  companyJobType: row.company_job_type,
  companyPkgMin: row.company_pkg_min,
  companyPkgMax: row.company_pkg_max,
  companyMinCgpa: row.company_min_cgpa,
  companyMaxBacklogs: row.company_max_backlogs,
  companyAcademicYear: row.company_academic_year,
  companyRemarks: row.company_remarks,
  academicYear: row.academic_year,
});

const mapSubmissionToFrontend = (row) => ({
  id: row.id,
  formId: row.form_id,
  roll: row.roll,
  name: row.name,
  submittedAt: row.submitted_at,
  status: row.status,
  values: row.values,
  academicYear: row.academic_year,
});

const mapCompanyToFrontend = (row) => ({
  id: row.id,
  name: row.name,
  sector: row.sector,
  type: row.type,
  location: row.location,
  drives: row.drives,
  hires: row.hires,
  package: row.package,
  status: row.status,
  mode: row.mode,
  jobType: row.job_type,
  academicYear: row.academic_year,
  remarks: row.remarks,
});

const mapPlacementToFrontend = (row) => ({
  student: row.student,
  id: row.id, // roll number
  branch: row.branch,
  company: row.company,
  role: row.role,
  package: row.package,
  date: row.date,
  type: row.type,
  email: row.email,
  phone: row.phone,
  academicYear: row.academic_year,
});

const mapNotificationToFrontend = (row) => ({
  id: row.id,
  rollNumber: row.roll_number,
  studentName: row.student_name,
  company: row.company,
  role: row.role,
  package: row.package,
  date: row.date,
  type: row.type,
  createdAt: row.created_at,
  read: row.read,
  academicYear: row.academic_year,
});

function parsePackageToLpa(value) {
  if (!value) return null;
  const match = String(value).match(/\d+(?:\.\d+)?/);
  const numeric = match ? parseFloat(match[0]) : Number.NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired authorization token' });
    }
    req.user = user;
    
    // Non-admin users (students, coordinators) can specify their academic year, falling back to active year
    if (user.role !== 'admin') {
      req.academicYear = req.headers['x-academic-year'] || req.query.academicYear || cachedActiveYear;
    }
    
    next();
  });
}

// GET public statistics endpoint (no authentication required)
app.get('/api/public-stats', async (req, res) => {
  try {
    const studentsRes = await query('SELECT COUNT(*) FROM master_students WHERE academic_year = $1', [req.academicYear]);
    const companiesRes = await query('SELECT COUNT(*) FROM companies WHERE academic_year = $1', [req.academicYear]);
    const placementsRes = await query('SELECT COUNT(*) FROM placements WHERE academic_year = $1', [req.academicYear]);
    const drivesRes = await query('SELECT SUM(drives) FROM companies WHERE academic_year = $1', [req.academicYear]);

    const totalStudents = parseInt(studentsRes.rows[0]?.count || 0) || 0;
    const totalCompanies = parseInt(companiesRes.rows[0]?.count || 0) || 0;
    const totalPlacements = parseInt(placementsRes.rows[0]?.count || 0) || 0;
    const totalDrives = parseInt(drivesRes.rows[0]?.sum || drivesRes.rows[0]?.count || 0) || 0;

    res.json({
      success: true,
      students: totalStudents,
      companies: totalCompanies,
      placements: totalPlacements,
      drives: totalDrives
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    let result = await query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR UPPER(associated_id) = UPPER($1)',
      [email.trim()]
    );
    
    let role;
    let username;
    let name;
    let department;
    let rollNumber;
    let academicYear;
    let isPasswordValid = false;

    if (result.rows.length > 0) {
      const user = result.rows[0];
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      role = user.role;
      username = user.username;
      name = user.name;
      department = role === 'coordinator' ? user.associated_id : undefined;
      rollNumber = role === 'student' ? user.associated_id : undefined;
      
      if (role === 'student') {
        const studentResult = await query(
          'SELECT academic_year FROM master_students WHERE UPPER(roll_number) = UPPER($1)',
          [rollNumber]
        );
        if (studentResult.rows.length > 0) {
          academicYear = studentResult.rows[0].academic_year;
        }
      }
    } else {
      // Fallback: Check master_students table
      const studentResult = await query(
        'SELECT * FROM master_students WHERE UPPER(roll_number) = UPPER($1) OR LOWER(mail_id) = LOWER($1)',
        [email.trim()]
      );

      if (studentResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const student = studentResult.rows[0];
      const normalizedInputPassword = password.trim().toUpperCase();
      const dbRoll = student.roll_number.trim().toUpperCase();
      const dbDob = (student.date_of_birth || '').trim().toUpperCase();

      if (normalizedInputPassword === dbRoll || password.trim() === dbDob) {
        isPasswordValid = true;
      }

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      role = 'student';
      username = student.mail_id || `${student.roll_number.toLowerCase()}@college.edu`;
      name = student.full_name || `${student.first_name} ${student.last_name}`.trim();
      rollNumber = student.roll_number;
      department = undefined;
      academicYear = student.academic_year;
    }

    const session = {
      role,
      email: username,
      name,
      department,
      rollNumber,
      academicYear
    };

    if (role === 'student') {
      const userCheck = await query('SELECT totp_secret FROM users WHERE role = \'student\' AND UPPER(associated_id) = UPPER($1)', [rollNumber]);
      const has2FA = userCheck.rows.length > 0 && userCheck.rows[0].totp_secret;

      const tempSession = { ...session, isTemp: true };
      const tempToken = jwt.sign(tempSession, JWT_SECRET, { expiresIn: '10m' });

      return res.json({
        success: true,
        token: tempToken,
        session: tempSession,
        requireSetup: !has2FA,
        require2FA: !!has2FA
      });
    }

    const token = jwt.sign(session, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      token,
      session
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST setup 2FA (generates QR code)
app.post('/api/auth/setup-2fa', authenticateToken, async (req, res) => {
  if (!req.user.isTemp || req.user.role !== 'student') {
    return res.status(403).json({ error: 'Invalid session for 2FA setup' });
  }

  try {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(req.user.email, 'PlaceGO!', secret);
    const qrCodeImage = await QRCode.toDataURL(otpauthUrl);
    
    res.json({
      success: true,
      secret,
      qrCodeImage
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate 2FA setup' });
  }
});

// POST enable 2FA (verifies first-time code and saves secret)
app.post('/api/auth/enable-2fa', authenticateToken, async (req, res) => {
  const { code, secret, securityQuestion, securityAnswer } = req.body;
  if (!code || !secret || !securityQuestion || !securityAnswer) {
    return res.status(400).json({ error: 'Code, secret, security question, and answer are required' });
  }

  const isValid = authenticator.verify({ token: code, secret });
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  try {
    const rollNumber = req.user.rollNumber;
    
    // Hash security answer (case insensitive)
    const normalizedAnswer = securityAnswer.trim().toLowerCase();
    const answerHash = await bcrypt.hash(normalizedAnswer, 10);
    
    await query('UPDATE users SET totp_secret = $1, security_question = $2, security_answer_hash = $3 WHERE role = $4 AND UPPER(associated_id) = UPPER($5)', 
      [secret, securityQuestion, answerHash, 'student', rollNumber]);
    
    // Check if student was in users table. If not, we might need to insert them.
    const userCheck = await query('SELECT * FROM users WHERE role = $1 AND UPPER(associated_id) = UPPER($2)', ['student', rollNumber]);
    if (userCheck.rows.length === 0) {
      // Create user entry
      const passwordHash = await bcrypt.hash(rollNumber, 10); // fallback password hash
      await query(
        'INSERT INTO users (username, password_hash, role, name, associated_id, totp_secret, security_question, security_answer_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [req.user.email, passwordHash, 'student', req.user.name, rollNumber, secret, securityQuestion, answerHash]
      );
    }
    
    // Generate final token
    const { isTemp, iat, exp, ...sessionData } = req.user;
    const finalToken = jwt.sign(sessionData, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      token: finalToken,
      session: sessionData
    });
  } catch (err) {
    console.error("ENABLE 2FA ERROR:", err);
    res.status(500).json({ error: 'Failed to save 2FA settings: ' + err.message });
  }
});

// POST verify 2FA for regular login
app.post('/api/auth/verify-login-2fa', authenticateToken, async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Verification code is required' });
  }
  
  if (!req.user.isTemp) {
    return res.status(403).json({ error: 'Invalid token type for 2FA verification' });
  }

  try {
    const rollNumber = req.user.rollNumber;
    const result = await query('SELECT totp_secret FROM users WHERE role = $1 AND UPPER(associated_id) = UPPER($2)', ['student', rollNumber]);
    
    if (result.rows.length === 0 || !result.rows[0].totp_secret) {
      return res.status(400).json({ error: '2FA not setup for this account' });
    }

    const secret = result.rows[0].totp_secret;
    const isValid = authenticator.verify({ token: code, secret });
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const { isTemp, iat, exp, ...sessionData } = req.user;
    const finalToken = jwt.sign(sessionData, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      token: finalToken,
      session: sessionData
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// POST get security question for forgot password
app.post('/api/auth/get-security-question', async (req, res) => {
  const { rollNumber } = req.body;
  if (!rollNumber) {
    return res.status(400).json({ error: 'Roll Number is required' });
  }
  try {
    const result = await query("SELECT security_question FROM users WHERE role = 'student' AND UPPER(associated_id) = UPPER($1)", [rollNumber.trim()]);
    if (result.rows.length === 0 || !result.rows[0].security_question) {
      return res.status(400).json({ error: 'No security question found for this Roll Number. You may need to contact an admin to reset your account.' });
    }
    res.json({ success: true, question: result.rows[0].security_question });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve security question' });
  }
});

// POST student forgot password endpoint
app.post('/api/auth/student-forgot-password', async (req, res) => {
  const { rollNumber, email, dateOfBirth, securityAnswer, newPassword } = req.body;

  if (!rollNumber || !email || !dateOfBirth || !securityAnswer || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // 1. Verify student exists in master_students
    const studentResult = await query(
      'SELECT * FROM master_students WHERE UPPER(roll_number) = UPPER($1)',
      [rollNumber.trim()]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found. Please verify your Roll Number.' });
    }

    const student = studentResult.rows[0];

    // 2. Verify registered email and DOB
    const dbEmail = (student.mail_id || '').trim().toLowerCase();
    const dbDob = (student.date_of_birth || '').trim();

    if (dbEmail !== email.trim().toLowerCase() || dbDob !== dateOfBirth.trim()) {
      return res.status(400).json({ error: 'Identity verification failed. Registered Email or Date of Birth is incorrect.' });
    }

    // 3. Verify security answer
    const userResult = await query("SELECT security_answer_hash FROM users WHERE role = 'student' AND UPPER(associated_id) = UPPER($1)", [rollNumber.trim()]);
    if (userResult.rows.length === 0 || !userResult.rows[0].security_answer_hash) {
      return res.status(400).json({ error: 'No security answer found for this account.' });
    }
    const isAnswerValid = await bcrypt.compare(securityAnswer.trim().toLowerCase(), userResult.rows[0].security_answer_hash);
    if (!isAnswerValid) {
      return res.status(400).json({ error: 'Incorrect security answer.' });
    }

    // 3. Hash the new password
    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

    // 4. Upsert password hash into users table
    const userCheck = await query(
      'SELECT * FROM users WHERE UPPER(associated_id) = UPPER($1) AND role = \'student\'',
      [rollNumber.trim()]
    );

    if (userCheck.rows.length > 0) {
      // Update existing user
      await query(
        'UPDATE users SET password_hash = $1 WHERE UPPER(associated_id) = UPPER($2) AND role = \'student\'',
        [passwordHash, rollNumber.trim()]
      );
    } else {
      // Create a new student user
      const studentName = student.full_name || `${student.first_name} ${student.last_name}`.trim();
      await query(
        'INSERT INTO users (username, password_hash, role, name, associated_id) VALUES ($1, $2, \'student\', $3, $4)',
        [student.mail_id || `${rollNumber.toLowerCase()}@college.edu`, passwordHash, studentName, rollNumber.trim()]
      );
    }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST coordinator forgot password endpoint
app.post('/api/auth/coordinator-forgot-password', async (req, res) => {
  const { email, department, newPassword } = req.body;

  if (!email || !department || !newPassword) {
    return res.status(400).json({ error: 'All fields (Email, Department/Branch, New Password) are required' });
  }

  try {
    const userResult = await query(
      "SELECT * FROM users WHERE role = 'coordinator' AND LOWER(username) = LOWER($1) AND associated_id = $2",
      [email.trim(), department.trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Coordinator account not found. Please verify your Email and Department.' });
    }

    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

    await query(
      "UPDATE users SET password_hash = $1 WHERE username = $2 AND role = 'coordinator'",
      [passwordHash, email.trim()]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT admin change password endpoint
app.put('/api/auth/admin-change-credentials', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword, newEmail } = req.body;
  
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only admins can change their credentials' });
  }

  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required' });
  }

  try {
    const result = await query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [req.user.email.trim()]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin account not found' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    let passwordHash = user.password_hash;
    if (newPassword) {
      passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    }
    
    let targetEmail = req.user.email.trim();
    if (newEmail && newEmail.trim().toLowerCase() !== targetEmail.toLowerCase()) {
      // Check if new email is taken
      const checkResult = await query(
        'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
        [newEmail.trim()]
      );
      if (checkResult.rows.length > 0) {
        return res.status(400).json({ error: 'Email is already in use by another account' });
      }
      targetEmail = newEmail.trim();
    }

    await query(
      "UPDATE users SET password_hash = $1, username = $2 WHERE username = $3",
      [passwordHash, targetEmail, req.user.email.trim()]
    );

    res.json({ success: true, message: 'Credentials updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin coordinator management endpoints
app.get('/api/admin/coordinators', async (req, res) => {
  try {
    const result = await query("SELECT username, name, associated_id FROM users WHERE role = 'coordinator'", []);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/coordinators', async (req, res) => {
  const { username, name, department, password, isEdit } = req.body;

  if (!username || !name || !department) {
    return res.status(400).json({ error: 'Username, Name, and Department are required' });
  }

  try {
    if (isEdit) {
      // Update coordinator details
      await query(
        "UPDATE users SET name = $1, associated_id = $2 WHERE username = $3",
        [name.trim(), department.trim(), username.trim()]
      );

      // If password is provided, update password too
      if (password && password.trim() !== '') {
        const hash = await bcrypt.hash(password.trim(), 10);
        await query(
          "UPDATE users SET password_hash = $1 WHERE username = $2",
          [hash, username.trim()]
        );
      }
      res.json({ success: true, message: 'Coordinator updated successfully' });
    } else {
      // Check if user already exists
      const exists = await query(
        "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
        [username.trim()]
      );
      if (exists.rows.length > 0) {
        return res.status(400).json({ error: 'Username/Email already exists' });
      }

      const pswd = password || 'coordinator123';
      const hash = await bcrypt.hash(pswd.trim(), 10);

      await query(
        "INSERT INTO users (username, password_hash, role, name, associated_id) VALUES ($1, $2, 'coordinator', $3, $4)",
        [username.trim(), hash, name.trim(), department.trim()]
      );
      res.json({ success: true, message: 'Coordinator created successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/coordinators/:username', async (req, res) => {
  const { username } = req.params;
  try {
    await query("DELETE FROM users WHERE username = $1", [username]);
    res.json({ success: true, message: 'Coordinator deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST file upload endpoint
app.post('/api/upload', upload.single('resume'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, fileUrl });
});

// GET endpoints
app.get('/api/master-rows', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM master_students WHERE academic_year = $1', [req.academicYear]);
    res.json(result.rows.map(mapStudentToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/master-history', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM master_history WHERE academic_year = $1 ORDER BY id DESC', [req.academicYear]);
    res.json(result.rows.map(row => ({
      fileName: row.file_name,
      uploadDate: row.upload_date,
      recordsCount: row.records_count,
      uploadedBy: row.uploaded_by,
      rows: typeof row.rows === 'string' ? JSON.parse(row.rows) : row.rows
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/master-history', authenticateToken, async (req, res) => {
  const { fileName, uploadDate, recordsCount, uploadedBy, rows } = req.body;
  try {
    const rowsJson = JSON.stringify(rows || []);
    await query(
      `INSERT INTO master_history (file_name, upload_date, records_count, uploaded_by, rows, academic_year)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [fileName, uploadDate, recordsCount, uploadedBy, rowsJson, req.academicYear]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/placement-forms', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM placement_forms WHERE academic_year = $1', [req.academicYear]);
    res.json(result.rows.map(mapFormToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/form-submissions', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM form_submissions WHERE academic_year = $1', [req.academicYear]);
    res.json(result.rows.map(mapSubmissionToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/companies', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM companies WHERE academic_year = $1', [req.academicYear]);
    res.json(result.rows.map(mapCompanyToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/placements', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM placements WHERE academic_year = $1', [req.academicYear]);
    res.json(result.rows.map(mapPlacementToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/placement-notifications', authenticateToken, async (req, res) => {
  try {
    let result;
    if (req.user && req.user.role === 'student') {
      const roll = String(req.user.rollNumber || req.user.associated_id || req.user.email || '').trim().toUpperCase();
      result = await query(`
        SELECT * FROM placement_notifications 
        WHERE academic_year = $1 AND (UPPER(roll_number) = $2 OR UPPER(roll_number) = 'ALL' OR roll_number IS NULL OR roll_number = '')
        ORDER BY created_at DESC
      `, [req.academicYear, roll]);
    } else if (req.user && req.user.role === 'coordinator') {
      const dept = String(req.user.department || req.user.associated_id || '').trim().toUpperCase();
      result = await query(`
        SELECT * FROM placement_notifications 
        WHERE academic_year = $1 AND (UPPER(roll_number) = $2 OR UPPER(roll_number) LIKE '%COORD%' OR UPPER(student_name) LIKE '%COORD%' OR UPPER(roll_number) = 'ALL')
        ORDER BY created_at DESC
      `, [req.academicYear, dept]);
    } else {
      result = await query('SELECT * FROM placement_notifications WHERE academic_year = $1 ORDER BY created_at DESC', [req.academicYear]);
    }

    // Deduplicate notifications by title/company + role/message
    const seenNotifs = new Set();
    const deduplicatedRows = [];
    for (const r of result.rows) {
      const key = `${String(r.company || '').trim().toUpperCase()}::${String(r.role || r.message || '').trim().toUpperCase()}`;
      if (!seenNotifs.has(key)) {
        seenNotifs.add(key);
        deduplicatedRows.push(r);
      }
    }

    res.json(deduplicatedRows.map(mapNotificationToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Academic Year Management API Endpoints ────────────────

// GET all academic years
app.get('/api/academic-years', async (req, res) => {
  try {
    const result = await query('SELECT * FROM academic_years ORDER BY academic_year DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new academic year
app.post('/api/academic-years', authenticateToken, async (req, res) => {
  const {
    academic_year,
    start_date,
    end_date,
    status,
    college_name,
    university,
    college_location,
    college_website
  } = req.body;
  if (!academic_year) {
    return res.status(400).json({ error: 'academic_year is required' });
  }

  try {
    // Check if already exists
    const existing = await query('SELECT * FROM academic_years WHERE academic_year = $1', [academic_year]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Academic year already exists' });
    }

    const result = await query(
      `INSERT INTO academic_years (
        academic_year, start_date, end_date, status, college_name, university, college_location, college_website, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        academic_year,
        start_date || '',
        end_date || '',
        status || 'UPCOMING',
        college_name || '',
        university || '',
        college_location || '',
        college_website || '',
        new Date().toISOString()
      ]
    );
    await refreshActiveYear();
    res.json({
      success: true,
      data: result.rows[0] || {
        academic_year,
        start_date,
        end_date,
        status: status || 'UPCOMING',
        college_name,
        university,
        college_location,
        college_website
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update an academic year
app.put('/api/academic-years/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { academic_year, start_date, end_date, status, college_name, university, college_location, college_website } = req.body;

  try {
    // If activating, deactivate all other ACTIVE years first
    if (status === 'ACTIVE') {
      await query("UPDATE academic_years SET status='ARCHIVED' WHERE status='ACTIVE'");
    }

    const result = await query(
      `UPDATE academic_years
       SET academic_year=$1, start_date=$2, end_date=$3, status=$4,
           college_name=$5, university=$6, college_location=$7, college_website=$8
       WHERE id = $9`,
      [
        academic_year,
        start_date || '',
        end_date || '',
        status || 'UPCOMING',
        college_name || '',
        university || '',
        college_location || '',
        college_website || '',
        parseInt(id)
      ]
    );
    await refreshActiveYear();
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an academic year and only that year's operational data
app.delete('/api/academic-years/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Get the academic year string
    const yearResult = await query('SELECT * FROM academic_years WHERE id = $1', [parseInt(id)]);
    if (yearResult.rows.length === 0) {
      return res.status(404).json({ error: 'Academic year not found' });
    }
    const yearStr = yearResult.rows[0].academic_year;

    const tables = ['master_students', 'companies', 'placements', 'placement_forms', 'form_submissions', 'placement_notifications', 'master_history'];
    await query('BEGIN');
    
    // Delete student portal accounts and push tokens for this academic year
    await query(`
      DELETE FROM user_push_tokens
      WHERE UPPER(roll_number) IN (
        SELECT UPPER(roll_number) FROM master_students WHERE academic_year = $1
      )
    `, [yearStr]);
    
    await query(`
      DELETE FROM users 
      WHERE role = 'student' 
      AND UPPER(associated_id) IN (
        SELECT UPPER(roll_number) FROM master_students WHERE academic_year = $1
      )
    `, [yearStr]);

    for (const table of tables) {
      await query(`DELETE FROM ${table} WHERE academic_year = $1`, [yearStr]);
    }

    await query('DELETE FROM academic_years WHERE id = $1', [parseInt(id)]);
    await query('COMMIT');
    await refreshActiveYear();
    res.json({ success: true, message: `Academic year ${yearStr} and its data deleted successfully` });
  } catch (err) {
    try {
      await query('ROLLBACK');
    } catch {}
    res.status(500).json({ error: err.message });
  }
});

// GET dashboard stats for a specific year
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  const year = req.query.year || req.academicYear;
  try {
    const studentsRes = await query('SELECT COUNT(*) FROM master_students WHERE academic_year = $1', [year]);
    const companiesRes = await query('SELECT COUNT(*) FROM companies WHERE academic_year = $1', [year]);
    const placementsRes = await query('SELECT COUNT(*) FROM placements WHERE academic_year = $1', [year]);
    const drivesRes = await query('SELECT SUM(drives) FROM companies WHERE academic_year = $1', [year]);

    // Get all placements for package calculations
    const allPlacements = await query('SELECT * FROM placements WHERE academic_year = $1', [year]);
    let highestPackage = 0;
    let avgPackage = 0;
    let totalPackageSum = 0;
    let packageCount = 0;

    allPlacements.rows.forEach(p => {
      const numericLpa = parsePackageToLpa(p.package);
      if (numericLpa !== null) {
        if (numericLpa > highestPackage) highestPackage = numericLpa;
        totalPackageSum += numericLpa;
        packageCount++;
      }
    });

    if (packageCount > 0) avgPackage = totalPackageSum / packageCount;

    const totalStudents = parseInt(studentsRes.rows[0]?.count || 0);
    const totalPlaced = parseInt(placementsRes.rows[0]?.count || 0);

    res.json({
      year,
      totalStudents,
      totalCompanies: parseInt(companiesRes.rows[0]?.count || 0),
      totalPlaced,
      totalDrives: parseInt(drivesRes.rows[0]?.sum || 0),
      placementPercentage: totalStudents > 0 ? Math.round((totalPlaced / totalStudents) * 100) : 0,
      highestPackage,
      avgPackage: Math.round(avgPackage * 10) / 10,
      offersReleased: totalPlaced,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET comparison data for multiple years
app.get('/api/dashboard/comparison', authenticateToken, async (req, res) => {
  const yearsParam = req.query.years; // comma-separated years e.g. "2023-2024,2024-2025"
  if (!yearsParam) {
    return res.status(400).json({ error: 'years query parameter is required (comma-separated)' });
  }

  const years = yearsParam.split(',').map(y => y.trim());

  try {
    const results = [];

    for (const year of years) {
      const studentsRes = await query('SELECT COUNT(*) FROM master_students WHERE academic_year = $1', [year]);
      const placementsRes = await query('SELECT * FROM placements WHERE academic_year = $1', [year]);
      const companiesRes = await query('SELECT COUNT(*) FROM companies WHERE academic_year = $1', [year]);

      let highestPackage = 0;
      let totalPackageSum = 0;
      let packageCount = 0;

      placementsRes.rows.forEach(p => {
        const numericLpa = parsePackageToLpa(p.package);
        if (numericLpa !== null) {
          if (numericLpa > highestPackage) highestPackage = numericLpa;
          totalPackageSum += numericLpa;
          packageCount++;
        }
      });

      const totalStudents = parseInt(studentsRes.rows[0]?.count || 0);
      const totalPlaced = placementsRes.rows.length;

      results.push({
        year,
        totalStudents,
        totalPlaced,
        totalCompanies: parseInt(companiesRes.rows[0]?.count || 0),
        placementPercentage: totalStudents > 0 ? Math.round((totalPlaced / totalStudents) * 100) : 0,
        highestPackage,
        avgPackage: packageCount > 0 ? Math.round((totalPackageSum / packageCount) * 10) / 10 : 0,
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET analytics trends across all years
app.get('/api/analytics/trends', authenticateToken, async (req, res) => {
  try {
    const yearsRes = await query('SELECT * FROM academic_years ORDER BY academic_year');
    const years = yearsRes.rows;

    const trends = [];

    for (const yearRow of years) {
      const year = yearRow.academic_year;
      const studentsRes = await query('SELECT * FROM master_students WHERE academic_year = $1', [year]);
      const placementsRes = await query('SELECT * FROM placements WHERE academic_year = $1', [year]);
      const companiesRes = await query('SELECT * FROM companies WHERE academic_year = $1', [year]);

      let highestPackage = 0;
      let totalPackageSum = 0;
      let packageCount = 0;

      // Branch-wise breakdown
      const branchMap = {};

      placementsRes.rows.forEach(p => {
        const numericLpa = parsePackageToLpa(p.package);
        if (numericLpa !== null) {
          if (numericLpa > highestPackage) highestPackage = numericLpa;
          totalPackageSum += numericLpa;
          packageCount++;
        }
        const branch = p.branch || 'Other';
        branchMap[branch] = (branchMap[branch] || 0) + 1;
      });

      // Company-wise hires
      const companyHires = {};
      placementsRes.rows.forEach(p => {
        const company = p.company || 'Unknown';
        companyHires[company] = (companyHires[company] || 0) + 1;
      });

      trends.push({
        year,
        status: yearRow.status,
        totalStudents: studentsRes.rows.length,
        totalPlaced: placementsRes.rows.length,
        totalCompanies: companiesRes.rows.length,
        placementPercentage: studentsRes.rows.length > 0 ? Math.round((placementsRes.rows.length / studentsRes.rows.length) * 100) : 0,
        highestPackage,
        avgPackage: packageCount > 0 ? Math.round((totalPackageSum / packageCount) * 10) / 10 : 0,
        branchWise: branchMap,
        topRecruiters: Object.entries(companyHires).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, hires]) => ({ name, hires })),
      });
    }

    res.json(trends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Academic Year Archive API Endpoints ────────────────

app.post('/api/admin/archive', authenticateToken, async (req, res) => {
  const { academicYear } = req.body;
  if (!academicYear) {
    return res.status(400).json({ error: 'Academic year is required' });
  }

  try {
    // Fetch all rows
    const studentsRes = await query('SELECT * FROM master_students');
    const companiesRes = await query('SELECT * FROM companies');
    const placementsRes = await query('SELECT * FROM placements');
    const formsRes = await query('SELECT * FROM placement_forms');
    const submissionsRes = await query('SELECT * FROM form_submissions');
    const notificationsRes = await query('SELECT * FROM placement_notifications');

    const allStudents = studentsRes.rows.map(mapStudentToFrontend);
    const allCompanies = companiesRes.rows.map(mapCompanyToFrontend);
    const allPlacements = placementsRes.rows.map(mapPlacementToFrontend);
    const allForms = formsRes.rows.map(mapFormToFrontend);
    const allSubmissions = submissionsRes.rows.map(mapSubmissionToFrontend);
    const allNotifications = notificationsRes.rows.map(mapNotificationToFrontend);

    // Filter logic
    const targetYear = academicYear.trim(); // e.g. "2026-2027"
    const gradYear = targetYear.split('-')[1] || ''; // e.g. "2027"

    // 1. Filter Companies
    const filteredCompanies = allCompanies.filter(c => c.academicYear === targetYear);
    const companyNames = new Set(filteredCompanies.map(c => c.name.toLowerCase()));

    // 2. Filter Forms
    const filteredForms = allForms.filter(f => f.companyAcademicYear === targetYear);
    const formIds = new Set(filteredForms.map(f => f.id));

    // 3. Filter Submissions
    const filteredSubmissions = allSubmissions.filter(s => formIds.has(s.formId));

    // 4. Filter Placements
    // Placements matching filtered companies or having student roll with matching grad year
    const filteredPlacements = allPlacements.filter(p => {
      if (p.company && companyNames.has(p.company.toLowerCase())) return true;
      const student = allStudents.find(s => s.rollNumber === p.id);
      if (student && student.btechYop === gradYear) return true;
      return false;
    });

    // 5. Filter Students
    // Students whose btechYop is gradYear, OR who have submitted a form, OR who are placed
    const submittedStudentRolls = new Set(filteredSubmissions.map(s => s.roll));
    const placedStudentRolls = new Set(filteredPlacements.map(p => p.id));
    const filteredStudents = allStudents.filter(s => {
      if (s.btechYop === gradYear) return true;
      if (submittedStudentRolls.has(s.rollNumber)) return true;
      if (placedStudentRolls.has(s.rollNumber)) return true;
      return false;
    });

    // 6. Filter Notifications
    const studentRolls = new Set(filteredStudents.map(s => s.rollNumber));
    const filteredNotifications = allNotifications.filter(n => {
      if (n.rollNumber && studentRolls.has(n.rollNumber)) return true;
      if (n.company && companyNames.has(n.company.toLowerCase())) return true;
      return false;
    });

    // Create folder server/archives/<year>
    const yearDir = path.join(__dirname, 'archives', targetYear);
    if (!fs.existsSync(yearDir)) {
      fs.mkdirSync(yearDir, { recursive: true });
    }

    // Save to individual files
    fs.writeFileSync(path.join(yearDir, 'students.json'), JSON.stringify(filteredStudents, null, 2), 'utf8');
    fs.writeFileSync(path.join(yearDir, 'companies.json'), JSON.stringify(filteredCompanies, null, 2), 'utf8');
    fs.writeFileSync(path.join(yearDir, 'placements.json'), JSON.stringify(filteredPlacements, null, 2), 'utf8');
    fs.writeFileSync(path.join(yearDir, 'forms.json'), JSON.stringify(filteredForms, null, 2), 'utf8');
    fs.writeFileSync(path.join(yearDir, 'submissions.json'), JSON.stringify(filteredSubmissions, null, 2), 'utf8');
    fs.writeFileSync(path.join(yearDir, 'notifications.json'), JSON.stringify(filteredNotifications, null, 2), 'utf8');

    // Metadata
    const metadata = {
      academicYear: targetYear,
      archivedAt: new Date().toISOString(),
      counts: {
        students: filteredStudents.length,
        companies: filteredCompanies.length,
        placements: filteredPlacements.length,
        forms: filteredForms.length,
        submissions: filteredSubmissions.length,
        notifications: filteredNotifications.length
      }
    };
    fs.writeFileSync(path.join(yearDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

    res.json({ success: true, metadata });
  } catch (err) {
    console.error('Error creating archive:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/archives', authenticateToken, (req, res) => {
  const archivesDir = path.join(__dirname, 'archives');
  if (!fs.existsSync(archivesDir)) {
    return res.json([]);
  }

  try {
    const folders = fs.readdirSync(archivesDir).filter(name => {
      return fs.statSync(path.join(archivesDir, name)).isDirectory();
    });

    const list = folders.map(year => {
      const metadataPath = path.join(archivesDir, year, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      }
      return { academicYear: year, archivedAt: null, counts: {} };
    });

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/archives/:year/download', authenticateToken, (req, res) => {
  const { year } = req.params;
  const yearDir = path.join(__dirname, 'archives', year);
  if (!fs.existsSync(yearDir)) {
    return res.status(404).json({ error: 'Archive not found' });
  }

  try {
    const files = ['students.json', 'companies.json', 'placements.json', 'forms.json', 'submissions.json', 'notifications.json', 'metadata.json'];
    const archiveData = {
      academicYear: year,
      downloadedAt: new Date().toISOString()
    };

    for (const file of files) {
      const filePath = path.join(yearDir, file);
      if (fs.existsSync(filePath)) {
        const key = file.replace('.json', '');
        archiveData[key] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="placepro-archive-${year}.json"`);
    res.json(archiveData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an archived academic year permanently
app.delete('/api/admin/archives/:year', authenticateToken, (req, res) => {
  const { year } = req.params;
  const yearDir = path.join(__dirname, 'archives', year);
  if (!fs.existsSync(yearDir)) {
    return res.status(404).json({ error: 'Archive not found' });
  }

  try {
    fs.rmSync(yearDir, { recursive: true, force: true });
    console.log(`Permanently deleted archive for academic year: ${year}`);
    res.json({ success: true, message: `Archive for ${year} permanently deleted.` });
  } catch (err) {
    console.error('Error deleting archive:', err);
    res.status(500).json({ error: err.message });
  }
});




// POST endpoints (bulk update/sync patterns matching frontend state saves with Access Exclusive locking and backend deduplication)
app.post('/api/master-rows', authenticateToken, async (req, res) => {
  const rows = req.body;
  try {
    await query('BEGIN');
    await query('LOCK TABLE master_students IN ACCESS EXCLUSIVE MODE');
    // Get all EXISTING roll numbers for this academic year to track who gets removed
    const existingStudentsRes = await query('SELECT UPPER(roll_number) as roll FROM master_students WHERE academic_year = $1', [req.academicYear]);
    const oldRolls = existingStudentsRes.rows.map(r => r.roll);

    // Deduplicate incoming rows
    const seenRolls = new Set();
    const uniqueRows = [];
    for (const s of rows) {
      if (!s.rollNumber) continue;
      const roll = s.rollNumber.trim().toUpperCase();
      if (!seenRolls.has(roll)) {
        seenRolls.add(roll);
        uniqueRows.push(s);
      }
    }

    // Find students that have been permanently removed from the master data
    const removedRolls = oldRolls.filter(r => !seenRolls.has(r));
    if (removedRolls.length > 0) {
      // Chunking if the array is huge, though PostgreSQL can handle tens of thousands of IN parameters.
      // But for safety, we delete in batches of 500
      for (let i = 0; i < removedRolls.length; i += 500) {
        const chunk = removedRolls.slice(i, i + 500);
        const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(', ');
        await query(`DELETE FROM users WHERE role = 'student' AND UPPER(associated_id) IN (${placeholders})`, chunk);
        await query(`DELETE FROM user_push_tokens WHERE UPPER(roll_number) IN (${placeholders})`, chunk);
      }
    }

    await query('DELETE FROM master_students WHERE academic_year = $1', [req.academicYear]);

    for (const s of uniqueRows) {
      await query(`
        INSERT INTO master_students (
          roll_number, first_name, last_name, full_name, mail_id, alternate_mail_id, phone_number, alternate_phone_number,
          aadhar_number, gender, country, state, city, branch, date_of_birth, tenth_percentage, tenth_yop, tenth_board,
          twelfth_percentage, twelfth_yop, twelfth_board, college_name, btech_cgpa, btech_yop, active_backlogs, no_of_backlogs,
          academic_year
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
      `, [
        s.rollNumber, s.firstName, s.lastName, s.fullName, s.mailId, s.alternateMailId, s.phoneNumber, s.alternatePhoneNumber,
        s.aadharNumber, s.gender, s.country, s.state, s.city, s.branch, s.dateOfBirth, s.tenthPercentage, s.tenthYop, s.tenthBoard,
        s.twelfthPercentage, s.twelfthYop, s.twelfthBoard, s.collegeName, s.btechCgpa, s.btechYop, s.activeBacklogs, s.noOfBacklogs,
        req.academicYear
      ]);
    }
    await query('COMMIT');
    res.json({ success: true, count: uniqueRows.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/companies', authenticateToken, async (req, res) => {
  const list = req.body;
  try {
    await query('BEGIN');
    await query('LOCK TABLE companies IN ACCESS EXCLUSIVE MODE');
    await query('DELETE FROM companies WHERE academic_year = $1', [req.academicYear]);
    
    // Deduplicate companies
    const seenComps = new Set();
    const uniqueList = [];
    for (const c of list) {
      if (!c.id) continue;
      const id = c.id.trim().toUpperCase();
      if (!seenComps.has(id)) {
        seenComps.add(id);
        uniqueList.push(c);
      }
    }

    for (const c of uniqueList) {
      await query(`
        INSERT INTO companies (id, name, sector, type, location, drives, hires, package, status, mode, job_type, academic_year, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        c.id, c.name, c.sector, c.type, c.location, c.drives, c.hires, c.package, c.status, c.mode, c.jobType, req.academicYear, c.remarks
      ]);
    }
    await query('COMMIT');
    res.json({ success: true, count: uniqueList.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/placements', authenticateToken, async (req, res) => {
  const list = req.body;
  try {
    await query('BEGIN');
    await query('LOCK TABLE placements IN ACCESS EXCLUSIVE MODE');
    await query('DELETE FROM placements WHERE academic_year = $1', [req.academicYear]);
    
    // Deduplicate placements
    const seenPlacements = new Set();
    const uniqueList = [];
    for (const p of list) {
      if (!p.id || !p.company) continue;
      const key = `${p.id.trim()}::${p.company.trim()}`.toUpperCase();
      if (!seenPlacements.has(key)) {
        seenPlacements.add(key);
        uniqueList.push(p);
      }
    }

    for (const p of uniqueList) {
      await query(`
        INSERT INTO placements (id, student, branch, company, role, package, date, type, email, phone, academic_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        p.id, p.student, p.branch, p.company, p.role, p.package, p.date, p.type, p.email, p.phone, req.academicYear
      ]);
    }
    await query('COMMIT');
    res.json({ success: true, count: uniqueList.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/placement-forms', authenticateToken, async (req, res) => {
  const list = req.body;
  try {
    await query('BEGIN');
    await query('LOCK TABLE placement_forms IN ACCESS EXCLUSIVE MODE');

    // 1. Fetch current form IDs and statuses before changes
    const currentFormsResult = await query(
      'SELECT id, status FROM placement_forms WHERE academic_year = $1',
      [req.academicYear]
    );
    const existingStatusMap = new Map(
      currentFormsResult.rows.map(r => [r.id.trim().toUpperCase(), r.status])
    );

    await query('DELETE FROM placement_forms WHERE academic_year = $1', [req.academicYear]);
    
    // Deduplicate forms
    const seenForms = new Set();
    const uniqueList = [];
    for (const f of list) {
      if (!f.id) continue;
      const id = f.id.trim().toUpperCase();
      if (!seenForms.has(id)) {
        seenForms.add(id);
        uniqueList.push(f);
      }
    }

    for (const f of uniqueList) {
      await query(`
        INSERT INTO placement_forms (
          id, name, type, status, created, start_date, start_time, end_date, end_time, total, fields,
          has_company_drive, company_name, company_sector, company_category, company_location,
          company_drive_mode, company_job_type, company_pkg_min, company_pkg_max, company_min_cgpa, company_max_backlogs, company_academic_year, company_remarks,
          academic_year
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      `, [
        f.id, f.name, f.type, f.status || 'Draft', f.created, f.startDate || null, f.startTime || null, f.endDate || null, f.endTime || null, f.total, JSON.stringify(f.fields),
        f.hasCompanyDrive || false, f.companyName || '', f.companySector || '', f.companyCategory || '', f.companyLocation || '',
        f.companyDriveMode || '', f.companyJobType || '', f.companyPkgMin || '', f.companyPkgMax || '', f.companyMinCgpa || '', f.companyMaxBacklogs || '', f.companyAcademicYear || '', f.companyRemarks || '',
        req.academicYear
      ]);
    }

    // 2. Identify newly active forms (either brand new and active, or transitioned from Draft/Inactive to Active)
    const newActiveForms = uniqueList.filter(f => {
      if (f.status !== 'Active') return false;
      const prevStatus = existingStatusMap.get(f.id.trim().toUpperCase());
      return prevStatus !== 'Active';
    });

    if (newActiveForms.length > 0) {
      // Fetch students for notification
      const studentsResult = await query(
        'SELECT DISTINCT roll_number, full_name, first_name, last_name FROM master_students WHERE academic_year = $1',
        [req.academicYear]
      );

      // Fetch coordinators for notification
      const coordinatorsResult = await query(
        "SELECT username, name FROM users WHERE role = 'coordinator'"
      );

      for (const form of newActiveForms) {
        // Check if a notification for this form already exists across the year
        const formCheck = await query(
          'SELECT id FROM placement_notifications WHERE academic_year = $1 AND package = $2 LIMIT 1',
          [req.academicYear, form.id]
        );
        if (formCheck.rows.length > 0) {
          continue; // Skip creating duplicate notifications if already broadcasted
        }

        // Insert for students
        for (const student of studentsResult.rows) {
          const notifId = `PNOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${student.roll_number}`;
          const name = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.roll_number;
          await query(`
            INSERT INTO placement_notifications (
              id, roll_number, student_name, company, role, package, date, type, created_at, read, academic_year
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO NOTHING
          `, [
            notifId,
            student.roll_number.trim().toUpperCase(),
            name,
            form.name,
            'New registration form published by Admin. Please fill out before the deadline.',
            form.id,
            new Date().toISOString().split('T')[0],
            'announcement',
            new Date().toISOString(),
            false,
            req.academicYear
          ]);
        }

        // Insert for coordinators
        for (const coordinator of coordinatorsResult.rows) {
          const notifId = `PNOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-COORD`;
          await query(`
            INSERT INTO placement_notifications (
              id, roll_number, student_name, company, role, package, date, type, created_at, read, academic_year
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO NOTHING
          `, [
            notifId,
            coordinator.username.trim().toUpperCase(),
            coordinator.name,
            form.name,
            'New registration form published by Admin. Please notify students and monitor submissions.',
            form.id,
            new Date().toISOString().split('T')[0],
            'info',
            new Date().toISOString(),
            false,
            req.academicYear
          ]);
        }

        // Trigger Mobile Push Notification via Expo
        const studentRolls = studentsResult.rows.map(s => s.roll_number);
        const title = `🚀 PlaceGO! Alert: ${form.hasCompanyDrive ? 'New Company Drive' : 'New Survey Form'}`;
        const body = `${form.companyName || form.name} has been published. Tap to view and apply before the deadline!`;
        sendExpoPushNotifications(studentRolls, title, body, { formId: form.id, type: form.hasCompanyDrive ? 'drive' : 'survey' });
      }
    }

    await query('COMMIT');
    res.json({ success: true, count: uniqueList.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/form-submissions', authenticateToken, async (req, res) => {
  const list = req.body;
  try {
    await query('BEGIN');
    await query('LOCK TABLE form_submissions IN ACCESS EXCLUSIVE MODE');
    await query('DELETE FROM form_submissions WHERE academic_year = $1', [req.academicYear]);
    
    // Deduplicate submissions
    const seenSubs = new Set();
    const uniqueList = [];
    for (const s of list) {
      if (!s.id) continue;
      const id = s.id.trim().toUpperCase();
      if (!seenSubs.has(id)) {
        seenSubs.add(id);
        uniqueList.push(s);
      }
    }

    for (const s of uniqueList) {
      await query(`
        INSERT INTO form_submissions (id, form_id, roll, name, submitted_at, status, values, academic_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        s.id, s.formId, s.roll, s.name, s.submittedAt, s.status, JSON.stringify(s.values), req.academicYear
      ]);
    }
    await query('COMMIT');
    res.json({ success: true, count: uniqueList.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// Single form submission endpoint (creates or updates ONE submission safely without deleting other submissions)
app.post('/api/form-submissions/single', authenticateToken, async (req, res) => {
  const s = req.body;
  if (!s || !s.formId || !s.roll) {
    return res.status(400).json({ error: 'Missing required fields: formId and roll' });
  }
  const cleanRoll = String(s.roll).trim().toUpperCase();
  const cleanFormId = String(s.formId).trim();
  const status = s.status || 'Pending';
  const submittedAt = s.submittedAt || new Date().toISOString().replace('T', ' ').substring(0, 16);

  try {
    await query('BEGIN');
    const targetYear = s.academicYear || req.academicYear;
    const check = await query(
      'SELECT * FROM form_submissions WHERE form_id = $1 AND UPPER(roll) = $2',
      [cleanFormId, cleanRoll]
    );

    if (check.rows.length > 0) {
      // Update existing submission for this student + form
      await query(`
        UPDATE form_submissions
        SET name = $1, submitted_at = $2, status = $3, values = $4, academic_year = $5
        WHERE form_id = $6 AND UPPER(roll) = $7
      `, [s.name || cleanRoll, submittedAt, status, JSON.stringify(s.values || {}), targetYear, cleanFormId, cleanRoll]);
    } else {
      // Insert new single submission
      const subId = s.id || ('SUB-' + Date.now());
      await query(`
        INSERT INTO form_submissions (id, form_id, roll, name, submitted_at, status, values, academic_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [subId, cleanFormId, cleanRoll, s.name || cleanRoll, submittedAt, status, JSON.stringify(s.values || {}), targetYear]);
    }
    await query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/placement-notifications', authenticateToken, async (req, res) => {
  const list = req.body;
  try {
    await query('BEGIN');
    
    // Deduplicate notifications
    const seenNotifs = new Set();
    const uniqueList = [];
    for (const n of list) {
      if (!n.id) continue;
      const id = n.id.trim().toUpperCase();
      if (!seenNotifs.has(id)) {
        seenNotifs.add(id);
        uniqueList.push(n);
      }
    }

    for (const n of uniqueList) {
      await query(`
        INSERT INTO placement_notifications (id, roll_number, student_name, company, role, package, date, type, created_at, read, academic_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          roll_number = EXCLUDED.roll_number,
          student_name = EXCLUDED.student_name,
          company = EXCLUDED.company,
          role = EXCLUDED.role,
          package = EXCLUDED.package,
          date = EXCLUDED.date,
          type = EXCLUDED.type,
          created_at = EXCLUDED.created_at,
          read = EXCLUDED.read,
          academic_year = EXCLUDED.academic_year
      `, [
        n.id, n.rollNumber, n.studentName, n.company, n.role, n.package, n.date, n.type, n.createdAt, n.read, req.academicYear
      ]);
    }
    await query('COMMIT');

    // Trigger push notification to targeted students or all students if broadcast
    const targetRolls = uniqueList.map(n => n.rollNumber).filter(Boolean);
    if (targetRolls.length > 0) {
      const latest = uniqueList[uniqueList.length - 1];
      sendExpoPushNotifications(targetRolls, `📢 PlaceGO! Announcement: ${latest.company || 'New Alert'}`, latest.role || 'You have a new placement notification.', { notifId: latest.id });
    }

    res.json({ success: true, count: uniqueList.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ─── Career Learning Hub API Endpoints ────────────────

// GET all career roadmaps
app.get('/api/career/roadmaps', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT id, title, description, icon, color, download_count FROM career_roadmaps');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET specific career roadmap details
app.get('/api/career/roadmaps/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM career_roadmaps WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST to increment download count for a roadmap
app.post('/api/career/roadmaps/:id/download', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await query('UPDATE career_roadmaps SET download_count = download_count + 1 WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST to download compiled PDF file with exact headers
app.post('/api/career/roadmaps/download-file', authenticateToken, (req, res) => {
  const { pdfBase64, filename } = req.body;
  if (!pdfBase64 || !filename) {
    return res.status(400).json({ error: 'Missing pdfBase64 or filename' });
  }
  
  try {
    const buffer = Buffer.from(pdfBase64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '\\"')}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET student's progress across all roadmaps
app.get('/api/career/progress/:rollNumber?', authenticateToken, async (req, res) => {
  let rollNumber = req.params.rollNumber;
  if (!rollNumber) {
    rollNumber = req.user.rollNumber || req.user.associated_id || req.user.email;
  }
  if (!rollNumber) {
    return res.status(400).json({ error: 'Roll number is required' });
  }
  try {
    const result = await query(
      'SELECT roadmap_id, completed_skills, current_skill FROM student_career_progress WHERE roll_number = $1',
      [String(rollNumber).trim().toUpperCase()]
    );
    
    // Format to { [roadmapId]: completedSkills[] }
    const progressMap = {};
    result.rows.forEach(row => {
      let skills = [];
      try {
        skills = typeof row.completed_skills === 'string' 
          ? JSON.parse(row.completed_skills) 
          : (row.completed_skills || []);
      } catch (e) {
        skills = [];
      }
      progressMap[row.roadmap_id] = skills;
    });
    
    res.json(progressMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST to update/save student progress
app.post('/api/career/progress', authenticateToken, async (req, res) => {
  let { rollNumber, roadmapId, completedSkills, currentSkill, skillId, completed } = req.body;
  
  if (!rollNumber) {
    rollNumber = req.user.rollNumber || req.user.associated_id || req.user.email;
  }
  if (!rollNumber || !roadmapId) {
    return res.status(400).json({ error: 'rollNumber and roadmapId are required' });
  }

  const roll = String(rollNumber).trim().toUpperCase();

  try {
    // If sent from mobile app with single skill toggle (skillId + completed)
    if (skillId !== undefined && completed !== undefined) {
      const existing = await query(
        'SELECT completed_skills FROM student_career_progress WHERE roll_number = $1 AND roadmap_id = $2',
        [roll, roadmapId]
      );
      
      let currentSkills = [];
      if (existing.rows.length > 0) {
        try {
          const raw = existing.rows[0].completed_skills;
          currentSkills = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
        } catch (e) {
          currentSkills = [];
        }
      }
      
      if (completed) {
        if (!currentSkills.includes(skillId)) {
          currentSkills.push(skillId);
        }
      } else {
        currentSkills = currentSkills.filter(s => s !== skillId);
      }
      
      completedSkills = currentSkills;
    }

    const skillsJson = JSON.stringify(completedSkills || []);
    
    await query(`
      INSERT INTO student_career_progress (roll_number, roadmap_id, completed_skills, current_skill, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (roll_number, roadmap_id)
      DO UPDATE SET completed_skills = $3, current_skill = $4, updated_at = NOW()
    `, [roll, roadmapId, skillsJson, currentSkill || null]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET learning resources for a skill
app.get('/api/career/resources/:roadmapId/:skillId', authenticateToken, async (req, res) => {
  const { roadmapId, skillId } = req.params;
  try {
    const result = await query(
      'SELECT * FROM learning_resources WHERE roadmap_id = $1 AND skill_id = $2',
      [roadmapId, skillId]
    );
    if (result.rows.length === 0) {
      return res.json({ docs: [], videos: [], practice_sites: [], notes: '', mini_projects: [] });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// GET analytics trends across all years
app.get('/api/analytics/trends', authenticateToken, async (req, res) => {
  try {
    const yearsRes = await query('SELECT * FROM academic_years ORDER BY academic_year');
    const years = yearsRes.rows;

    const trends = [];

    for (const yearRow of years) {
      const year = yearRow.academic_year;
      const studentsRes = await query('SELECT * FROM master_students WHERE academic_year = $1', [year]);
      const placementsRes = await query('SELECT * FROM placements WHERE academic_year = $1', [year]);
      const companiesRes = await query('SELECT * FROM companies WHERE academic_year = $1', [year]);

      let highestPackage = 0;
      let totalPackageSum = 0;
      let packageCount = 0;

      // Branch-wise breakdown
      const branchMap = {};

      placementsRes.rows.forEach(p => {
        const numericLpa = parsePackageToLpa(p.package);
        if (numericLpa !== null) {
          if (numericLpa > highestPackage) highestPackage = numericLpa;
          totalPackageSum += numericLpa;
          packageCount++;
        }
        const branch = p.branch || 'Other';
        branchMap[branch] = (branchMap[branch] || 0) + 1;
      });

      // Company-wise hires
      const companyHires = {};
      placementsRes.rows.forEach(p => {
        const company = p.company || 'Unknown';
        companyHires[company] = (companyHires[company] || 0) + 1;
      });

      trends.push({
        year,
        year,
        status: yearRow.status,
        totalStudents: studentsRes.rows.length,
        totalPlaced: placementsRes.rows.length,
        totalCompanies: companiesRes.rows.length,
        placementPercentage: studentsRes.rows.length > 0 ? Math.round((placementsRes.rows.length / studentsRes.rows.length) * 100) : 0,
        highestPackage,
        avgPackage: packageCount > 0 ? Math.round((totalPackageSum / packageCount) * 10) / 10 : 0,
        branchWise: branchMap,
        topRecruiters: Object.entries(companyHires).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, hires]) => ({ name, hires })),
      });
    }

    res.json(trends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Academic Year Archive API Endpoints ────────────────

app.post('/api/admin/archive', authenticateToken, async (req, res) => {
  const { academicYear } = req.body;
  if (!academicYear) {
    return res.status(400).json({ error: 'Academic year is required' });
  }

  try {
    // Fetch all rows
    const studentsRes = await query('SELECT * FROM master_students');
    const companiesRes = await query('SELECT * FROM companies');
    const placementsRes = await query('SELECT * FROM placements');
    const formsRes = await query('SELECT * FROM placement_forms');
    const submissionsRes = await query('SELECT * FROM form_submissions');
    const notificationsRes = await query('SELECT * FROM placement_notifications');

    const allStudents = studentsRes.rows.map(mapStudentToFrontend);
    const allCompanies = companiesRes.rows.map(mapCompanyToFrontend);
    const allPlacements = placementsRes.rows.map(mapPlacementToFrontend);
    const allForms = formsRes.rows.map(mapFormToFrontend);
    const allSubmissions = submissionsRes.rows.map(mapSubmissionToFrontend);
    const allNotifications = notificationsRes.rows.map(mapNotificationToFrontend);

    // Filter logic
    const targetYear = academicYear.trim(); // e.g. "2026-2027"
    const gradYear = targetYear.split('-')[1] || ''; // e.g. "2027"

    // 1. Filter Companies
    const filteredCompanies = allCompanies.filter(c => c.academicYear === targetYear);
    const companyNames = new Set(filteredCompanies.map(c => c.name.toLowerCase()));

    // 2. Filter Forms
    const filteredForms = allForms.filter(f => f.companyAcademicYear === targetYear);
    const formIds = new Set(filteredForms.map(f => f.id));

    // 3. Filter Submissions
    const filteredSubmissions = allSubmissions.filter(s => formIds.has(s.formId));

    // 4. Filter Placements
    // Placements matching filtered companies or having student roll with matching grad year
    const filteredPlacements = allPlacements.filter(p => {
      if (p.company && companyNames.has(p.company.toLowerCase())) return true;
      const student = allStudents.find(s => s.rollNumber === p.id);
      if (student && student.btechYop === gradYear) return true;
      return false;
    });

    // 5. Filter Students
    // Students whose btechYop is gradYear, OR who have submitted a form, OR who are placed
    const submittedStudentRolls = new Set(filteredSubmissions.map(s => s.roll));
    const placedStudentRolls = new Set(filteredPlacements.map(p => p.id));
    const filteredStudents = allStudents.filter(s => {
      if (s.btechYop === gradYear) return true;
      if (submittedStudentRolls.has(s.rollNumber)) return true;
      if (placedStudentRolls.has(s.rollNumber)) return true;
      return false;
    });

    // 6. Filter Notifications
    const studentRolls = new Set(filteredStudents.map(s => s.rollNumber));
    const filteredNotifications = allNotifications.filter(n => {
      if (n.rollNumber && studentRolls.has(n.rollNumber)) return true;
      if (n.company && companyNames.has(n.company.toLowerCase())) return true;
      return false;
    });

    // Create folder server/archives/<year>
    const yearDir = path.join(__dirname, 'archives', targetYear);
    if (!fs.existsSync(yearDir)) {
      fs.mkdirSync(yearDir, { recursive: true });
    }

    // Save to individual files
    fs.writeFileSync(path.join(yearDir, 'students.json'), JSON.stringify(filteredStudents, null, 2), 'utf8');
    fs.writeFileSync(path.join(yearDir, 'companies.json'), JSON.stringify(filteredCompanies, null, 2), 'utf8');
    fs.writeFileSync(path.join(yearDir, 'placements.json'), JSON.stringify(filteredPlacements, null, 2), 'utf8');
    fs.writeFileSync(path.join(yearDir, 'forms.json'), JSON.stringify(filteredForms, null, 2), 'utf8');
    fs.writeFileSync(path.join(yearDir, 'submissions.json'), JSON.stringify(filteredSubmissions, null, 2), 'utf8');
    fs.writeFileSync(path.join(yearDir, 'notifications.json'), JSON.stringify(filteredNotifications, null, 2), 'utf8');

    // Metadata
    const metadata = {
      academicYear: targetYear,
      archivedAt: new Date().toISOString(),
      counts: {
        students: filteredStudents.length,
        companies: filteredCompanies.length,
        placements: filteredPlacements.length,
        forms: filteredForms.length,
        submissions: filteredSubmissions.length,
        notifications: filteredNotifications.length
      }
    };
    fs.writeFileSync(path.join(yearDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

    res.json({ success: true, metadata });
  } catch (err) {
    console.error('Error creating archive:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/archives', authenticateToken, (req, res) => {
  const archivesDir = path.join(__dirname, 'archives');
  if (!fs.existsSync(archivesDir)) {
    return res.json([]);
  }

  try {
    const folders = fs.readdirSync(archivesDir).filter(name => {
      return fs.statSync(path.join(archivesDir, name)).isDirectory();
    });

    const list = folders.map(year => {
      const metadataPath = path.join(archivesDir, year, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      }
      return { academicYear: year, archivedAt: null, counts: {} };
    });

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/archives/:year/download', authenticateToken, (req, res) => {
  const { year } = req.params;
  const yearDir = path.join(__dirname, 'archives', year);
  if (!fs.existsSync(yearDir)) {
    return res.status(404).json({ error: 'Archive not found' });
  }

  try {
    const files = ['students.json', 'companies.json', 'placements.json', 'forms.json', 'submissions.json', 'notifications.json', 'metadata.json'];
    const archiveData = {
      academicYear: year,
      downloadedAt: new Date().toISOString()
    };

    for (const file of files) {
      const filePath = path.join(yearDir, file);
      if (fs.existsSync(filePath)) {
        const key = file.replace('.json', '');
        archiveData[key] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="placepro-archive-${year}.json"`);
    res.json(archiveData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an archived academic year permanently
app.delete('/api/admin/archives/:year', authenticateToken, (req, res) => {
  const { year } = req.params;
  const yearDir = path.join(__dirname, 'archives', year);
  if (!fs.existsSync(yearDir)) {
    return res.status(404).json({ error: 'Archive not found' });
  }

  try {
    fs.rmSync(yearDir, { recursive: true, force: true });
    console.log(`Permanently deleted archive for academic year: ${year}`);
    res.json({ success: true, message: `Archive for ${year} permanently deleted.` });
  } catch (err) {
    console.error('Error deleting archive:', err);
    res.status(500).json({ error: err.message });
  }
});




// POST endpoints (bulk update/sync patterns matching frontend state saves with Access Exclusive locking and backend deduplication)
app.post('/api/master-rows', authenticateToken, async (req, res) => {
  const rows = req.body;
  try {
    await query('BEGIN');
    await query('LOCK TABLE master_students IN ACCESS EXCLUSIVE MODE');
    await query('DELETE FROM master_students WHERE academic_year = $1', [req.academicYear]);
    
    // Deduplicate incoming rows
    const seenRolls = new Set();
    const uniqueRows = [];
    for (const s of rows) {
      if (!s.rollNumber) continue;
      const roll = s.rollNumber.trim().toUpperCase();
      if (!seenRolls.has(roll)) {
        seenRolls.add(roll);
        uniqueRows.push(s);
      }
    }

    for (const s of uniqueRows) {
      await query(`
        INSERT INTO master_students (
          roll_number, first_name, last_name, full_name, mail_id, alternate_mail_id, phone_number, alternate_phone_number,
          aadhar_number, gender, country, state, city, branch, date_of_birth, tenth_percentage, tenth_yop, tenth_board,
          twelfth_percentage, twelfth_yop, twelfth_board, college_name, btech_cgpa, btech_yop, active_backlogs, no_of_backlogs,
          academic_year
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
      `, [
        s.rollNumber, s.firstName, s.lastName, s.fullName, s.mailId, s.alternateMailId, s.phoneNumber, s.alternatePhoneNumber,
        s.aadharNumber, s.gender, s.country, s.state, s.city, s.branch, s.dateOfBirth, s.tenthPercentage, s.tenthYop, s.tenthBoard,
        s.twelfthPercentage, s.twelfthYop, s.twelfthBoard, s.collegeName, s.btechCgpa, s.btechYop, s.activeBacklogs, s.noOfBacklogs,
        req.academicYear
      ]);
    }
    await query('COMMIT');
    res.json({ success: true, count: uniqueRows.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/companies', authenticateToken, async (req, res) => {
  const list = req.body;
  try {
    await query('BEGIN');
    await query('LOCK TABLE companies IN ACCESS EXCLUSIVE MODE');
    await query('DELETE FROM companies WHERE academic_year = $1', [req.academicYear]);
    
    // Deduplicate companies
    const seenComps = new Set();
    const uniqueList = [];
    for (const c of list) {
      if (!c.id) continue;
      const id = c.id.trim().toUpperCase();
      if (!seenComps.has(id)) {
        seenComps.add(id);
        uniqueList.push(c);
      }
    }

    for (const c of uniqueList) {
      await query(`
        INSERT INTO companies (id, name, sector, type, location, drives, hires, package, status, mode, job_type, academic_year, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        c.id, c.name, c.sector, c.type, c.location, c.drives, c.hires, c.package, c.status, c.mode, c.jobType, req.academicYear, c.remarks
      ]);
    }
    await query('COMMIT');
    res.json({ success: true, count: uniqueList.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/placements', authenticateToken, async (req, res) => {
  const list = req.body;
  try {
    await query('BEGIN');
    await query('LOCK TABLE placements IN ACCESS EXCLUSIVE MODE');
    await query('DELETE FROM placements WHERE academic_year = $1', [req.academicYear]);
    
    // Deduplicate placements
    const seenPlacements = new Set();
    const uniqueList = [];
    for (const p of list) {
      if (!p.id || !p.company) continue;
      const key = `${p.id.trim()}::${p.company.trim()}`.toUpperCase();
      if (!seenPlacements.has(key)) {
        seenPlacements.add(key);
        uniqueList.push(p);
      }
    }

    for (const p of uniqueList) {
      await query(`
        INSERT INTO placements (id, student, branch, company, role, package, date, type, email, phone, academic_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        p.id, p.student, p.branch, p.company, p.role, p.package, p.date, p.type, p.email, p.phone, req.academicYear

      ]);
    }
    await query('COMMIT');
    res.json({ success: true, count: uniqueList.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ─── Push Notification Management (Mobile App Integration) ────────────────

// Helper: Send push notifications via Expo Push API
async function sendExpoPushNotifications(rollNumbers, title, body, data = {}) {
  try {
    if (!rollNumbers || rollNumbers.length === 0) return;
    const tokensRes = await query(
      'SELECT roll_number, push_token FROM user_push_tokens WHERE UPPER(roll_number) = ANY($1::text[])',
      [rollNumbers.map(r => String(r).trim().toUpperCase())]
    );

    if (tokensRes.rows.length === 0) return;

    const messages = [];
    for (const row of tokensRes.rows) {
      const token = row.push_token;
      if (!token || (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken['))) {
        continue;
      }
      messages.push({
        to: token,
        sound: 'default',
        title: title || 'PlaceGO! Alert',
        body: body || '',
        data: { ...data, timestamp: Date.now() },
        priority: 'high',
      });
    }

    if (messages.length === 0) return;

    // Send chunks to Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const result = await response.json();
    console.log(`Sent ${messages.length} mobile push notifications via Expo:`, JSON.stringify(result));
  } catch (err) {
    console.error('Error sending Expo push notifications:', err.message);
  }
}

// POST register or update student push token
app.post('/api/auth/register-push-token', authenticateToken, async (req, res) => {
  const { pushToken } = req.body;
  if (!pushToken) {
    return res.status(400).json({ error: 'pushToken is required' });
  }

  const rollNumber = req.user.rollNumber || req.user.associated_id || req.user.email;
  if (!rollNumber) {
    return res.status(400).json({ error: 'Valid student roll number not found in session' });
  }

  try {
    await query(`
      INSERT INTO user_push_tokens (roll_number, push_token, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (roll_number) DO UPDATE
      SET push_token = EXCLUDED.push_token, updated_at = CURRENT_TIMESTAMP
    `, [String(rollNumber).trim().toUpperCase(), String(pushToken).trim()]);

    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST unregister push token (delete)
app.post('/api/auth/unregister-push-token', authenticateToken, async (req, res) => {
  const rollNumber = req.user.rollNumber || req.user.associated_id || req.user.email;
  if (!rollNumber) {
    return res.status(400).json({ error: 'Valid student roll number not found in session' });
  }

  try {
    await query(
      'DELETE FROM user_push_tokens WHERE UPPER(roll_number) = $1',
      [String(rollNumber).trim().toUpperCase()]
    );
    res.json({ success: true, message: 'Push token unregistered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Setup DB and Boot Server

// POST reset 2FA for students
app.post('/api/admin/reset-2fa', authenticateToken, async (req, res) => {
  const { rollNumbers } = req.body;
  if (!rollNumbers || !Array.isArray(rollNumbers)) {
    return res.status(400).json({ error: 'rollNumbers array is required' });
  }

  try {
    for (const roll of rollNumbers) {
      await query("DELETE FROM users WHERE role = 'student' AND UPPER(associated_id) = UPPER($1)", [roll.trim()]);
    }
    res.json({ success: true, message: 'Reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function main() {
  try {
    await setupDatabase();
    await refreshActiveYear();
    console.log('Active academic year:', cachedActiveYear);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Express server listening on 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server due to database issue:', err);
    process.exit(1);
  }
}

main();
