import XLSX from 'xlsx';
import path from 'path';

const data = [
  {
    "Roll Number": "22JK1A4415",
    "Full Name": "BODANAPU KOWSHIK REDDY",
    "Email": "kowshikbodhanapu@gmail.com",
    "Phone": "7993099175",
    "Branch": "Computer Science Engineering - Data Science",
    "Role": "Associate Software Engineer",
    "Company": "PILOG GROUP",
    "Package": "2.2"
  },
  {
    "Roll Number": "22JK1A4416",
    "Full Name": "BOLISETTY KRISHNA KOUSIK",
    "Email": "22jk1a4416@gmail.com",
    "Phone": "9346129099",
    "Branch": "Computer Science Engineering - Data Science",
    "Role": "Associate Software Engineer",
    "Company": "PILOG GROUP",
    "Package": "2.2"
  }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Selected Students");

const outputPath = path.resolve('pilog_students.xlsx');
XLSX.writeFile(workbook, outputPath);
console.log('Successfully wrote dummy excel to:', outputPath);
