import { NextResponse } from 'next/server';

type RouteParams = { id: string };

// ✅ Next 15: context.params is a Promise — await it
export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { id } = await context.params;

  // TODO: add your real delete logic here (DB/Supabase/etc.)
  // Example placeholder response so the build passes:
  return NextResponse.json({ ok: true, deleted: id }, { status: 200 });
}

