const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { STORED_FILE_PATTERN } = require('../constants/file.constant');

// Keep UPLOAD_DIR outside the deploy checkout: the workflow's checkout cleans untracked files
const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));

const startsWith = (buffer, bytes, offset = 0) =>
    buffer.length >= offset + bytes.length && bytes.every((b, i) => buffer[offset + i] === b);

// File type from its first bytes. A .docx is a zip, so it must also contain a word/ entry.
exports.detectFileType = (buffer) => {
    if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';                         // %PDF-
    if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'doc';        // OLE2
    if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) && buffer.includes('word/')) return 'docx';  // zip
    if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
    if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'jpg';
    if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
    return null;
};

// Absolute path of a stored file, or null for a name that isn't one of ours
exports.storedFilePath = (dir, fileName) => {
    if (!fileName || !STORED_FILE_PATTERN.test(fileName)) return null;
    return path.join(uploadRoot(), dir, fileName);
};

// Writes the buffer under a random name and returns that name
exports.saveFile = async (dir, buffer, ext) => {
    const fileName = `${crypto.randomUUID()}.${ext}`;
    await fs.mkdir(path.join(uploadRoot(), dir), { recursive: true });
    await fs.writeFile(path.join(uploadRoot(), dir, fileName), buffer, { flag: 'wx' });
    return fileName;
};

// Missing files are fine: the goal is that the file is gone
exports.removeFile = async (dir, fileName) => {
    const filePath = exports.storedFilePath(dir, fileName);
    if (!filePath) return;
    try {
        await fs.unlink(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
};

exports.fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch (err) {
        return false;
    }
};

// Display name for downloads: no path parts or control characters
exports.cleanOriginalName = (name) =>
    String(name || 'file').split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f"]/g, '').trim().slice(0, 200) || 'file';
