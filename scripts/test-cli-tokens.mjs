import fs from 'node:fs';

const configPath = '/Users/aakashdas/.config/configstore/firebase-tools.json';
const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('User email in CLI:', data.user?.email);
console.log('Tokens exist:', Boolean(data.tokens?.access_token || data.tokens?.refresh_token));
