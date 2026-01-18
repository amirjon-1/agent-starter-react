import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createServerClient, getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_BUCKET = process.env.SUPABASE_TRANSCRIPTS_BUCKET || 'interview-transcripts';

function sanitizeFilename(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function calculateDurationSeconds(startedAt: string | null, endedAt: string | null): number {
  if (!startedAt || !endedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (isNaN(start) || isNaN(end)) return 0;
  return Math.floor((end - start) / 1000);
}

function buildTranscriptText(turns: Array<{ role: string; text: string }>): string {
  return turns.map((turn) => `${turn.role}: ${turn.text}`).join('\n');
}

export async function POST(req: Request) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = user.id;

    const body = (await req.json()) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return new NextResponse('Invalid transcript payload.', { status: 400 });
    }

    const metadata = body.metadata as Record<string, unknown> | undefined;
    const turns = (body.turns as Array<{ role: string; text: string; timestamp: string }>) || [];
    const startedAt = (metadata?.startedAt as string) || null;
    const endedAt = (metadata?.endedAt as string) || null;

    // Build transcript text
    const transcriptText = buildTranscriptText(turns);
    const durationSeconds = calculateDurationSeconds(startedAt, endedAt);

    // Save to database
    const { data: interview, error: dbError } = await supabase
      .from('voice_interviews')
      .insert({
        user_id: userId,
        transcript: transcriptText,
        duration_seconds: durationSeconds,
        story_threads: body, // Store the full JSON as story_threads
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Failed to save to database:', dbError);
      // Continue to save to file system as fallback
    }

    const payloadJson = `${JSON.stringify(body, null, 2)}\n`;

    // Also save to file system as backup
    const generatedAt =
      typeof metadata?.generatedAt === 'string' ? metadata.generatedAt : new Date().toISOString();
    const safeTimestamp = sanitizeFilename(generatedAt) || `${Date.now()}`;
    const uniqueSuffix = Math.random().toString(36).slice(2, 8);
    const fileName = `interview-transcript-${safeTimestamp}-${uniqueSuffix}.json`;

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, fileName), payloadJson, 'utf8');

    try {
      const supabaseAdmin = getSupabaseAdmin();
      const storagePath = `${userId}/${fileName}`;
      const { error: storageError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, Buffer.from(payloadJson), {
          contentType: 'application/json',
          upsert: false,
        });

      if (storageError) {
        console.error('Failed to upload transcript to Supabase storage:', storageError);
      }
    } catch (storageError) {
      console.error('Failed to upload transcript to Supabase storage:', storageError);
    }

    return NextResponse.json({
      ok: true,
      interviewId: interview?.id,
      fileName,
    });
  } catch (error) {
    console.error('Failed to write interview transcript.', error);
    return new NextResponse('Failed to save transcript.', { status: 500 });
  }
}
