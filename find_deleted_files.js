const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\prave\\.gemini\\antigravity\\brain\\aa5b11dd-2485-4468-ac13-600a52e30825\\.system_generated\\logs\\transcript.jsonl';
const outDir = 'C:\\Users\\prave\\.gemini\\antigravity\\scratch\\restored';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('Scanning transcript log...');

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const step = JSON.parse(line);
      
      if (step.type === 'VIEW_FILE' && step.status === 'DONE') {
        const content = step.content || '';
        const pathMatch = content.match(/File Path: `file:\/\/\/(.*?)`/);
        if (pathMatch) {
          const filePath = '/' + pathMatch[1];
          if (filePath.toLowerCase().includes('coordinator')) {
            const fileBase = path.basename(filePath);
            
            const lines = content.split('\n');
            const codeLines = [];
            let startCode = false;
            for (const l of lines) {
              if (startCode) {
                const lineMatch = l.match(/^\d+:\s(.*)/);
                if (lineMatch) {
                  codeLines.push(lineMatch[1]);
                } else if (l.trim() === '') {
                  codeLines.push('');
                }
              }
              if (l.includes('remove the line number, colon, and leading space.')) {
                startCode = true;
              }
            }
            if (codeLines.length > 0) {
              fs.writeFileSync(path.join(outDir, fileBase), codeLines.join('\n'), 'utf8');
              console.log(`Extracted view of: ${fileBase} (${codeLines.length} lines)`);
            }
          }
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  console.log('Scan complete. Restored files written to:', outDir);
}

run();
