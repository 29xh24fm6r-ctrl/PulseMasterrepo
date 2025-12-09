// Security Vault Client Library
// Client-side encryption - server never sees plaintext

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KDF_ITERATIONS = 100000;

// Convert string to Uint8Array
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert Uint8Array to string
function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// Convert Uint8Array to base64
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to Uint8Array
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate random bytes
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Convert Uint8Array to ArrayBuffer (fixes type issues)
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// Derive key from password using PBKDF2
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const passwordBytes = stringToBytes(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(passwordBytes),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: KDF_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// Hash password for verification
async function hashPassword(
  password: string,
  salt: Uint8Array
): Promise<string> {
  const data = stringToBytes(password + bytesToBase64(salt));
  const hashBuffer = await crypto.subtle.digest("SHA-256", toArrayBuffer(data));
  return bytesToBase64(new Uint8Array(hashBuffer));
}

// ============================================
// ENCRYPTION / DECRYPTION
// ============================================

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
}

export async function encrypt(
  plaintext: string,
  password: string
): Promise<EncryptedData> {
  const salt = generateRandomBytes(SALT_LENGTH);
  const iv = generateRandomBytes(IV_LENGTH);
  const key = await deriveKey(password, salt);

  const plaintextBytes = stringToBytes(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintextBytes)
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
  };
}

export async function decrypt(
  encrypted: EncryptedData,
  password: string
): Promise<string> {
  const salt = base64ToBytes(encrypted.salt);
  const iv = base64ToBytes(encrypted.iv);
  const ciphertext = base64ToBytes(encrypted.ciphertext);

  const key = await deriveKey(password, salt);

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext)
    );
    return bytesToString(new Uint8Array(plaintextBuffer));
  } catch {
    throw new Error("Decryption failed - incorrect password or corrupted data");
  }
}

// ============================================
// VAULT ITEM MANAGEMENT
// ============================================

export interface VaultItem {
  id?: string;
  item_type: string;
  item_name: string;
  data: unknown;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EncryptedVaultItem {
  item_type: string;
  item_name: string;
  encrypted_data: string;
  encryption_iv: string;
  key_derivation_salt: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export async function encryptVaultItem(
  item: VaultItem,
  vaultPassword: string
): Promise<EncryptedVaultItem> {
  const plaintext = JSON.stringify(item.data);
  const encrypted = await encrypt(plaintext, vaultPassword);

  return {
    item_type: item.item_type,
    item_name: item.item_name,
    encrypted_data: encrypted.ciphertext,
    encryption_iv: encrypted.iv,
    key_derivation_salt: encrypted.salt,
    tags: item.tags,
    metadata: item.metadata,
  };
}

export async function decryptVaultItem(
  encryptedItem: EncryptedVaultItem & { id: string },
  vaultPassword: string
): Promise<VaultItem> {
  const decrypted = await decrypt(
    {
      ciphertext: encryptedItem.encrypted_data,
      iv: encryptedItem.encryption_iv,
      salt: encryptedItem.key_derivation_salt,
    },
    vaultPassword
  );

  return {
    id: encryptedItem.id,
    item_type: encryptedItem.item_type,
    item_name: encryptedItem.item_name,
    data: JSON.parse(decrypted),
    tags: encryptedItem.tags,
    metadata: encryptedItem.metadata,
  };
}

// ============================================
// VAULT KEY MANAGEMENT
// ============================================

export interface VaultKeySetup {
  keyHash: string;
  salt: string;
}

export async function setupVaultKey(password: string): Promise<VaultKeySetup> {
  const salt = generateRandomBytes(SALT_LENGTH);
  const keyHash = await hashPassword(password, salt);

  return {
    keyHash,
    salt: bytesToBase64(salt),
  };
}

export async function verifyVaultKey(
  password: string,
  expectedHash: string,
  salt: string
): Promise<boolean> {
  const saltBytes = base64ToBytes(salt);
  const computedHash = await hashPassword(password, saltBytes);
  return computedHash === expectedHash;
}

// ============================================
// PASSWORD STRENGTH CHECKER
// ============================================

export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  else feedback.push("Use at least 8 characters");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Add uppercase letters");

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Add lowercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Add numbers");

  if (/[^A-Za-z0-9]/.test(password)) score += 2;
  else feedback.push("Add special characters");

  return {
    score: Math.max(0, Math.min(10, score)),
    feedback,
  };
}

// ============================================
// EXPORTS
// ============================================

export const SecurityVault = {
  encrypt,
  decrypt,
  encryptVaultItem,
  decryptVaultItem,
  setupVaultKey,
  verifyVaultKey,
  checkPasswordStrength,
  generateRandomBytes,
};

export default SecurityVault;
