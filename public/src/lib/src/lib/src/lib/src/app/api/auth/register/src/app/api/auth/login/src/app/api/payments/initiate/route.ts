import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { userId, momoPhone, planType } = await req.json();

    if (!userId || !momoPhone || !['monthly', 'academic_year'].includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid payment details.' },
        { status: 400 }
      );
    }

    const digits = momoPhone.replace(/\D/g, '');
    const cleanPhone = digits.startsWith('237') ? digits.slice(3) : digits;

    if (cleanPhone.length !== 9 || !cleanPhone.startsWith('6')) {
      return NextResponse.json(
        { error: 'Enter a valid 9-digit MTN Cameroon number.' },
        { status: 400 }
      );
    }

    const amountXaf = planType === 'monthly' ? 350 : 2100;
    const externalRef = `GCE_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const supabase = getServiceSupabase();

    const { error: txError } = await supabase.from('transactions').insert({
      user_id: userId,
      external_ref: externalRef,
      plan_type: planType,
      amount_xaf: amountXaf,
      status: 'pending',
    });

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // Fapshi Direct MTN MoMo Initiate Endpoint
    const fapshiRes = await fetch('https://fapshi.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apiuser: process.env.FAPSHI_API_USER || '',
        apikey: process.env.FAPSHI_API_KEY || '',
      },
      body: JSON.stringify({
        amount: amountXaf,
        phone: cleanPhone,
        medium: 'mobile money',
        externalId: externalRef,
        message: `GCE Pass ${planType === 'monthly' ? 'Monthly (350 XAF)' : 'Academic Year (2100 XAF)'}`,
      }),
    });

    const fapshiData = await fapshiRes.json();

    if (!fapshiRes.ok) {
      return NextResponse.json(
        { error: fapshiData.message || 'Could not trigger MTN MoMo prompt.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      externalRef,
      transId: fapshiData.transId,
      message: 'Check your phone and enter your MTN MoMo PIN to confirm.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Payment initiation failed.' },
      { status: 500 }
    );
  }
}
  
