import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/lib/supabaseServer';

/**
 * GET /api/signed-url?bucket=deliverables&path=projects/123/IMG_001.jpg&expires=300
 * POST { bucket, path, expires }
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const bucket = url.searchParams.get('bucket') || 'deliverables';
  const path = url.searchParams.get('path');
  const expires = Number(url.searchParams.get('expires') ?? 300);

  if (!path) {
    return NextResponse.json({ error: 'Missing "path" query param' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ signedUrl: data?.signedUrl ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const bucket = body?.bucket || 'deliverables';
  const path: string | undefined = body?.path;
  const expires: number = Number(body?.expires ?? 300);

  if (!path) {
    return NextResponse.json({ error: 'Missing "path" in body' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ signedUrl: data?.signedUrl ?? null });
}

