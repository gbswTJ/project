const crypto = require("crypto");
const algorithm = 'aes-256-cbc';
const sessionSecretKey = 'myselectkeyboard1234567898765432';

// 암호화 함수
function encrypt(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, sessionSecretKey, iv);
  let result = cipher.update(data, "utf8", "hex");
  result += cipher.final("hex");
  return iv.toString('hex') + result;
}


// 복호화 함수
function decrypt(data) {
  const iv = Buffer.from(data.slice(0, 32), 'hex');
  const encryptedData = data.slice(32);
  const decipher = crypto.createDecipheriv(algorithm, sessionSecretKey, Buffer.from(iv, 'hex'));
  let result = decipher.update(encryptedData, "hex", "utf8");
  result += decipher.final("utf8");
  return result;
}

module.exports = {
  encrypt,
  decrypt
}
