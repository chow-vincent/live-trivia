import { getGame } from './db/index.js';

// Unambiguous characters — no 0/O, 1/I/L
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(length = 4): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function generateUniqueGameCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const existing = await getGame(code);
    if (!existing) return code;
  }
  // Extremely unlikely — fallback to 5-char code
  return generateCode(5);
}
