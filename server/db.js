import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'mock_db.json');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/placepro';

let pool;
export let useMock = false;

// Mock database store
let db = {
  master_students: [],
  placement_forms: [],
  form_submissions: [],
  companies: [],
  placements: [],
  placement_notifications: [],
  users: [],
  career_roadmaps: [],
  student_career_progress: [],
  learning_resources: []
};

// Load existing data if file exists
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading mock_db.json, using clean DB', err);
  }
}

const saveDb = () => {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
};

// Query Router
export const query = async (text, params) => {
  if (useMock) {
    return runMockQuery(text, params);
  }
  return pool.query(text, params);
};

export async function setupDatabase() {
  const targetDb = 'placepro';
  
  // Create base connection string pointing to the default postgres database
  let baseConnectionString = connectionString;
  if (connectionString.endsWith('/' + targetDb)) {
    baseConnectionString = connectionString.substring(0, connectionString.lastIndexOf('/' + targetDb)) + '/postgres';
  } else if (connectionString.endsWith('/' + targetDb + '?')) {
    const idx = connectionString.lastIndexOf('/' + targetDb + '?');
    baseConnectionString = connectionString.substring(0, idx) + '/postgres' + connectionString.substring(idx + targetDb.length + 1);
  }

  console.log('Verifying PostgreSQL connection and database existence...');
  const pgClient = new pg.Client({ connectionString: baseConnectionString });
  
  try {
    await pgClient.connect();
    
    try {
      const dbCheck = await pgClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDb]);
      if (dbCheck.rows.length === 0) {
        console.log(`Database "${targetDb}" not found. Creating database...`);
        await pgClient.query(`CREATE DATABASE ${targetDb}`);
        console.log(`Database "${targetDb}" created successfully.`);
      } else {
        console.log(`Database "${targetDb}" verified.`);
      }
    } catch (err) {
      console.error('Failed to run base database verification.', err);
      throw err;
    } finally {
      await pgClient.end();
    }

    // Initialize pool for the target database
    pool = new pg.Pool({
      connectionString,
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      password: process.env.PGPASSWORD,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT) : undefined,
      ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    });

    const client = await pool.connect();
    try {
      console.log(`Successfully connected to database "${targetDb}". Setting up schema...`);

      // 1. Master Students table
      await client.query(`
        CREATE TABLE IF NOT EXISTS master_students (
          roll_number VARCHAR(50) PRIMARY KEY,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          full_name VARCHAR(200),
          mail_id VARCHAR(150),
          alternate_mail_id VARCHAR(150),
          phone_number VARCHAR(20),
          alternate_phone_number VARCHAR(20),
          aadhar_number VARCHAR(20),
          gender VARCHAR(20),
          country VARCHAR(50),
          state VARCHAR(50),
          city VARCHAR(50),
          branch VARCHAR(100),
          date_of_birth VARCHAR(50),
          tenth_percentage VARCHAR(20),
          tenth_yop VARCHAR(20),
          tenth_board VARCHAR(100),
          twelfth_percentage VARCHAR(20),
          twelfth_yop VARCHAR(20),
          twelfth_board VARCHAR(100),
          college_name VARCHAR(200),
          btech_cgpa VARCHAR(20),
          btech_yop VARCHAR(20),
          active_backlogs VARCHAR(10),
          no_of_backlogs VARCHAR(10)
        );
      `);

      // 2. Placement Forms table
      await client.query(`
        CREATE TABLE IF NOT EXISTS placement_forms (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(200),
          type VARCHAR(50),
          status VARCHAR(20),
          created VARCHAR(50),
          start_date VARCHAR(50),
          start_time VARCHAR(50),
          end_date VARCHAR(50),
          end_time VARCHAR(50),
          total INT,
          fields JSONB,
          has_company_drive BOOLEAN,
          company_name VARCHAR(200),
          company_sector VARCHAR(100),
          company_category VARCHAR(100),
          company_location VARCHAR(200),
          company_drive_mode VARCHAR(50),
          company_job_type VARCHAR(50),
          company_pkg_min VARCHAR(50),
          company_pkg_max VARCHAR(50),
          company_min_cgpa VARCHAR(50),
          company_max_backlogs VARCHAR(50),
          company_academic_year VARCHAR(50),
          company_remarks TEXT
        );
      `);

      // 3. Form Submissions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS form_submissions (
          id VARCHAR(50) PRIMARY KEY,
          form_id VARCHAR(50),
          roll VARCHAR(50),
          name VARCHAR(200),
          submitted_at VARCHAR(50),
          status VARCHAR(20),
          values JSONB
        );
      `);

      // 4. Companies table
      await client.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(200),
          sector VARCHAR(100),
          type VARCHAR(100),
          location VARCHAR(200),
          drives INT,
          hires INT,
          package VARCHAR(100),
          status VARCHAR(20),
          mode VARCHAR(50),
          job_type VARCHAR(50),
          academic_year VARCHAR(50),
          remarks TEXT
        );
      `);

      // 5. Placements table
      await client.query(`
        CREATE TABLE IF NOT EXISTS placements (
          pkey SERIAL PRIMARY KEY,
          id VARCHAR(100),
          student VARCHAR(255),
          branch VARCHAR(255),
          company VARCHAR(255),
          role VARCHAR(255),
          package VARCHAR(255),
          date VARCHAR(100),
          type VARCHAR(100),
          email VARCHAR(255),
          phone VARCHAR(100)
        );
      `);

      // 6. Placement Notifications table
      await client.query(`
        CREATE TABLE IF NOT EXISTS placement_notifications (
          id VARCHAR(50) PRIMARY KEY,
          roll_number VARCHAR(50),
          student_name VARCHAR(200),
          company VARCHAR(200),
          role VARCHAR(200),
          package VARCHAR(100),
          date VARCHAR(50),
          type VARCHAR(50),
          created_at VARCHAR(50),
          read BOOLEAN
        );
      `);

      // 7. Users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          username VARCHAR(150) PRIMARY KEY,
          password_hash VARCHAR(200) NOT NULL,
          role VARCHAR(50) NOT NULL,
          name VARCHAR(200) NOT NULL,
          associated_id VARCHAR(50)
        );
      `);

      // 8. Career Roadmaps table
      await client.query(`
        CREATE TABLE IF NOT EXISTS career_roadmaps (
          id VARCHAR(50) PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          icon VARCHAR(50),
          color VARCHAR(30),
          pdf_path VARCHAR(500),
          download_count INTEGER DEFAULT 0,
          skills JSONB DEFAULT '[]'
        );
      `);

      // 9. Student Career Progress table
      await client.query(`
        CREATE TABLE IF NOT EXISTS student_career_progress (
          id SERIAL PRIMARY KEY,
          roll_number VARCHAR(50) NOT NULL,
          roadmap_id VARCHAR(50) NOT NULL REFERENCES career_roadmaps(id),
          completed_skills JSONB DEFAULT '[]',
          current_skill VARCHAR(200),
          started_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(roll_number, roadmap_id)
        );
      `);

      // 10. Learning Resources table
      await client.query(`
        CREATE TABLE IF NOT EXISTS learning_resources (
          id SERIAL PRIMARY KEY,
          roadmap_id VARCHAR(50) NOT NULL REFERENCES career_roadmaps(id),
          skill_id VARCHAR(100) NOT NULL,
          docs JSONB DEFAULT '[]',
          videos JSONB DEFAULT '[]',
          practice_sites JSONB DEFAULT '[]',
          notes TEXT,
          mini_projects JSONB DEFAULT '[]'
        );
      `);

      // 11. User Push Tokens table (for mobile app push notifications)
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_push_tokens (
          roll_number VARCHAR(50) PRIMARY KEY,
          push_token TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 12. Academic Years table
      await client.query(`
        CREATE TABLE IF NOT EXISTS academic_years (
          academic_year VARCHAR(50) PRIMARY KEY,
          start_date VARCHAR(50),
          end_date VARCHAR(50),
          status VARCHAR(20),
          is_default BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 13. Master History table
      await client.query(`
        CREATE TABLE IF NOT EXISTS master_history (
          id SERIAL PRIMARY KEY,
          file_name VARCHAR(255),
          upload_date VARCHAR(100),
          records_count INTEGER,
          uploaded_by VARCHAR(150),
          rows JSONB,
          academic_year VARCHAR(50)
        );
      `);

      // Ensure academic_year column exists on all relevant tables
      const tablesWithAcademicYear = [
        'master_students', 'placement_forms', 'form_submissions',
        'companies', 'placements', 'placement_notifications', 'master_history'
      ];
      for (const t of tablesWithAcademicYear) {
        await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50);`).catch(() => {});
      }
      await client.query(`ALTER TABLE placement_forms ADD COLUMN IF NOT EXISTS company_min_cgpa VARCHAR(50);`).catch(() => {});
      await client.query(`ALTER TABLE placement_forms ADD COLUMN IF NOT EXISTS company_max_backlogs VARCHAR(50);`).catch(() => {});

      // Seed default career roadmaps
      const roadmapsRes = await client.query('SELECT COUNT(*) FROM career_roadmaps');
      if (parseInt(roadmapsRes.rows[0].count) === 0) {
        console.log('Seeding initial career roadmaps...');
        const careerRolesSeed = [
          { id: 'frontend', title: 'Frontend Developer', description: 'Build beautiful, interactive user interfaces with modern web technologies.', icon: '🎨', color: '#3b82f6' },
          { id: 'backend', title: 'Backend Developer', description: 'Design robust APIs, manage databases, and build server-side applications.', icon: '⚙️', color: '#10b981' },
          { id: 'fullstack', title: 'Full Stack Developer', description: 'Master both frontend and backend to build complete web applications.', icon: '🚀', color: '#8b5cf6' },
          { id: 'java', title: 'Java Developer', description: 'Build enterprise-grade applications with Java and Spring ecosystem.', icon: '☕', color: '#f97316' },
          { id: 'python', title: 'Python Developer', description: 'Versatile programming with Python for web, automation, and scripting.', icon: '🐍', color: '#3b82f6' },
          { id: 'data-analyst', title: 'Data Analyst', description: 'Extract insights from data using statistical analysis and visualization.', icon: '📊', color: '#06b6d4' },
          { id: 'data-scientist', title: 'Data Scientist', description: 'Apply machine learning and statistical modeling to solve complex problems.', icon: '🔬', color: '#6366f1' },
          { id: 'ai-ml', title: 'AI/ML Engineer', description: 'Design and deploy production-grade machine learning systems.', icon: '🤖', color: '#ec4899' },
          { id: 'devops', title: 'DevOps Engineer', description: 'Automate deployment pipelines and manage cloud infrastructure.', icon: '🔄', color: '#14b8a6' },
          { id: 'cloud', title: 'Cloud Engineer', description: 'Design and manage scalable cloud solutions on AWS, Azure, or GCP.', icon: '☁️', color: '#f59e0b' },
          { id: 'cybersecurity', title: 'Cyber Security', description: 'Protect systems and networks from cyber threats and vulnerabilities.', icon: '🛡️', color: '#ef4444' },
          { id: 'android', title: 'Android Developer', description: 'Build native Android applications with Kotlin and Jetpack Compose.', icon: '📱', color: '#22c55e' },
          { id: 'uiux', title: 'UI/UX Designer', description: 'Design intuitive, beautiful interfaces with user-centered design principles.', icon: '✨', color: '#d946ef' },
          { id: 'blockchain', title: 'Blockchain Developer', description: 'Build decentralized applications and smart contracts on the blockchain.', icon: '⛓️', color: '#a855f7' }
        ];

        for (const role of careerRolesSeed) {
          await client.query(`
            INSERT INTO career_roadmaps (id, title, description, icon, color, pdf_path, download_count, skills)
            VALUES ($1, $2, $3, $4, $5, $6, 0, '[]')
          `, [role.id, role.title, role.description, role.icon, role.color, `/roadmaps/${role.id}.pdf`]);
        }
        console.log('Seeded career roadmaps.');
      }

      // Seed default credentials
      const usersRes = await client.query('SELECT COUNT(*) FROM users');
      if (parseInt(usersRes.rows[0].count) === 0) {
        console.log('Seeding initial users for login authentication...');
        const adminHash = await bcrypt.hash('admin123', 10);
        const studentHash = await bcrypt.hash('student123', 10);
        const coordHash = await bcrypt.hash('coordinator123', 10);

        await client.query(`
          INSERT INTO users (username, password_hash, role, name, associated_id)
          VALUES 
            ('admin@college.edu', $1, 'admin', 'Admin User', NULL),
            ('student@college.edu', $2, 'student', 'Aarav Sharma', '21JR1A0501'),
            ('coordinator-cse@college.edu', $3, 'coordinator', 'CSE Coordinator', 'Computer Science Engineering'),
            ('coordinator-cseai@college.edu', $3, 'coordinator', 'CSE AI Coordinator', 'Computer Science Engineering - Artificial Intelligence'),
            ('coordinator-cseml@college.edu', $3, 'coordinator', 'CSE ML Coordinator', 'Computer Science Engineering - Machine Learning'),
            ('coordinator-it@college.edu', $3, 'coordinator', 'IT Coordinator', 'Information Technology'),
            ('coordinator-ece@college.edu', $3, 'coordinator', 'ECE Coordinator', 'Electronics and Communication Engineering'),
            ('coordinator-eee@college.edu', $3, 'coordinator', 'EEE Coordinator', 'Electrical and Electronics Engineering')
        `, [adminHash, studentHash, coordHash]);
        console.log('Seeded default user credentials.');
      }

      // Only seed sample data if this is a fresh database (no users exist yet)
      // Once users have been created, we never auto-seed sample students/companies/placements/forms
      // even if those tables are empty (e.g. after a data wipe).
      const dbInitCheck = await client.query('SELECT COUNT(*) FROM users');
      const isDatabaseInitialized = parseInt(dbInitCheck.rows[0].count) > 0;

      if (!isDatabaseInitialized) {
        // Seed default master students
        const studentsRes = await client.query('SELECT COUNT(*) FROM master_students');
        if (parseInt(studentsRes.rows[0].count) === 0) {
          console.log('Seeding initial master students...');
          const sampleStudents = [
            ['21JR1A0501', 'Aarav', 'Sharma', 'Aarav Sharma', 'aarav.sharma@college.edu', '9876500001', 'Male', 'Telangana', 'Hyderabad', 'CSE', '2004-02-11', '92.4', '2020', 'CBSE', '89.6', '2022', 'State Board', 'PlacePro College', '8.9', '2026', 'No', '0'],
            ['21JR1A0514', 'Priya', 'Patel', 'Priya Patel', 'priya.patel@college.edu', '9876500014', 'Female', 'Karnataka', 'Bengaluru', 'CSE', '2004-05-19', '90.5', '2020', 'CBSE', '92.0', '2022', 'PUC', 'PlacePro College', '8.4', '2026', 'No', '0'],
            ['21JR1A0403', 'Rahul', 'Verma', 'Rahul Verma', 'rahul.verma@college.edu', '9876500003', 'Male', 'Andhra Pradesh', 'Vijayawada', 'ECE', '2004-08-02', '82.0', '2020', 'State Board', '78.4', '2022', 'State Board', 'PlacePro College', '7.8', '2026', 'No', '0'],
            ['21JR1A0309', 'Sneha', 'Iyer', 'Sneha Iyer', 'sneha.iyer@college.edu', '9876500009', 'Female', 'Tamil Nadu', 'Chennai', 'ME', '2004-11-30', '85.0', '2020', 'CBSE', '88.0', '2022', 'State Board', 'PlacePro College', '8.1', '2026', 'No', '0']
          ];
          for (const s of sampleStudents) {
            await client.query(`
              INSERT INTO master_students (
                roll_number, first_name, last_name, full_name, mail_id, phone_number, gender, state, city, branch, date_of_birth,
                tenth_percentage, tenth_yop, tenth_board, twelfth_percentage, twelfth_yop, twelfth_board, college_name,
                btech_cgpa, btech_yop, active_backlogs, no_of_backlogs
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            `, s);
          }
        }

        // Seed default companies
        const companiesRes = await client.query('SELECT COUNT(*) FROM companies');
        if (parseInt(companiesRes.rows[0].count) === 0) {
          console.log('Seeding initial companies...');
          const sampleCompanies = [
            ['COMP-001', 'Google', 'Tech/Internet', 'Product', 'Hyderabad', 1, 0, '₹ 32.5 LPA', 'Active', 'On-campus', 'Full-time', '2025-2026', ''],
            ['COMP-002', 'Amazon', 'Tech/E-commerce', 'Product', 'Bengaluru', 1, 1, '₹ 45.0 LPA', 'Completed', 'On-campus', 'Full-time', '2025-2026', ''],
            ['COMP-003', 'Microsoft', 'Tech/Software', 'Product', 'Hyderabad', 1, 0, '₹ 48.0 LPA', 'Completed', 'On-campus', 'Full-time', '2025-2026', ''],
            ['COMP-004', 'TCS', 'IT Services', 'Service', 'Chennai', 1, 1, '₹ 7.5 LPA', 'Completed', 'On-campus', 'Full-time', '2025-2026', '']
          ];
          for (const c of sampleCompanies) {
            await client.query(`
              INSERT INTO companies (id, name, sector, type, location, drives, hires, package, status, mode, job_type, academic_year, remarks)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, c);
          }
        }

        // Seed default placements
        const placementsRes = await client.query('SELECT COUNT(*) FROM placements');
        if (parseInt(placementsRes.rows[0].count) === 0) {
          console.log('Seeding initial placements...');
          const samplePlacements = [
            ['21JR1A0501', 'Aarav Sharma', 'CSE', 'Amazon', 'Software Development Engineer', '₹ 45.0 LPA', '2026-07-05', 'On-campus', 'aarav.sharma@college.edu', '9876500001'],
            ['21JR1A0403', 'Rahul Verma', 'ECE', 'TCS', 'Assistant System Engineer', '₹ 7.5 LPA', '2026-06-20', 'On-campus', 'rahul.verma@college.edu', '9876500003']
          ];
          for (const p of samplePlacements) {
            await client.query(`
              INSERT INTO placements (id, student, branch, company, role, package, date, type, email, phone)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, p);
          }
        }

        // Seed default placement forms
        const formsRes = await client.query('SELECT COUNT(*) FROM placement_forms');
        if (parseInt(formsRes.rows[0].count) === 0) {
          console.log('Seeding initial placement forms...');
          const sampleForms = [
            [
              'FRM-001', 'Placement Registration 2026', 'Registration', 'Active', '2025-12-01', '2025-12-01', '09:00', '2026-07-31', '23:59', 1200,
              JSON.stringify([
                { id: 'fld-roll', label: 'Roll Number', type: 'text', required: true, placeholder: 'Enter roll number' },
                { id: 'fld-name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter full name' },
                { id: 'fld-branch', label: 'Branch', type: 'select', required: true, options: ['CSE', 'IT', 'ECE', 'ME', 'EE', 'CE'] },
                { id: 'fld-cgpa', label: 'CGPA', type: 'number', required: true, placeholder: 'Enter current CGPA' },
                { id: 'fld-resume', label: 'Resume Upload', type: 'file', required: true }
              ]),
              false, '', '', '', '', '', '', '', '', '', ''
            ],
            [
              'FRM-002', 'Amazon Drive Application', 'Drive Application', 'Active', '2026-06-15', '2026-06-15', '08:00', '2026-07-25', '18:00', 950,
              JSON.stringify([
                { id: 'fld-roll-2', label: 'Roll Number', type: 'text', required: true },
                { id: 'fld-name-2', label: 'Full Name', type: 'text', required: true },
                { id: 'fld-email-2', label: 'Alternate Email', type: 'email', required: true },
                { id: 'fld-resume-2', label: 'Resume Upload', type: 'file', required: true }
              ]),
              true, 'Amazon', 'Tech/E-commerce', 'Product', 'Bengaluru', 'On-campus', 'Full-time', '8.0', '45.0', '2025-2026', ''
            ]
          ];
          for (const f of sampleForms) {
            await client.query(`
              INSERT INTO placement_forms (
                id, name, type, status, created, start_date, start_time, end_date, end_time, total, fields,
                has_company_drive, company_name, company_sector, company_category, company_location,
                company_drive_mode, company_job_type, company_pkg_min, company_pkg_max, company_academic_year, company_remarks
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            `, f);
          }
        }
      } else {
        console.log('Database already initialized (users exist). Skipping sample data seeding.');
      }

      console.log('Schema tables verified/created. Database seeding is disabled for testing.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('\n======================================================================');
    console.warn('PostgreSQL connection failed. Falling back to Local Mock JSON Database.');
    console.warn('======================================================================\n');
    useMock = true;
    await runMockSetup();
  }
}

async function runMockSetup() {
  if (db.career_roadmaps.length === 0) {
    console.log('Mock DB: Seeding initial career roadmaps...');
    const careerRolesSeed = [
      { id: 'frontend', title: 'Frontend Developer', description: 'Build beautiful, interactive user interfaces with modern web technologies.', icon: '🎨', color: '#3b82f6' },
      { id: 'backend', title: 'Backend Developer', description: 'Design robust APIs, manage databases, and build server-side applications.', icon: '⚙️', color: '#10b981' },
      { id: 'fullstack', title: 'Full Stack Developer', description: 'Master both frontend and backend to build complete web applications.', icon: '🚀', color: '#8b5cf6' },
      { id: 'java', title: 'Java Developer', description: 'Build enterprise-grade applications with Java and Spring ecosystem.', icon: '☕', color: '#f97316' },
      { id: 'python', title: 'Python Developer', description: 'Versatile programming with Python for web, automation, and scripting.', icon: '🐍', color: '#3b82f6' },
      { id: 'data-analyst', title: 'Data Analyst', description: 'Extract insights from data using statistical analysis and visualization.', icon: '📊', color: '#06b6d4' },
      { id: 'data-scientist', title: 'Data Scientist', description: 'Apply machine learning and statistical modeling to solve complex problems.', icon: '🔬', color: '#6366f1' },
      { id: 'ai-ml', title: 'AI/ML Engineer', description: 'Design and deploy production-grade machine learning systems.', icon: '🤖', color: '#ec4899' },
      { id: 'devops', title: 'DevOps Engineer', description: 'Automate deployment pipelines and manage cloud infrastructure.', icon: '🔄', color: '#14b8a6' },
      { id: 'cloud', title: 'Cloud Engineer', description: 'Design and manage scalable cloud solutions on AWS, Azure, or GCP.', icon: '☁️', color: '#f59e0b' },
      { id: 'cybersecurity', title: 'Cyber Security', description: 'Protect systems and networks from cyber threats and vulnerabilities.', icon: '🛡️', color: '#ef4444' },
      { id: 'android', title: 'Android Developer', description: 'Build native Android applications with Kotlin and Jetpack Compose.', icon: '📱', color: '#22c55e' },
      { id: 'uiux', title: 'UI/UX Designer', description: 'Design intuitive, beautiful interfaces with user-centered design principles.', icon: '✨', color: '#d946ef' },
      { id: 'blockchain', title: 'Blockchain Developer', description: 'Build decentralized applications and smart contracts on the blockchain.', icon: '⛓️', color: '#a855f7' }
    ];
    for (const role of careerRolesSeed) {
      db.career_roadmaps.push({
        id: role.id,
        title: role.title,
        description: role.description,
        icon: role.icon,
        color: role.color,
        pdf_path: `/roadmaps/${role.id}.pdf`,
        download_count: 0,
        skills: []
      });
    }
  }

  if (db.users.length === 0 || !db.users.some(u => u.role === 'coordinator')) {
    console.log('Mock DB: Seeding initial users for login authentication...');
    const adminHash = await bcrypt.hash('admin123', 10);
    const studentHash = await bcrypt.hash('student123', 10);
    const coordHash = await bcrypt.hash('coordinator123', 10);

    db.users = [
      { username: 'admin@college.edu', password_hash: adminHash, role: 'admin', name: 'Admin User', associated_id: null },
      { username: 'student@college.edu', password_hash: studentHash, role: 'student', name: 'Aarav Sharma', associated_id: '21JR1A0501' },
      { username: 'coordinator-cse@college.edu', password_hash: coordHash, role: 'coordinator', name: 'CSE Coordinator', associated_id: 'Computer Science Engineering' },
      { username: 'coordinator-cseai@college.edu', password_hash: coordHash, role: 'coordinator', name: 'CSE AI Coordinator', associated_id: 'Computer Science Engineering - Artificial Intelligence' },
      { username: 'coordinator-cseml@college.edu', password_hash: coordHash, role: 'coordinator', name: 'CSE ML Coordinator', associated_id: 'Computer Science Engineering - Machine Learning' },
      { username: 'coordinator-it@college.edu', password_hash: coordHash, role: 'coordinator', name: 'IT Coordinator', associated_id: 'Information Technology' },
      { username: 'coordinator-ece@college.edu', password_hash: coordHash, role: 'coordinator', name: 'ECE Coordinator', associated_id: 'Electronics and Communication Engineering' },
      { username: 'coordinator-eee@college.edu', password_hash: coordHash, role: 'coordinator', name: 'EEE Coordinator', associated_id: 'Electrical and Electronics Engineering' }
    ];
    saveDb();
  }

  // Only seed sample data for a fresh database (no users exist yet)
  // Once users have been created, never auto-seed sample records even if tables are empty
  const isMockDbInitialized = db.users.length > 0;

  if (!isMockDbInitialized && db.master_students.length === 0) {
    db.master_students = [
      { roll_number: '21JR1A0501', first_name: 'Aarav', last_name: 'Sharma', full_name: 'Aarav Sharma', mail_id: 'aarav.sharma@college.edu', phone_number: '9876500001', gender: 'Male', state: 'Telangana', city: 'Hyderabad', branch: 'CSE', date_of_birth: '2004-02-11', tenth_percentage: '92.4', tenth_yop: '2020', tenth_board: 'CBSE', twelfth_percentage: '89.6', twelfth_yop: '2022', twelfth_board: 'State Board', college_name: 'PlacePro College', btech_cgpa: '8.9', btech_yop: '2026', active_backlogs: 'No', no_of_backlogs: '0' },
      { roll_number: '21JR1A0514', first_name: 'Priya', last_name: 'Patel', full_name: 'Priya Patel', mail_id: 'priya.patel@college.edu', phone_number: '9876500014', gender: 'Female', state: 'Karnataka', city: 'Bengaluru', branch: 'CSE', date_of_birth: '2004-05-19', tenth_percentage: '90.5', tenth_yop: '2020', tenth_board: 'CBSE', twelfth_percentage: '92.0', twelfth_yop: '2022', twelfth_board: 'PUC', college_name: 'PlacePro College', btech_cgpa: '8.4', btech_yop: '2026', active_backlogs: 'No', no_of_backlogs: '0' },
      { roll_number: '21JR1A0403', first_name: 'Rahul', last_name: 'Verma', full_name: 'Rahul Verma', mail_id: 'rahul.verma@college.edu', phone_number: '9876500003', gender: 'Male', state: 'Andhra Pradesh', city: 'Vijayawada', branch: 'ECE', date_of_birth: '2004-08-02', tenth_percentage: '82.0', tenth_yop: '2020', tenth_board: 'State Board', twelfth_percentage: '78.4', twelfth_yop: '2022', twelfth_board: 'State Board', college_name: 'PlacePro College', btech_cgpa: '7.8', btech_yop: '2026', active_backlogs: 'No', no_of_backlogs: '0' },
      { roll_number: '21JR1A0309', first_name: 'Sneha', last_name: 'Iyer', full_name: 'Sneha Iyer', mail_id: 'sneha.iyer@college.edu', phone_number: '9876500009', gender: 'Female', state: 'Tamil Nadu', city: 'Chennai', branch: 'ME', date_of_birth: '2004-11-30', tenth_percentage: '85.0', tenth_yop: '2020', tenth_board: 'CBSE', twelfth_percentage: '88.0', twelfth_yop: '2022', twelfth_board: 'State Board', college_name: 'PlacePro College', btech_cgpa: '8.1', btech_yop: '2026', active_backlogs: 'No', no_of_backlogs: '0' }
    ];
  }
  if (!isMockDbInitialized && db.companies.length === 0) {
    db.companies = [
      { id: 'COMP-001', name: 'Google', sector: 'Tech/Internet', type: 'Product', location: 'Hyderabad', drives: 1, hires: 0, package: '₹ 32.5 LPA', status: 'Active', mode: 'On-campus', job_type: 'Full-time', academic_year: '2025-2026', remarks: '' },
      { id: 'COMP-002', name: 'Amazon', sector: 'Tech/E-commerce', type: 'Product', location: 'Bengaluru', drives: 1, hires: 1, package: '₹ 45.0 LPA', status: 'Completed', mode: 'On-campus', job_type: 'Full-time', academic_year: '2025-2026', remarks: '' },
      { id: 'COMP-003', name: 'Microsoft', sector: 'Tech/Software', type: 'Product', location: 'Hyderabad', drives: 1, hires: 0, package: '₹ 48.0 LPA', status: 'Completed', mode: 'On-campus', job_type: 'Full-time', academic_year: '2025-2026', remarks: '' },
      { id: 'COMP-004', name: 'TCS', sector: 'IT Services', type: 'Service', location: 'Chennai', drives: 1, hires: 1, package: '₹ 7.5 LPA', status: 'Completed', mode: 'On-campus', job_type: 'Full-time', academic_year: '2025-2026', remarks: '' }
    ];
  }
  if (!isMockDbInitialized && db.placements.length === 0) {
    db.placements = [
      { pkey: 1, id: '21JR1A0501', student: 'Aarav Sharma', branch: 'CSE', company: 'Amazon', role: 'Software Development Engineer', package: '₹ 45.0 LPA', date: '2026-07-05', type: 'On-campus', email: 'aarav.sharma@college.edu', phone: '9876500001' },
      { pkey: 2, id: '21JR1A0403', student: 'Rahul Verma', branch: 'ECE', company: 'TCS', role: 'Assistant System Engineer', package: '₹ 7.5 LPA', date: '2026-06-20', type: 'On-campus', email: 'rahul.verma@college.edu', phone: '9876500003' }
    ];
  }
  if (!isMockDbInitialized && db.placement_forms.length === 0) {
    db.placement_forms = [
      {
        id: 'FRM-001', name: 'Placement Registration 2026', type: 'Registration', status: 'Active', created: '2025-12-01', start_date: '2025-12-01', start_time: '09:00', end_date: '2026-07-31', end_time: '23:59', total: 2000,
        fields: [
          { id: 'fld-roll', label: 'Roll Number', type: 'text', required: true, placeholder: 'Enter roll number' },
          { id: 'fld-name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter full name' },
          { id: 'fld-branch', label: 'Branch', type: 'select', required: true, options: ['CSE', 'IT', 'ECE', 'ME', 'EE', 'CE'] },
          { id: 'fld-cgpa', label: 'CGPA', type: 'number', required: true, placeholder: 'Enter current CGPA' },
          { id: 'fld-resume', label: 'Resume Upload', type: 'file', required: true }
        ],
        has_company_drive: false, company_name: '', company_sector: '', company_category: '', company_location: '', company_drive_mode: '', company_job_type: '', company_pkg_min: '', company_pkg_max: '', company_academic_year: '', company_remarks: ''
      },
      {
        id: 'FRM-002', name: 'Amazon Drive Application', type: 'Drive Application', status: 'Active', created: '2026-06-15', start_date: '2026-06-15', start_time: '08:00', end_date: '2026-07-25', end_time: '18:00', total: 950,
        fields: [
          { id: 'fld-roll-2', label: 'Roll Number', type: 'text', required: true },
          { id: 'fld-name-2', label: 'Full Name', type: 'text', required: true },
          { id: 'fld-email-2', label: 'Alternate Email', type: 'email', required: true },
          { id: 'fld-resume-2', label: 'Resume Upload', type: 'file', required: true }
        ],
        has_company_drive: true, company_name: 'Amazon', company_sector: 'Tech/E-commerce', company_category: 'Product', company_location: 'Bengaluru', company_drive_mode: 'On-campus', company_job_type: 'Full-time', company_pkg_min: '8.0', company_pkg_max: '45.0', company_academic_year: '2025-2026', company_remarks: ''
      }
    ];
  }

  if (isMockDbInitialized) {
    console.log('Mock DB already initialized (users exist). Skipping sample data seeding.');
  }

  // Archive auto-merge is disabled. Archived data stays in the archives folder
  // and is not automatically restored into the active database on startup.
  // This prevents deleted data from being silently restored after a wipe.

  saveDb();
  console.log('Mock DB: Setup and seeding complete.');
}


function runMockQuery(text, params) {
  const queryLower = text.trim().toLowerCase().replace(/\s+/g, ' ');
  
  if (queryLower.startsWith('select 1 from pg_database')) {
    return { rows: [{ 1: 1 }] };
  }
  if (queryLower.startsWith('create database')) {
    return { rows: [] };
  }
  if (queryLower.startsWith('create table')) {
    return { rows: [] };
  }
  if (queryLower.startsWith('begin') || queryLower.startsWith('commit') || queryLower.startsWith('rollback') || queryLower.startsWith('lock table')) {
    return { rows: [] };
  }
  
  if (queryLower === 'select count(*) from career_roadmaps') {
    return { rows: [{ count: db.career_roadmaps.length }] };
  }
  if (queryLower === 'select count(*) from master_students') {
    return { rows: [{ count: db.master_students.length }] };
  }
  if (queryLower === 'select count(*) from companies') {
    return { rows: [{ count: db.companies.length }] };
  }
  if (queryLower === 'select count(*) from placements') {
    return { rows: [{ count: db.placements.length }] };
  }
  if (queryLower === 'select sum(drives) from companies') {
    const sum = db.companies.reduce((acc, c) => acc + (parseInt(c.drives) || 0), 0);
    return { rows: [{ sum }] };
  }
  if (queryLower === 'select count(*) from users') {
    return { rows: [{ count: db.users.length }] };
  }
  
  if (queryLower === 'select id, title, description, icon, color, download_count from career_roadmaps') {
    return {
      rows: db.career_roadmaps.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        icon: r.icon,
        color: r.color,
        download_count: r.download_count
      }))
    };
  }
  if (queryLower.startsWith('select * from career_roadmaps where id = $1')) {
    const row = db.career_roadmaps.find(r => r.id === params[0]);
    return { rows: row ? [row] : [] };
  }
  
  if (queryLower.startsWith('select * from learning_resources where roadmap_id = $1 and skill_id = $2')) {
    const row = db.learning_resources.find(r => r.roadmap_id === params[0] && r.skill_id === params[1]);
    return { rows: row ? [row] : [] };
  }
  
  if (queryLower.startsWith('select roadmap_id, completed_skills, current_skill from student_career_progress where roll_number = $1')) {
    const rows = db.student_career_progress.filter(p => p.roll_number === params[0]);
    return { rows };
  }

  if (queryLower.startsWith('select * from users where lower(username) = lower($1) or upper(associated_id) = upper($1)')) {
    const val = (params[0] || '').trim();
    const rows = db.users.filter(u => 
      u.username.toLowerCase() === val.toLowerCase() || 
      (u.associated_id || '').toUpperCase() === val.toUpperCase()
    );
    return { rows };
  }

  if (queryLower === "select username, name from users where role = 'coordinator'") {
    const rows = db.users
      .filter(u => u.role === 'coordinator')
      .map(u => ({ username: u.username, name: u.name }));
    return { rows };
  }

  if (queryLower.startsWith('select * from master_students where upper(roll_number) = upper($1) or lower(mail_id) = lower($1)')) {
    const val = (params[0] || '').trim();
    const rows = db.master_students.filter(s => 
      s.roll_number.toUpperCase() === val.toUpperCase() || 
      (s.mail_id || '').toLowerCase() === val.toLowerCase()
    );
    return { rows };
  }

  if (queryLower === 'select * from master_students') {
    return { rows: db.master_students };
  }
  if (queryLower.startsWith('select * from master_students where academic_year = $1')) {
    return { rows: db.master_students.filter(r => r.academic_year === params[0]) };
  }
  if (queryLower.startsWith('select distinct roll_number, full_name, first_name, last_name from master_students where academic_year = $1')) {
    const students = db.master_students.filter(r => r.academic_year === params[0]);
    const unique = [];
    const seen = new Set();
    for (const s of students) {
      if (!seen.has(s.roll_number)) {
        seen.add(s.roll_number);
        unique.push({ roll_number: s.roll_number, full_name: s.full_name, first_name: s.first_name, last_name: s.last_name });
      }
    }
    return { rows: unique };
  }
  
  if (queryLower === 'select * from placement_forms') {
    return { rows: db.placement_forms };
  }
  if (queryLower.startsWith('select * from placement_forms where academic_year = $1')) {
    return { rows: db.placement_forms.filter(r => r.academic_year === params[0]) };
  }
  if (queryLower.startsWith('select id, status from placement_forms where academic_year = $1')) {
    return { 
      rows: db.placement_forms
        .filter(r => r.academic_year === params[0])
        .map(r => ({ id: r.id, status: r.status }))
    };
  }

  if (queryLower === 'select * from form_submissions') {
    return { rows: db.form_submissions };
  }
  if (queryLower.startsWith('select * from form_submissions where academic_year = $1')) {
    return { rows: db.form_submissions.filter(r => r.academic_year === params[0]) };
  }

  if (queryLower === 'select * from companies') {
    return { rows: db.companies };
  }
  if (queryLower.startsWith('select * from companies where academic_year = $1')) {
    return { rows: db.companies.filter(r => r.academic_year === params[0]) };
  }

  if (queryLower === 'select * from placements') {
    return { rows: db.placements };
  }
  if (queryLower.startsWith('select * from placements where academic_year = $1')) {
    return { rows: db.placements.filter(r => r.academic_year === params[0]) };
  }

  if (queryLower === 'select * from placement_notifications') {
    return { rows: db.placement_notifications };
  }
  if (queryLower.startsWith('select * from placement_notifications where academic_year = $1')) {
    return { rows: db.placement_notifications.filter(r => r.academic_year === params[0]) };
  }
  if (queryLower.startsWith('select id from placement_notifications where academic_year = $1 and package = $2 limit 1')) {
    const row = db.placement_notifications.find(r => r.academic_year === params[0] && r.package === params[1]);
    return { rows: row ? [{ id: row.id }] : [] };
  }


  if (queryLower === 'delete from master_students') {
    db.master_students = [];
    saveDb();
    return { rows: [] };
  }
  if (queryLower.startsWith('delete from master_students where academic_year = $1')) {
    db.master_students = db.master_students.filter(r => r.academic_year !== params[0]);
    saveDb();
    return { rows: [] };
  }

  if (queryLower === 'delete from companies') {
    db.companies = [];
    saveDb();
    return { rows: [] };
  }
  if (queryLower.startsWith('delete from companies where academic_year = $1')) {
    db.companies = db.companies.filter(r => r.academic_year !== params[0]);
    saveDb();
    return { rows: [] };
  }

  if (queryLower === 'delete from placements') {
    db.placements = [];
    saveDb();
    return { rows: [] };
  }
  if (queryLower.startsWith('delete from placements where academic_year = $1')) {
    db.placements = db.placements.filter(r => r.academic_year !== params[0]);
    saveDb();
    return { rows: [] };
  }

  if (queryLower === 'delete from placement_forms') {
    db.placement_forms = [];
    saveDb();
    return { rows: [] };
  }
  if (queryLower.startsWith('delete from placement_forms where academic_year = $1')) {
    db.placement_forms = db.placement_forms.filter(r => r.academic_year !== params[0]);
    saveDb();
    return { rows: [] };
  }

  if (queryLower === 'delete from form_submissions') {
    db.form_submissions = [];
    saveDb();
    return { rows: [] };
  }
  if (queryLower.startsWith('delete from form_submissions where academic_year = $1')) {
    db.form_submissions = db.form_submissions.filter(r => r.academic_year !== params[0]);
    saveDb();
    return { rows: [] };
  }

  if (queryLower === 'delete from placement_notifications') {
    db.placement_notifications = [];
    saveDb();
    return { rows: [] };
  }
  if (queryLower.startsWith('delete from placement_notifications where academic_year = $1')) {
    db.placement_notifications = db.placement_notifications.filter(r => r.academic_year !== params[0]);
    saveDb();
    return { rows: [] };
  }


  if (queryLower.startsWith('insert into career_roadmaps')) {
    const row = {
      id: params[0],
      title: params[1],
      description: params[2],
      icon: params[3],
      color: params[4],
      pdf_path: params[5],
      download_count: 0,
      skills: []
    };
    db.career_roadmaps.push(row);
    saveDb();
    return { rows: [] };
  }
  
  if (queryLower.startsWith('insert into users') && queryLower.includes('admin@college.edu')) {
    db.users = [
      { username: 'admin@college.edu', password_hash: params[0], role: 'admin', name: 'Admin User', associated_id: null },
      { username: 'student@college.edu', password_hash: params[1], role: 'student', name: 'Aarav Sharma', associated_id: '21JR1A0501' },
      { username: 'coordinator-cse@college.edu', password_hash: params[2], role: 'coordinator', name: 'CSE Coordinator', associated_id: 'Computer Science Engineering' },
      { username: 'coordinator-cseai@college.edu', password_hash: params[2], role: 'coordinator', name: 'CSE AI Coordinator', associated_id: 'Computer Science Engineering - Artificial Intelligence' },
      { username: 'coordinator-cseml@college.edu', password_hash: params[2], role: 'coordinator', name: 'CSE ML Coordinator', associated_id: 'Computer Science Engineering - Machine Learning' },
      { username: 'coordinator-it@college.edu', password_hash: params[2], role: 'coordinator', name: 'IT Coordinator', associated_id: 'Information Technology' },
      { username: 'coordinator-ece@college.edu', password_hash: params[2], role: 'coordinator', name: 'ECE Coordinator', associated_id: 'Electronics and Communication Engineering' },
      { username: 'coordinator-eee@college.edu', password_hash: params[2], role: 'coordinator', name: 'EEE Coordinator', associated_id: 'Electrical and Electronics Engineering' }
    ];
    saveDb();
    return { rows: [] };
  }

  if (queryLower.startsWith('insert into master_students')) {
    const row = {
      roll_number: params[0],
      first_name: params[1],
      last_name: params[2],
      full_name: params[3],
      mail_id: params[4],
      alternate_mail_id: params[5],
      phone_number: params[6],
      alternate_phone_number: params[7],
      aadhar_number: params[8],
      gender: params[9],
      country: params[10],
      state: params[11],
      city: params[12],
      branch: params[13],
      date_of_birth: params[14],
      tenth_percentage: params[15],
      tenth_yop: params[16],
      tenth_board: params[17],
      twelfth_percentage: params[18],
      twelfth_yop: params[19],
      twelfth_board: params[20],
      college_name: params[21],
      btech_cgpa: params[22],
      btech_yop: params[23],
      active_backlogs: params[24],
      no_of_backlogs: params[25]
    };
    db.master_students.push(row);
    saveDb();
    return { rows: [] };
  }

  if (queryLower.startsWith('insert into companies')) {
    const row = {
      id: params[0],
      name: params[1],
      sector: params[2],
      type: params[3],
      location: params[4],
      drives: params[5],
      hires: params[6],
      package: params[7],
      status: params[8],
      mode: params[9],
      job_type: params[10],
      remarks: params[11],
      academic_year: params[12]
    };
    db.companies.push(row);
    saveDb();
    return { rows: [] };
  }

  if (queryLower.startsWith('insert into placements')) {
    const row = {
      pkey: db.placements.length + 1,
      id: params[0],
      student: params[1],
      branch: params[2],
      company: params[3],
      role: params[4],
      package: params[5],
      date: params[6],
      type: params[7],
      email: params[8],
      phone: params[9],
      academic_year: params[10]
    };
    db.placements.push(row);
    saveDb();
    return { rows: [] };
  }

  if (queryLower.startsWith('insert into placement_forms')) {
    const row = {
      id: params[0],
      name: params[1],
      type: params[2],
      status: params[3],
      created: params[4],
      start_date: params[5],
      start_time: params[6],
      end_date: params[7],
      end_time: params[8],
      total: params[9],
      fields: typeof params[10] === 'string' ? JSON.parse(params[10]) : params[10],
      has_company_drive: params[11],
      company_name: params[12],
      company_sector: params[13],
      company_category: params[14],
      company_location: params[15],
      company_drive_mode: params[16],
      company_job_type: params[17],
      company_pkg_min: params[18],
      company_pkg_max: params[19],
      company_min_cgpa: params[20],
      company_max_backlogs: params[21],
      company_academic_year: params[22],
      company_remarks: params[23],
      academic_year: params[24] || '2025-2026'
    };
    const idx = db.placement_forms.findIndex(r => r.id === row.id);
    if (idx >= 0) {
      db.placement_forms[idx] = row;
    } else {
      db.placement_forms.push(row);
    }
    saveDb();
    return { rows: [] };
  }

  if (queryLower.startsWith('select * from form_submissions where form_id = $1 and upper(roll) = $2')) {
    const rows = (db.form_submissions || []).filter(s => 
      String(s.form_id || s.formId || '').trim() === String(params[0] || '').trim() &&
      String(s.roll || '').trim().toUpperCase() === String(params[1] || '').trim().toUpperCase()
    );
    return { rows };
  }

  if (queryLower.startsWith('update form_submissions set name = $1, submitted_at = $2, status = $3, values = $4 where form_id = $5 and upper(roll) = $6')) {
    const row = (db.form_submissions || []).find(s => 
      String(s.form_id || s.formId || '').trim() === String(params[4] || '').trim() &&
      String(s.roll || '').trim().toUpperCase() === String(params[5] || '').trim().toUpperCase()
    );
    if (row) {
      row.name = params[0];
      row.submitted_at = params[1];
      row.status = params[2];
      row.values = typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3];
      saveDb();
    }
    return { rows: row ? [row] : [] };
  }

  if (queryLower.startsWith('insert into form_submissions')) {
    const row = {
      id: params[0],
      form_id: params[1],
      roll: params[2],
      name: params[3],
      submitted_at: params[4],
      status: params[5],
      values: typeof params[6] === 'string' ? JSON.parse(params[6]) : params[6],
      academic_year: params[7] || '2025-2026'
    };
    if (!db.form_submissions) db.form_submissions = [];
    const idx = db.form_submissions.findIndex(s => s.form_id === row.form_id && String(s.roll).trim().toUpperCase() === String(row.roll).trim().toUpperCase());
    if (idx >= 0) {
      db.form_submissions[idx] = row;
    } else {
      db.form_submissions.push(row);
    }
    saveDb();
    return { rows: [] };
  }

  if (queryLower.startsWith('insert into placement_notifications')) {
    const row = {
      id: params[0],
      roll_number: params[1],
      student_name: params[2],
      company: params[3],
      role: params[4],
      package: params[5],
      date: params[6],
      type: params[7],
      created_at: params[8],
      read: params[9],
      academic_year: params[10] || '2025-2026'
    };
    const idx = db.placement_notifications.findIndex(r => r.id === row.id);
    if (idx >= 0) {
      db.placement_notifications[idx] = row;
    } else {
      db.placement_notifications.push(row);
    }
    saveDb();
    return { rows: [] };
  }

  if (queryLower.startsWith('update career_roadmaps set download_count = download_count + 1 where id = $1')) {
    const roadmap = db.career_roadmaps.find(r => r.id === params[0]);
    if (roadmap) {
      roadmap.download_count = (roadmap.download_count || 0) + 1;
      saveDb();
    }
    return { rows: [] };
  }

  if (queryLower.startsWith('insert into student_career_progress')) {
    const roll = params[0];
    const roadmapId = params[1];
    const completedSkills = JSON.parse(params[2]);
    const currentSkill = params[3];
    
    let prog = db.student_career_progress.find(p => p.roll_number === roll && p.roadmap_id === roadmapId);
    if (prog) {
      prog.completed_skills = completedSkills;
      prog.current_skill = currentSkill;
      prog.updated_at = new Date().toISOString();
    } else {
      prog = {
        id: db.student_career_progress.length + 1,
        roll_number: roll,
        roadmap_id: roadmapId,
        completed_skills: completedSkills,
        current_skill: currentSkill,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.student_career_progress.push(prog);
    }
    saveDb();
    return { rows: [] };
  }

  if (queryLower.startsWith('select * from master_students where upper(roll_number) = upper($1)')) {
    const val = (params[0] || '').trim().toUpperCase();
    const rows = db.master_students.filter(s => s.roll_number.toUpperCase() === val);
    return { rows };
  }

  if (queryLower.startsWith('select * from users where upper(associated_id) = upper($1) and role = \'student\'')) {
    const val = (params[0] || '').trim().toUpperCase();
    const rows = db.users.filter(u => (u.associated_id || '').toUpperCase() === val && u.role === 'student');
    return { rows };
  }

  if (queryLower.startsWith('update users set password_hash = $1 where upper(associated_id) = upper($2) and role = \'student\'')) {
    const hash = params[0];
    const roll = (params[1] || '').trim().toUpperCase();
    const user = db.users.find(u => (u.associated_id || '').toUpperCase() === roll && u.role === 'student');
    if (user) {
      user.password_hash = hash;
      saveDb();
    }
    return { rows: [] };
  }

  if (queryLower.startsWith('insert into users (username, password_hash, role, name, associated_id) values ($1, $2, \'student\', $3, $4)')) {
    const username = params[0];
    const hash = params[1];
    const name = params[2];
    const roll = params[3];
    db.users.push({
      username,
      password_hash: hash,
      role: 'student',
      name,
      associated_id: roll
    });
    saveDb();
    return { rows: [] };
  }

  if (queryLower === "select * from users where role = 'coordinator'") {
    const rows = db.users.filter(u => u.role === 'coordinator');
    return { rows };
  }

  if (queryLower.startsWith("select * from users where role = 'coordinator' and lower(username) = lower($1)")) {
    const email = (params[0] || '').trim().toLowerCase();
    const rows = db.users.filter(u => u.role === 'coordinator' && u.username.toLowerCase() === email);
    return { rows };
  }

  if (queryLower.startsWith("insert into users (username, password_hash, role, name, associated_id) values ($1, $2, 'coordinator', $3, $4)")) {
    db.users.push({
      username: params[0],
      password_hash: params[1],
      role: 'coordinator',
      name: params[2],
      associated_id: params[3]
    });
    saveDb();
    return { rows: [] };
  }

  if (queryLower.startsWith("update users set name = $1, associated_id = $2 where username = $3")) {
    const user = db.users.find(u => u.username === params[2]);
    if (user) {
      user.name = params[0];
      user.associated_id = params[1];
      saveDb();
    }
    return { rows: [] };
  }

  if (queryLower.startsWith("update users set password_hash = $1 where username = $2")) {
    const user = db.users.find(u => u.username === params[1]);
    if (user) {
      user.password_hash = params[0];
      saveDb();
    }
    return { rows: [] };
  }

  if (queryLower.startsWith("delete from users where username = $1")) {
    db.users = db.users.filter(u => u.username !== params[0]);
    saveDb();
    return { rows: [] };
  }

  if (queryLower.startsWith("select * from users where role = 'coordinator' and lower(username) = lower($1) and associated_id = $2")) {
    const email = (params[0] || '').trim().toLowerCase();
    const dept = (params[1] || '').trim();
    const rows = db.users.filter(u => u.role === 'coordinator' && u.username.toLowerCase() === email && u.associated_id === dept);
    return { rows };
  }

  if (queryLower.startsWith("update users set password_hash = $1 where username = $2 and role = 'coordinator'")) {
    const user = db.users.find(u => u.username === params[1] && u.role === 'coordinator');
    if (user) {
      user.password_hash = params[0];
      saveDb();
    }
    return { rows: [] };
  }

  console.warn('Unhandled mock query:', text, params);
  return { rows: [] };
}
