export interface MistakeItem {
  id: string;
  subjectName: string;
  question_text: string;
  options: { A: string; B: string; C: string; D: string };
  static_correct_answer: string;
  static_explanation?: string;
  diagram_url?: string | null;
  savedAt: number;
}

const STORAGE_KEY = 'gce_pass_mistake_bank_v1';

export function getMistakes(): MistakeItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MistakeItem[]) : [];
  } catch {
    return [];
  }
}

export function saveMistakes(items: MistakeItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getMistakes();
    const map = new Map<string, MistakeItem>();
    existing.forEach((m) => map.set(m.id, m));
    items.forEach((item) => map.set(item.id, item));
    const merged = Array.from(map.values()).slice(-300);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage quota errors safely
  }
}

export function removeMistake(id: string): MistakeItem[] {
  const updated = getMistakes().filter((m) => m.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function removeSubjectMistakes(subjectName: string): MistakeItem[] {
  const updated = getMistakes().filter((m) => m.subjectName !== subjectName);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}
