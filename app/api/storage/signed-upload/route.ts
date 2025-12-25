import { NextRequest, NextResponse } from 'next/server';
import createSupabaseAdmin from '@/lib/supabaseAdmin';

/**
 * Create a one-time signed upload URL for Storage.
 * Requires SUPABASE_SERVICE_ROLE_KEY on the server.
 *
 * POST /api/storage/signed-upload
 * { "bucket": "deliverables", "path": "projects/123/myfile.jpg" }
 *
 * Response: { signedUrl, token, path }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const bucket = (body.bucket as string) || 'deliverables';
  const path = body.path as string | undefined;

  if (!path) {
    return NextResponse.json({ error: 'Missing "path" in body' }, { status: 400 });
  }

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server misconfigured' }, { status: 500 });
  }

  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // data contains: { signedUrl, token, path }
  return NextResponse.json(data);
}

