import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServiceSupabase } from '@/lib/supabase';

function normalizeCameroonPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('6')) {
    return '237' + digits;
  }
  if (digits.length === 12 && digits.startsWith('2376')) {
    return digits;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { phone, pin, deviceId, deviceTrialAlreadyUsed } = await req.json();

    const normalizedPhone = normalizeCameroonPhone(phone || '');
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Enter a valid Cameroon phone number (e.g. 677000000).' },
        { status: 400 }
      );
    }

    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be 4 to 6 digits.' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This phone number is already registered. Please log in.' },
        { status: 409 }
      );
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const now = new Date();
    const expiresAt = deviceTrialAlreadyUsed
      ? now.toISOString()
      : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        phone_number: normalizedPhone,
        pin_hash: pinHash,
        role: 'student',
        trial_used: true,
        subscription_plan: deviceTrialAlreadyUsed ? 'expired' : 'free_trial',
        subscription_expires_at: expiresAt,
        registered_device_ids: deviceId ? [deviceId] : [],
      })
      .select('id, phone_number, role, subscription_plan, subscription_expires_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: newUser });
  } catch {
    return NextResponse.json({ error: 'Registration failed.' }, { status: 500 });
  }
}
