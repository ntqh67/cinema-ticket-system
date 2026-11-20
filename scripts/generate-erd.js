/**
 * Mục đích: Sinh sơ đồ ERD Mermaid từ prisma/schema.prisma để tài liệu luôn khớp schema.
 * Chạy: node scripts/generate-erd.js  -> ghi docs/erd.md
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const schema = fs.readFileSync(path.join(root, 'prisma', 'schema.prisma'), 'utf8');

// Tách các khối model và danh sách field (bỏ comment, dòng trống, thuộc tính @@).
function parseModels(text) {
  const models = {};
  for (const [, name, body] of text.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const fields = body
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, '').trim())
      .filter((line) => line && !line.startsWith('@@'))
      .map((line) => {
        const [field, rawType, ...rest] = line.split(/\s+/);
        return {
          name: field,
          type: rawType.replace(/[?[\]]/g, ''),
          optional: rawType.endsWith('?'),
          list: rawType.endsWith('[]'),
          attrs: rest.join(' '),
        };
      });
    models[name] = fields;
  }
  return models;
}

const models = parseModels(schema);
const entities = [];
const relations = [];

for (const [name, fields] of Object.entries(models)) {
  const fkNames = new Set();
  for (const field of fields) {
    const match = /@relation\([^)]*fields:\s*\[([^\]]+)\]/.exec(field.attrs);
    if (!match || !models[field.type]) continue;
    const fks = match[1].split(',').map((item) => item.trim());
    fks.forEach((fk) => fkNames.add(fk));
    const owner = fields.filter((item) => fks.includes(item.name));
    const unique = owner.some((item) => /@unique/.test(item.attrs));
    // Cardinality theo phía giữ khóa ngoại: nhiều-một, hoặc một-một khi FK unique.
    const left = field.optional ? '|o' : '||';
    const right = unique ? 'o|' : 'o{';
    relations.push(`  ${field.type} ${left}--${right} ${name} : "${fks.join(', ')}"`);
  }
  const rows = fields
    .filter((item) => !models[item.type] && (item.attrs.includes('@id') || fkNames.has(item.name) || item.attrs.includes('@unique')))
    .map((item) => {
      const key = item.attrs.includes('@id') ? 'PK' : fkNames.has(item.name) ? 'FK' : 'UK';
      return `    ${item.type} ${item.name} ${key}`;
    });
  entities.push(`  ${name} {\n${rows.join('\n')}\n  }`);
}

const diagram = `erDiagram\n${relations.join('\n')}\n${entities.join('\n')}`;
const output = `# ERD

> Tự sinh từ \`prisma/schema.prisma\` bằng \`node scripts/generate-erd.js\`. Chỉ hiển thị khóa chính (PK), khóa ngoại (FK) và cột duy nhất (UK); danh sách cột đầy đủ xem [database-schema-excel.csv](database-schema-excel.csv).

\`\`\`mermaid
${diagram}
\`\`\`
`;
fs.writeFileSync(path.join(root, 'docs', 'erd.md'), output);
console.log(`Đã ghi docs/erd.md: ${Object.keys(models).length} bảng, ${relations.length} quan hệ`);
