# Agent Starter for React

> **Note:** This project is a fork of the [LiveKit Agent Starter for React](https://github.com/livekit-examples/agent-starter-react) template. We've extended it with authentication and database integration features.

This is a starter template for [LiveKit Agents](https://docs.livekit.io/agents) that provides a simple voice interface using the [LiveKit JavaScript SDK](https://github.com/livekit/client-sdk-js). It supports [voice](https://docs.livekit.io/agents/start/voice-ai), [transcriptions](https://docs.livekit.io/agents/build/text/), and [virtual avatars](https://docs.livekit.io/agents/integrations/avatar).

## Modifications

This fork includes the following enhancements:

- **Google OAuth Authentication**: Users must sign in with Google before starting a conversation with the agent
- **Database Integration**: Interview transcripts are automatically saved to a Supabase PostgreSQL database
- **Transcript Parsing**: Full conversation data is stored in JSONB format for easy querying and analysis

Also available for:
[Android](https://github.com/livekit-examples/agent-starter-android) • [Flutter](https://github.com/livekit-examples/agent-starter-flutter) • [Swift](https://github.com/livekit-examples/agent-starter-swift) • [React Native](https://github.com/livekit-examples/agent-starter-react-native)

<picture>
  <source srcset="./.github/assets/readme-hero-dark.webp" media="(prefers-color-scheme: dark)">
  <source srcset="./.github/assets/readme-hero-light.webp" media="(prefers-color-scheme: light)">
  <img src="./.github/assets/readme-hero-light.webp" alt="App screenshot">
</picture>

### Features:

- Real-time voice interaction with LiveKit Agents
- Google OAuth authentication via Supabase
- Automatic transcript saving to PostgreSQL database
- Camera video streaming support
- Screen sharing capabilities
- Audio visualization and level monitoring
- Virtual avatar integration
- Light/dark theme switching with system preference detection
- Customizable branding, colors, and UI text via configuration

This template is built with Next.js and is free for you to use or modify as you see fit.

### Project structure

```
agent-starter-react/
├── app/
│   ├── (app)/
│   ├── api/
│   ├── components/
│   ├── fonts/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── livekit/
│   ├── ui/
│   ├── app.tsx
│   ├── session-view.tsx
│   └── welcome.tsx
├── hooks/
├── lib/
├── public/
└── package.json
```

## Getting started

> [!TIP]
> If you'd like to try this application without modification, you can deploy an instance in just a few clicks with [LiveKit Cloud Sandbox](https://cloud.livekit.io/projects/p_/sandbox/templates/agent-starter-react).

[![Open on LiveKit](https://img.shields.io/badge/Open%20on%20LiveKit%20Cloud-002CF2?style=for-the-badge&logo=external-link)](https://cloud.livekit.io/projects/p_/sandbox/templates/agent-starter-react)

Run the following command to automatically clone this template.

```bash
lk app create --template agent-starter-react
```

Then run the app with:

```bash
pnpm install
pnpm dev
```

And open http://localhost:3000 in your browser.

You'll also need an agent to speak with. Try our starter agent for [Python](https://github.com/livekit-examples/agent-starter-python), [Node.js](https://github.com/livekit-examples/agent-starter-node), or [create your own from scratch](https://docs.livekit.io/agents/start/voice-ai/).

## Configuration

This starter is designed to be flexible so you can adapt it to your specific agent use case. You can easily configure it to work with different types of inputs and outputs:

#### Example: App configuration (`app-config.ts`)

```ts
export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'LiveKit',
  pageTitle: 'LiveKit Voice Agent',
  pageDescription: 'A voice agent built with LiveKit',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: '/lk-logo.svg',
  accent: '#002cf2',
  logoDark: '/lk-logo-dark.svg',
  accentDark: '#1fd5f9',
  startButtonText: 'Start call',

  // agent dispatch configuration
  agentName: undefined,

  // LiveKit Cloud Sandbox configuration
  sandboxId: undefined,
};
```

You can update these values in [`app-config.ts`](./app-config.ts) to customize branding, features, and UI text for your deployment.

> [!NOTE]
> The `sandboxId` is for the LiveKit Cloud Sandbox environment.
> It is not used for local development.

#### Environment Variables

You'll need to configure your credentials in `.env` (or `.env.local`):

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=https://your-livekit-server-url

# Agent dispatch (https://docs.livekit.io/agents/server/agent-dispatch)
# Leave AGENT_NAME blank to enable automatic dispatch
# Provide an agent name to enable explicit dispatch
AGENT_NAME=

# Supabase Configuration (for authentication and database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

These are required for the voice agent functionality and authentication to work.

## Authentication & Database

### Google OAuth Setup

This application uses Supabase for Google OAuth authentication. Before users can start a conversation with the agent, they must sign in with their Google account.

**Supabase Configuration:**

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider and configure your Google OAuth credentials
4. In **Authentication** → **URL Configuration**:
   - Set **Site URL** to your application's domain (e.g., `https://your-app.vercel.app` or `http://localhost:3000` for local dev)
   - Add **Redirect URLs**:
     - `http://localhost:3000/auth/callback` (for local development)
     - `https://your-production-domain.com/auth/callback` (for production)

### Database Schema

Interview transcripts are automatically saved to a PostgreSQL database table. The application expects the following table structure:

```sql
create table public.voice_interviews (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  audio_url text null,
  transcript text null,
  duration_seconds integer null default 0,
  story_threads jsonb null default '[]'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint voice_interviews_pkey primary key (id),
  constraint voice_interviews_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;
```

**Transcript Storage:**

- `transcript`: Plain text format of the conversation (formatted from turns)
- `story_threads`: Full JSON data stored as JSONB, containing:
  - Complete conversation metadata (start time, end time, message count)
  - Participant information
  - All conversation turns with timestamps and roles
  - This allows for rich querying and analysis of interview data

**Uploading Existing Transcripts:**

If you have existing transcript JSON files in the `data/` folder, you can upload them to the database using:

```bash
pnpm upload-transcripts <user_id>
```

This script will:
- Validate that the user exists in the database
- Parse all JSON files from the `data/` folder
- Calculate duration and format transcript text
- Insert records into the `voice_interviews` table

## Credits & Acknowledgments

This project is built on top of excellent open-source tools and libraries:

- **[LiveKit](https://livekit.io/)** - Real-time communication infrastructure for voice and video agents
- **[Next.js](https://nextjs.org/)** - React framework for production
- **[Supabase](https://supabase.com/)** - Open-source Firebase alternative providing authentication and PostgreSQL database
- **[React](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Typed JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[@supabase/ssr](https://github.com/supabase/ssr)** - Supabase server-side rendering utilities
- **[@livekit/components-react](https://github.com/livekit/components-react)** - React components for LiveKit

### Original Template

This project is a fork of the [LiveKit Agent Starter for React](https://github.com/livekit-examples/agent-starter-react) template. We've extended it with:

- Google OAuth authentication via Supabase
- Automatic transcript saving to PostgreSQL
- Database integration for interview data analysis

Special thanks to the LiveKit team for creating the original template and providing excellent documentation.

## Contributing

This template is open source and we welcome contributions! Please open a PR or issue through GitHub, and don't forget to join us in the [LiveKit Community Slack](https://livekit.io/join-slack)!
