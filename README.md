# Scout Agent - Data Analysis Chat Interface

A modern chat-based interface for the Scout data analysis agent, built with Next.js and TypeScript.

## Features

- **ChatGPT-like Interface**: Clean, modern chat interface with real-time streaming responses
- **Scout Agent Integration**: Connects to the Scout agent backend for data analysis and visualization
- **Tool Call Visualization**: Shows when the agent is using tools like database queries and chart generation
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **TypeScript**: Fully typed for better development experience

## Architecture

### Backend (Python)
- **FastAPI Server**: Provides REST API with Server-Sent Events (SSE) for streaming
- **Scout Agent**: LangGraph-based agent with MCP (Model Context Protocol) tool integration
- **MCP Servers**:
  - `datalysis`: Database querying and visualization
  - `filesystem`: File operations
  - `git`: Version control operations

### Frontend (Next.js)
- **React Components**: Modular, reusable chat interface components
- **shadcn/ui**: Consistent, accessible UI component library
- **Streaming Support**: Real-time message updates via SSE
- **State Management**: Custom hooks for chat state and conversation management

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js 18+
- uv (Python package manager)

### Backend Setup

1. Install Python dependencies:
```bash
uv sync
```

2. Set up environment variables (if needed):
```bash
# Add any required environment variables for database connections
export SUPABASE_URL="your_database_url"
```

3. Start the API server:
```bash
python api_server.py
```

The API server will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3001` (or 3000 if available)

## Usage

1. Open your browser to the frontend URL
2. Type questions about your data in the chat interface
3. Watch as Scout analyzes your request and provides insights
4. See tool calls in real-time as the agent queries databases and creates visualizations

### Example Queries
- "Show me the top 5 creators by revenue"
- "Create a chart of sales trends over time"
- "What are the key patterns in my data?"
- "Help me understand customer behavior"

## Development

### Project Structure
```
├── api_server.py              # FastAPI backend server
├── scout/                     # Scout agent implementation
│   ├── client.py             # MCP client and streaming logic
│   ├── graph.py              # LangGraph agent definition
│   └── my_mcp/               # MCP server configurations
├── frontend/                  # Next.js frontend
│   ├── src/
│   │   ├── components/chat/  # Chat interface components
│   │   ├── hooks/            # Custom React hooks
│   │   └── types/            # TypeScript type definitions
│   └── package.json
└── pyproject.toml            # Python dependencies
```

### Key Components

- **ChatInterface**: Main chat container component
- **MessageBubble**: Individual message display with user/assistant styling
- **ChatInput**: Message input with auto-resize and keyboard shortcuts
- **useChatState**: Hook for managing conversation state and API communication

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new interfaces
3. Keep components focused on single responsibilities
4. Test both frontend and backend integration

## License

This project is part of the dataAnalysis3 workspace.