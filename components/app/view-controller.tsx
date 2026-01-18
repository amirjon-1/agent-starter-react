'use client';

import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext, useSessionMessages } from '@livekit/components-react';
import type { ReceivedMessage } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { SessionView } from '@/components/app/session-view';
import { WelcomeView } from '@/components/app/welcome-view';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionSessionView = motion.create(SessionView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.5,
    ease: 'linear',
  },
};

type TranscriptRole = 'user' | 'agent' | 'unknown';

type TranscriptParticipant = {
  name?: string;
  identity?: string;
};

type TranscriptTurn = {
  role: TranscriptRole;
  text: string;
  timestamp: string | null;
  type: ReceivedMessage['type'];
};

type TranscriptExport = {
  version: 2;
  metadata: {
    generatedAt: string;
    startedAt: string | null;
    endedAt: string | null;
    messageCount: number;
    source: 'livekit-session';
  };
  participants: Partial<Record<TranscriptRole, TranscriptParticipant>>;
  turns: TranscriptTurn[];
};

function getMessageRole(message: ReceivedMessage): TranscriptRole {
  if (message.type === 'agentTranscript') {
    return 'agent';
  }
  if (message.type === 'userTranscript') {
    return 'user';
  }
  if (message.from?.isAgent) {
    return 'agent';
  }
  if (message.from?.isLocal) {
    return 'user';
  }
  return 'unknown';
}

function toIsoTimestamp(timestamp: number): string | null {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function cleanValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildTranscriptExport(messages: ReceivedMessage[]): TranscriptExport {
  const participants: Partial<Record<TranscriptRole, TranscriptParticipant>> = {};
  const turns: TranscriptTurn[] = [];

  for (const message of messages) {
    const rawText = 'message' in message ? message.message : '';
    const text = cleanValue(rawText);
    if (!text) {
      continue;
    }

    const role = getMessageRole(message);
    const timestamp = toIsoTimestamp(message.timestamp);
    turns.push({
      role,
      text,
      timestamp,
      type: message.type,
    });

    const name = cleanValue(message.from?.name);
    const identity = cleanValue(message.from?.identity);
    if (name || identity) {
      participants[role] = {
        name: participants[role]?.name ?? name,
        identity: participants[role]?.identity ?? identity,
      };
    }
  }

  const startedAt = turns[0]?.timestamp ?? null;
  const endedAt = turns.length > 0 ? turns[turns.length - 1].timestamp : null;

  return {
    version: 2,
    metadata: {
      generatedAt: new Date().toISOString(),
      startedAt,
      endedAt,
      messageCount: turns.length,
      source: 'livekit-session',
    },
    participants,
    turns,
  };
}

interface ViewControllerProps {
  appConfig: AppConfig;
}

export function ViewController({ appConfig }: ViewControllerProps) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const messagesRef = useRef<ReceivedMessage[]>([]);
  const hasConnectedOnceRef = useRef(false);
  const hasExportedRef = useRef(false);

  const saveTranscript = useCallback(async (payload: TranscriptExport) => {
    try {
      const response = await fetch('/api/interview-transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save transcript: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to save transcript to server.', error);
    }
  }, []);

  const exportTranscript = useCallback(() => {
    if (hasExportedRef.current) {
      return;
    }
    const currentMessages = messagesRef.current;
    if (currentMessages.length === 0) {
      hasExportedRef.current = true;
      return;
    }
    const payload = buildTranscriptExport(currentMessages);
    hasExportedRef.current = true;
    void saveTranscript(payload);
  }, [saveTranscript]);

  useEffect(() => {
    if (session.isConnected) {
      messagesRef.current = [];
      hasConnectedOnceRef.current = true;
      hasExportedRef.current = false;
    } else if (hasConnectedOnceRef.current) {
      exportTranscript();
    }
  }, [session.isConnected, exportTranscript]);

  useEffect(() => {
    if (session.isConnected) {
      messagesRef.current = messages;
    }
  }, [messages, session.isConnected]);

  return (
    <AnimatePresence mode="wait">
      {/* Welcome view */}
      {!session.isConnected && (
        <MotionWelcomeView
          key="welcome"
          {...VIEW_MOTION_PROPS}
          startButtonText={appConfig.startButtonText}
          onStartCall={session.start}
        />
      )}
      {/* Session view */}
      {session.isConnected && (
        <MotionSessionView
          key="session-view"
          {...VIEW_MOTION_PROPS}
          appConfig={appConfig}
          messages={messages}
        />
      )}
    </AnimatePresence>
  );
}
