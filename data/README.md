This folder stores interview transcript JSON files written by the app.

Schema overview (simplified):
{
  "version": 2,
  "metadata": {
    "generatedAt": "2024-01-01T12:00:00.000Z",
    "startedAt": "2024-01-01T11:59:20.000Z",
    "endedAt": "2024-01-01T12:00:00.000Z",
    "messageCount": 42,
    "source": "livekit-session"
  },
  "participants": {
    "user": {
      "name": "Participant display name",
      "identity": "Participant identity"
    },
    "agent": {
      "name": "Participant display name",
      "identity": "Participant identity"
    }
  },
  "turns": [
    {
      "role": "user | agent | unknown",
      "text": "Message content",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "type": "userTranscript | agentTranscript | chatMessage"
    }
  ]
}
