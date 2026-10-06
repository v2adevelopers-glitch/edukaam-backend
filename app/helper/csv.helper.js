// CSV text from rows and [{ key, header }] columns. Cells that a spreadsheet would run as a
// formula (=, +, -, @, tab, CR at the start) are prefixed with ' (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

const cell = (value) => {
    if (value === null || value === undefined) return '';
    let text = value instanceof Date ? value.toISOString() : String(value);
    if (FORMULA_START.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// The BOM makes Excel open the file as UTF-8
exports.toCsv = (columns, rows) => '﻿' + [
    columns.map(c => cell(c.header)).join(','),
    ...rows.map(row => columns.map(c => cell(row[c.key])).join(','))
].join('\r\n') + '\r\n';
