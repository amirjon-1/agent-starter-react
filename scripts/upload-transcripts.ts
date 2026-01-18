import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TranscriptData {
  version: number;
  metadata: {
    generatedAt: string;
    startedAt: string | null;
    endedAt: string | null;
    messageCount: number;
    source: string;
  };
  participants: Record<string, { name?: string; identity?: string }>;
  turns: Array<{
    role: string;
    text: string;
    timestamp: string | null;
    type: string;
  }>;
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

async function uploadTranscript(
  filePath: string,
  data: TranscriptData,
  userId: string
): Promise<void> {
  const { metadata, turns } = data;
  const transcriptText = buildTranscriptText(turns);
  const durationSeconds = calculateDurationSeconds(metadata.startedAt, metadata.endedAt);

  const { error } = await supabase.from('voice_interviews').insert({
    user_id: userId,
    transcript: transcriptText,
    duration_seconds: durationSeconds,
    story_threads: data,
  });

  if (error) {
    console.error(`Failed to upload ${filePath}:`, error);
    throw error;
  }

  console.log(`✓ Uploaded ${filePath}`);
}

async function main() {
  const dataDir = join(process.cwd(), 'data');
  const userId = process.argv[2];

  if (!userId) {
    console.error('Usage: tsx scripts/upload-transcripts.ts <user_id>');
    console.error('You need to provide a user_id (UUID) to associate the transcripts with.');
    process.exit(1);
  }

  // Validate user exists
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    console.error(`User with id ${userId} not found`);
    process.exit(1);
  }

  console.log(`Uploading transcripts for user: ${user.email} (${userId})`);

  try {
    const files = await readdir(dataDir);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    console.log(`Found ${jsonFiles.length} transcript files`);

    for (const file of jsonFiles) {
      const filePath = join(dataDir, file);
      const content = await readFile(filePath, 'utf-8');
      const data: TranscriptData = JSON.parse(content);

      try {
        await uploadTranscript(file, data, userId);
      } catch (error) {
        console.error(`Error uploading ${file}:`, error);
      }
    }

    console.log(`\n✓ Completed uploading ${jsonFiles.length} transcripts`);
  } catch (error) {
    console.error('Error reading data directory:', error);
    process.exit(1);
  }
}

main().catch(console.error);
