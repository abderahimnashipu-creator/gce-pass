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
    const { phone, pin, deviceId } = await req.json();

    const normalizedPhone = normalizeCameroonPhone(phone || '');
    if (!normalizedPhone || !pin) {
      return NextResponse.json(
        { error: 'Phone number and PIN are required.' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Account not found. Please sign up first.' },
        { status: 404 }
      );
    }

    const validPin = await bcrypt.compare(pin, user.pin_hash);
    if (!validPin) {
      return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 401 });
    }

    const devices: string[] = Array.isArray(user.registered_device_ids)
      ? user.registered_device_ids
      : [];

    if (deviceId && !devices.includes(deviceId)) {
      if (devices.length >= 2) {
        return NextResponse.json(
          {
            error:
              'Device limit reached (max 2 devices per account). Use one of your registered phones.',
          },
          { status: 403 }
        );
      }
      const updatedDevices = [...devices, deviceId];
      await supabase
        .from('users')
        .update({ registered_device_ids: updatedDevices })
        .eq('id', user.id);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        phone_number: user.phone_number,
        role: user.role,
        subscription_plan: user.subscription_plan,
        subscription_expires_at: user.subscription_expires_at,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 });
  }
}
