import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'data');

function sanitizeFilename(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return new NextResponse('Invalid transcript payload.', { status: 400 });
    }

    const metadata = body.metadata as Record<string, unknown> | undefined;
    const generatedAt =
      typeof metadata?.generatedAt === 'string' ? metadata.generatedAt : new Date().toISOString();
    const safeTimestamp = sanitizeFilename(generatedAt) || `${Date.now()}`;
    const uniqueSuffix = Math.random().toString(36).slice(2, 8);
    const fileName = `interview-transcript-${safeTimestamp}-${uniqueSuffix}.json`;

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      path.join(DATA_DIR, fileName),
      `${JSON.stringify(body, null, 2)}\n`,
      'utf8'
    );

    return NextResponse.json({ ok: true, fileName });
  } catch (error) {
    console.error('Failed to write interview transcript.', error);
    return new NextResponse('Failed to save transcript.', { status: 500 });
  }
}
