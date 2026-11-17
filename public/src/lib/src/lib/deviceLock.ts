'use client';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('gce_device_id');
  if (!deviceId) {
    deviceId =
      'dev_' +
      Math.random().toString(36).substring(2, 12) +
      '_' +
      Date.now().toString(36);
    localStorage.setItem('gce_device_id', deviceId);
  }
  return deviceId;
}

export function hasDeviceUsedTrial(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('gce_trial_claimed') === 'true';
}

export function markDeviceTrialUsed(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('gce_trial_claimed', 'true');
}
