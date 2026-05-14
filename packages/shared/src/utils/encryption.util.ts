/**
 * Production-ready Encryption Utility for OAuth Tokens
 * - AES-256-GCM (Web Crypto compatible)
 * - Versioned ciphertext format: v1:iv:encryptedHex
 * - Accepts ENCRYPTION_KEY as 64-char hex or base64-encoded 32 bytes
 * - Caches imported CryptoKey for performance
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // bytes
const EXPECTED_KEY_BYTES = 32; // 256 bits
const CIPHER_VERSION = 'v1';

let cachedKey: CryptoKey | null = null;

function toArrayBuffer(input: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(input.byteLength);
    copy.set(input);
    return copy.buffer;
}

async function getEncryptionKey(): Promise<CryptoKey> {
    if (cachedKey) return cachedKey;

    const keyStr = process.env.ENCRYPTION_KEY;
    if (!keyStr) throw new Error('ENCRYPTION_KEY environment variable is not set');

    const keyData = toArrayBuffer(parseKeyString(keyStr));

    const imported = await globalThis.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: ALGORITHM },
        false,
        ['encrypt', 'decrypt']
    );

    cachedKey = imported;
    return imported;
}

function parseKeyString(keyStr: string): Uint8Array {
    // Support explicit prefixes
    if (keyStr.startsWith('hex:')) {
        const hex = keyStr.slice(4);
        const arr = hexToUint8Array(hex);
        if (arr.length !== EXPECTED_KEY_BYTES) throw new Error('ENCRYPTION_KEY hex decoded to unexpected length');
        return arr;
    }

    if (keyStr.startsWith('base64:')) {
        const b64 = keyStr.slice(7);
        const arr = decodeBase64ToUint8Array(b64);
        if (arr.length !== EXPECTED_KEY_BYTES) throw new Error('ENCRYPTION_KEY base64 decoded to invalid length');
        return arr;
    }

    // Try plain hex
    const hex64 = /^[0-9a-fA-F]{64}$/;
    if (hex64.test(keyStr)) {
        const arr = hexToUint8Array(keyStr);
        if (arr.length !== EXPECTED_KEY_BYTES) throw new Error('ENCRYPTION_KEY hex decoded to unexpected length');
        return arr;
    }

    // Try base64
    try {
        const arr = decodeBase64ToUint8Array(keyStr);
        if (arr.length !== EXPECTED_KEY_BYTES) throw new Error('ENCRYPTION_KEY base64 decoded to invalid length');
        return arr;
    } catch (err) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes) or a base64-encoded 32-byte value');
    }
}

function decodeBase64ToUint8Array(b64: string): Uint8Array {
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
        const buf = Buffer.from(b64, 'base64');
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }

    if (typeof globalThis.atob === 'function') {
        const binary = globalThis.atob(b64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    throw new Error('No base64 decoder available in this environment');
}

function hexToUint8Array(hex: string): Uint8Array {
    const match = hex.match(/.{1,2}/g);
    if (!match) return new Uint8Array(0);
    return new Uint8Array(match.map(byte => parseInt(byte, 16)));
}

function uint8ArrayToHex(arr: Uint8Array): string {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt plaintext and return versioned ciphertext: `v1:ivHex:encryptedHex`
 */
export async function encrypt(text: string): Promise<string> {
    try {
        const key = await getEncryptionKey();
        const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const ivBuffer = toArrayBuffer(iv);
        const encoded = new TextEncoder().encode(text);

        const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
            { name: ALGORITHM, iv: ivBuffer },
            key,
            encoded
        );

        const encryptedData = new Uint8Array(encryptedBuffer);

        return `${CIPHER_VERSION}:${uint8ArrayToHex(iv)}:${uint8ArrayToHex(encryptedData)}`;
    } catch (err: any) {
        throw new Error(`Encryption failed: ${err?.message ?? String(err)}`);
    }
}

/**
 * Decrypt ciphertext. Supports:
 * - v1:iv:encryptedHex (current)
 * - iv:encryptedHex (legacy, no version)
 * - iv:auth:encrypted (older node formats) — best-effort not guaranteed
 */
export async function decrypt(encryptedText: string): Promise<string> {
    try {
        const key = await getEncryptionKey();

        const parts = encryptedText.split(':');

        let iv: Uint8Array;
        let data: Uint8Array;

        if (parts.length >= 3 && parts[0] === CIPHER_VERSION) {
            // v1:iv:encrypted
            iv = hexToUint8Array(parts[1]);
            data = hexToUint8Array(parts.slice(2).join(':'));
        } else if (parts.length === 2) {
            // legacy: iv:encrypted
            iv = hexToUint8Array(parts[0]);
            data = hexToUint8Array(parts[1]);
        } else if (parts.length === 3) {
            // possible iv:auth:encrypted from older Node implementations
            iv = hexToUint8Array(parts[0]);
            // join auth+encrypted back together (best-effort)
            data = hexToUint8Array(parts[1] + parts[2]);
        } else {
            throw new Error('Invalid encrypted text format');
        }

        const ivBuffer = toArrayBuffer(iv);
        const dataBuffer = toArrayBuffer(data);

        const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
            { name: ALGORITHM, iv: ivBuffer },
            key,
            dataBuffer
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (err: any) {
        throw new Error(`Decryption failed: ${err?.message ?? String(err)}`);
    }
}

/**
 * Generate a secure 32-byte key. Returns both hex and base64 representations.
 */
export function generateEncryptionKeyPair(): { hex: string; base64: string } {
    const arr = new Uint8Array(EXPECTED_KEY_BYTES);
    globalThis.crypto.getRandomValues(arr);
    const hex = uint8ArrayToHex(arr);

    // Buffer may be available in Node environments
    let base64: string;
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
        base64 = Buffer.from(arr).toString('base64');
    } else if (typeof globalThis.btoa === 'function') {
        let binary = '';
        for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
        base64 = globalThis.btoa(binary);
    } else {
        base64 = '';
    }

    return { hex, base64 };
}
