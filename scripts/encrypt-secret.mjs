import sodium from 'libsodium-wrappers';

await sodium.ready;

const [,, keyB64, secret] = process.argv;
const encrypted = sodium.crypto_box_seal(
  Buffer.from(secret),
  Buffer.from(keyB64, 'base64')
);
console.log(Buffer.from(encrypted).toString('base64'));
