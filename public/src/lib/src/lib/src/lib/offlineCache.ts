'use client';

import Dexie, { Table } from 'dexie';
import CryptoJS from 'crypto-js';

export interface CachedPaper {
  paperId: string;
  encryptedPayload: string;
  cachedAt: number;
}

class GceOfflineDB extends Dexie {
  papers!: Table<CachedPaper, string>;

  constructor() {
    super('GcePassOfflineDB');
    this.version(1).stores({
      papers: 'paperId, cachedAt',
    });
  }
}

export const offlineDb = new GceOfflineDB();

export function isSubscriptionActive(expiresAt: string): boolean {
  if (!expiresAt) return false;
  return Date.now() < new Date(expiresAt).getTime();
}

export async function savePaperOffline(
  paperId: string,
  data: any,
  userId: string,
  expiresAt: string
) {
  if (!isSubscriptionActive(expiresAt)) return;
  const secretKey = `${userId}_${expiresAt}`;
  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(data),
    secretKey
  ).toString();

  await offlineDb.papers.put({
    paperId,
    encryptedPayload,
    cachedAt: Date.now(),
  });
}

export async function loadPaperOffline(
  paperId: string,
  userId: string,
  expiresAt: string
): Promise<any | null> {
  if (!isSubscriptionActive(expiresAt)) {
    return null;
  }
  const record = await offlineDb.papers.get(paperId);
  if (!record) return null;

  try {
    const secretKey = `${userId}_${expiresAt}`;
    const bytes = CryptoJS.AES.decrypt(record.encryptedPayload, secretKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) return null;
    return JSON.parse(decryptedText);
  } catch {
    return null;
  }
}
