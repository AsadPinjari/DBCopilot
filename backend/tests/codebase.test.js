const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeProjectZip, analyzeProjectFiles } = require('../src/services/codebase.service');
const AdmZip = require('adm-zip');

function buildZip(files) {
    const zip = new AdmZip();
    for (const [name, cnt] of Object.entries(files)) {
        zip.addFile(name, Buffer.from(cnt, 'utf8'));
    }
    return zip.toBuffer();
}

test('extracts SQL from a JS file string literal', () => {
    const buf = buildZip({ 'src/q.js': "const q = 'SELECT id FROM users WHERE active = 1';" });
    const result = analyzeProjectZip(buf);
    const file = result.files.find(f => f.path.includes('q.js'));
    assert.ok(file, 'Should find q.js');
    assert.ok(file.sqlCandidates.length >= 1, 'Should have SQL candidates');
});

test('extracts SQL from a .sql file', () => {
    const buf = buildZip({ 'schema/init.sql': 'SELECT id FROM customers WHERE active = 1;' });
    const result = analyzeProjectZip(buf);
    const file = result.files.find(f => f.path.endsWith('.sql'));
    assert.ok(file, 'Should find .sql file');
    assert.ok(file.sqlCandidates.length >= 1, 'Should extract SQL statement');
});

test('ignores node_modules directory', () => {
    const buf = buildZip({
        'node_modules/pg/query.js': "const q = 'SELECT id FROM users';",
        'src/app.js': "const q = 'SELECT id FROM orders WHERE status = 1';"
    });
    const result = analyzeProjectZip(buf);
    assert.equal(result.files.find(f => f.path.includes('node_modules')), undefined);
});

test('skips unsafe traversal paths without throwing', () => {
    const zip = new AdmZip();
    zip.addFile('../../evil.js', Buffer.from('SELECT id FROM t;', 'utf8'));
    assert.doesNotThrow(() => analyzeProjectZip(zip.toBuffer()));
});

test('rejects an archive with too many files', () => {
    const zip = new AdmZip();
    for (let i = 0; i < 1001; i++) { zip.addFile('f' + i + '.txt', Buffer.from('x')); }
    assert.throws(() => analyzeProjectZip(zip.toBuffer()), /too many entries/i);
});

test('summary sqlCandidatesFound matches actual count', () => {
    const buf = buildZip({ 'src/a.js': "const q = 'SELECT id FROM users;';" });
    const result = analyzeProjectZip(buf);
    const total = result.files.reduce((s, f) => s + f.sqlCandidates.length, 0);
    assert.equal(result.summary.sqlCandidatesFound, total);
});

test('excludes non-db source files from results', () => {
    const buf = buildZip({ 'src/utils.js': 'function add(a, b) { return a + b; }' });
    const result = analyzeProjectZip(buf);
    assert.equal(result.files.find(f => f.path.includes('utils.js')), undefined);
});

test('analyzeProjectFiles processes array of file objects directly', () => {
    const files = [
        { path: 'src/queries.js', content: "const q = 'SELECT id, name FROM users;';" },
        { path: 'src/helpers.js', content: "function format(x) { return x; }" }
    ];
    const result = analyzeProjectFiles(files);
    assert.equal(result.summary.filesAnalyzed, 1);
    assert.equal(result.summary.sqlCandidatesFound, 1);
    assert.equal(result.files[0].path, 'src/queries.js');
});

test('analyzeProjectFiles skips unsafe paths and ignored directories', () => {
    const files = [
        { path: '../secret.js', content: "SELECT * FROM secret;" },
        { path: 'node_modules/lib.js', content: "SELECT * FROM t;" },
        { path: 'src/valid.sql', content: "SELECT id FROM orders;" }
    ];
    const result = analyzeProjectFiles(files);
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].path, 'src/valid.sql');
});
