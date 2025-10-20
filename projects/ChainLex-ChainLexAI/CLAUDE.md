# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChainLex.ai is an AI-driven workbench for onboarding real-world assets (RWA) to blockchain networks. It orchestrates compliance automation, contract generation, and post-deployment monitoring through an AI-first workspace.

## Architecture

### Frontend Structure
- **Next.js App Router** with TypeScript and Tailwind CSS
- **shadcn/ui** component library for UI consistency
- **Three main pages**: `/compliance`, `/contracts`, `/dashboard`
- **State management**: React Query (@tanstack/react-query) for server state
- **Web3 integration**: wagmi + viem for blockchain interactions

### Backend Integration
- **Next.js API Routes** at `/api/*` for serverless functions
- **Python chatbot service** in `/chatbot/` using FastAPI and LangGraph
- **Database**: Neon Postgres with @neondatabase/serverless
- **AI**: OpenAI integration for document processing and compliance drafting

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable React components (UI in `components/ui/`)
- `lib/` - Utilities, DB clients, wagmi configuration, AI helpers
- `chatbot/` - Python FastAPI service for RWA document generation
- `design/` - UI prototypes and product specifications

## Development Commands

### Frontend (Next.js)
```bash
pnpm install          # Install dependencies (use pnpm over npm)
pnpm run dev         # Start development server (port 3000)
pnpm run build       # Build for production
pnpm run start       # Start production server
pnpm run lint        # Run ESLint
```

### Python Chatbot Service
```bash
cd chatbot
pip install -r requirements.txt
python app.py        # Start FastAPI server (port 8000)
# or
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## Core Features Implementation

### 1. Compliance Page (`/compliance`)
- **Three-column layout**: File upload, AI chat, document preview
- **File processing**: PDF/DOCX/image upload with AI extraction
- **AI chatbot**: Integration with Python backend for document drafting
- **Export**: Markdown and PDF generation capabilities

### 2. Contracts Page (`/contracts`)
- **Parameterized contracts**: Configuration panel for ERC-7943 tokens
- **Real-time preview**: Live code generation based on form inputs
- **Deployment**: viem + wagmi integration for testnet deployments
- **Simulation**: Transfer and oracle attestation flows

### 3. Dashboard (`/dashboard`)
- **Contract monitoring**: List view of deployed contracts
- **Event tracking**: Chain-based event ingestion and display
- **Analytics**: Token supply, holder statistics, transaction history

## API Architecture

### Next.js API Routes
- `/api/files` - File upload and management
- `/api/ai/*` - AI processing endpoints (interfaces with Python service)
- `/api/contract/*` - Contract generation and deployment
- `/api/dashboard/*` - Dashboard data endpoints

### Python Chatbot API (Port 8000)
- `/session/create` - Create chat sessions
- `/chat` - Interact with RWA document assistant
- `/session/{id}/export` - Export generated documents
- Full documentation at `/docs` and `/redoc`

## Development Guidelines

### Code Style
- **TypeScript strict mode** with proper typing
- **2-space indentation** following Prettier defaults
- **PascalCase** for React components, **camelCase** for hooks/utilities
- **kebab-case** for file names (except component files)
- Use `@/` path aliases instead of relative imports

### Component Architecture
- Build with **shadcn/ui primitives** in `components/ui/`
- Extract repeat patterns into dedicated components
- Use **compound patterns** for complex UI elements
- Implement **responsive design** with Tailwind breakpoints

### State Management
- **React Query** for server state and API caching
- **Local state** for UI interactions with useState/useReducer
- **wagmi hooks** for wallet and blockchain state
- Avoid prop drilling, prefer context providers where appropriate

## Environment Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL="postgresql://[neon-credentials]"

# AI Services
OPENAI_API_KEY="[openai-key]"

# Web3 (optional for development)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="[walletconnect-id]"

# File Storage
AWS_ACCESS_KEY_ID="[s3-credentials]"
AWS_SECRET_ACCESS_KEY="[s3-credentials]"
AWS_REGION="[s3-region]"
AWS_S3_BUCKET="[s3-bucket-name]"
```

## Testing Strategy
- Currently no test framework configured (in progress)
- Plan for **Jest + Testing Library** for component testing
- **viem/wagmi test utils** for Web3 integration tests
- API testing with **supertest** for routes

## Deployment Notes
- Designed for **Vercel** deployment with serverless functions
- Python service may require separate hosting (Railway, Render, or Vercel Functions)
- Neon database provisioned via Vercel integration
- Environment variables managed through Vercel dashboard

## Security Considerations
- **No KYC data on-chain**: Only attestation signatures
- **File encryption**: Server-side encryption for uploaded documents
- **Input validation**: Comprehensive validation for all user inputs
- **Rate limiting**: Consider for production API endpoints
- **CORS**: Properly configured for frontend-backend communication

## Development Workflow
1. Start frontend (`pnpm run dev`) on port 3000
2. Start chatbot service (`python chatbot/app.py`) on port 8000
3. Ensure Neon database is accessible
4. Test file upload and AI integration
5. Verify Web3 wallet connection functionality
6. Test contract deployment on testnets

## Key Integrations
- **Neon Database**: Serverless Postgres for persistent storage
- **OpenAI**: GPT models for document processing and chat
- **wagmi/viem**: Ethereum Web3 integration
- **shadcn/ui**: Component library with Radix UI primitives
- **Tailwind CSS**: Utility-first styling framework