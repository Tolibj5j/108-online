import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../../../shared/constants/index.ts';
import { secureRandomInt } from '../../../shared/rules/index.ts';

export function generateRoomCode(isTaken: (code: string) => boolean): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[secureRandomInt(ROOM_CODE_ALPHABET.length)];
    if (!isTaken(code)) return code;
  }
  throw new Error('Could not allocate a room code');
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase();
}
