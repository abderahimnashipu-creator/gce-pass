import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const adminUserId = String(formData.get('adminUserId') || '');

    if (!file || !adminUserId) {
      return NextResponse.json({ error: 'Missing file or admin ID' }, { status: 400 });
    }

    const { data: admin } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (admin?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `diag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.webp`;

    const { data, error } = await supabaseAdmin.storage
      .from('diagrams')
      .upload(fileName, buffer, { contentType: file.type || 'image/webp', upsert: true });

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('diagrams').getPublicUrl(data.path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch {
    return NextResponse.json({ error: 'Server upload error' }, { status: 500 });
  }
      }
