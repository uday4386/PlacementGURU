import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query, setupDatabase } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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
  companyAcademicYear: row.company_academic_year,
  companyRemarks: row.company_remarks,
});

const mapSubmissionToFrontend = (row) => ({
  id: row.id,
  formId: row.form_id,
  roll: row.roll,
  name: row.name,
  submittedAt: row.submitted_at,
  status: row.status,
  values: row.values,
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
});

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
    next();
  });
}

// GET public statistics endpoint (no authentication required)
app.get('/api/public-stats', async (req, res) => {
  try {
    const studentsRes = await query('SELECT COUNT(*) FROM master_students');
    const companiesRes = await query('SELECT COUNT(*) FROM companies');
    const placementsRes = await query('SELECT COUNT(*) FROM placements');
    const drivesRes = await query('SELECT SUM(drives) FROM companies');

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
    }

    const session = {
      role,
      email: username,
      name,
      department,
      rollNumber
    };

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

// POST student forgot password endpoint
app.post('/api/auth/student-forgot-password', async (req, res) => {
  const { rollNumber, email, dateOfBirth, newPassword } = req.body;

  if (!rollNumber || !email || !dateOfBirth || !newPassword) {
    return res.status(400).json({ error: 'All fields (Roll Number, Email, DOB, New Password) are required' });
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
    const result = await query('SELECT * FROM master_students');
    res.json(result.rows.map(mapStudentToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/placement-forms', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM placement_forms');
    res.json(result.rows.map(mapFormToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/form-submissions', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM form_submissions');
    res.json(result.rows.map(mapSubmissionToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/companies', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM companies');
    res.json(result.rows.map(mapCompanyToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/placements', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM placements');
    res.json(result.rows.map(mapPlacementToFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/placement-notifications', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM placement_notifications');
    res.json(result.rows.map(mapNotificationToFrontend));
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
    await query('DELETE FROM master_students');
    
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
          twelfth_percentage, twelfth_yop, twelfth_board, college_name, btech_cgpa, btech_yop, active_backlogs, no_of_backlogs
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      `, [
        s.rollNumber, s.firstName, s.lastName, s.fullName, s.mailId, s.alternateMailId, s.phoneNumber, s.alternatePhoneNumber,
        s.aadharNumber, s.gender, s.country, s.state, s.city, s.branch, s.dateOfBirth, s.tenthPercentage, s.tenthYop, s.tenthBoard,
        s.twelfthPercentage, s.twelfthYop, s.twelfthBoard, s.collegeName, s.btechCgpa, s.btechYop, s.activeBacklogs, s.noOfBacklogs
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
    await query('DELETE FROM companies');
    
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
        c.id, c.name, c.sector, c.type, c.location, c.drives, c.hires, c.package, c.status, c.mode, c.jobType, c.academicYear, c.remarks
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
    await query('DELETE FROM placements');
    
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
        INSERT INTO placements (id, student, branch, company, role, package, date, type, email, phone)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        p.id, p.student, p.branch, p.company, p.role, p.package, p.date, p.type, p.email, p.phone
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
    await query('DELETE FROM placement_forms');
    
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
          company_drive_mode, company_job_type, company_pkg_min, company_pkg_max, company_academic_year, company_remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      `, [
        f.id, f.name, f.type, f.status, f.created, f.startDate, f.startTime, f.endDate, f.endTime, f.total, JSON.stringify(f.fields),
        f.hasCompanyDrive || false, f.companyName || '', f.companySector || '', f.companyCategory || '', f.companyLocation || '',
        f.companyDriveMode || '', f.companyJobType || '', f.companyPkgMin || '', f.companyPkgMax || '', f.companyAcademicYear || '', f.companyRemarks || ''
      ]);
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
    await query('DELETE FROM form_submissions');
    
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
        INSERT INTO form_submissions (id, form_id, roll, name, submitted_at, status, values)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        s.id, s.formId, s.roll, s.name, s.submittedAt, s.status, JSON.stringify(s.values)
      ]);
    }
    await query('COMMIT');
    res.json({ success: true, count: uniqueList.length });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/placement-notifications', authenticateToken, async (req, res) => {
  const list = req.body;
  try {
    await query('BEGIN');
    await query('LOCK TABLE placement_notifications IN ACCESS EXCLUSIVE MODE');
    await query('DELETE FROM placement_notifications');
    
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
        INSERT INTO placement_notifications (id, roll_number, student_name, company, role, package, date, type, created_at, read)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        n.id, n.rollNumber, n.studentName, n.company, n.role, n.package, n.date, n.type, n.createdAt, n.read
      ]);
    }
    await query('COMMIT');
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
app.get('/api/career/progress/:rollNumber', authenticateToken, async (req, res) => {
  const { rollNumber } = req.params;
  try {
    const result = await query(
      'SELECT roadmap_id, completed_skills, current_skill FROM student_career_progress WHERE roll_number = $1',
      [rollNumber]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST to update/save student progress
app.post('/api/career/progress', authenticateToken, async (req, res) => {
  const { rollNumber, roadmapId, completedSkills, currentSkill } = req.body;
  if (!rollNumber || !roadmapId) {
    return res.status(400).json({ error: 'rollNumber and roadmapId are required' });
  }
  try {
    await query(`
      INSERT INTO student_career_progress (roll_number, roadmap_id, completed_skills, current_skill, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (roll_number, roadmap_id)
      DO UPDATE SET completed_skills = $3, current_skill = $4, updated_at = NOW()
    `, [rollNumber, roadmapId, JSON.stringify(completedSkills || []), currentSkill || null]);
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

// Setup DB and Boot Server
async function main() {
  try {
    await setupDatabase();
    app.listen(PORT, () => {
      console.log(`Express server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server due to database issue:', err);
    process.exit(1);
  }
}

main();
