"""
FastAPI server that provides a web API interface for the Scout agent.
Handles streaming responses and conversation state management.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
import json
import uuid
from pathlib import Path
from contextlib import asynccontextmanager

from scout.client import stream_graph_response, initialize_scout_agent, cleanup_scout_agent
from scout.graph import ScoutState
from langchain_core.messages import HumanMessage


class ChatMessage(BaseModel):
    message: str
    thread_id: Optional[str] = None


class ChatResponse(BaseModel):
    thread_id: str
    message: str


# Global variables to store the agent and client
agent_graph = None
mcp_client = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Initialize and cleanup the MCP client and agent."""
    global agent_graph, mcp_client

    try:
        # Initialize Scout agent using shared functions from client.py
        mcp_client, agent_graph = await initialize_scout_agent()
        yield

    except Exception as e:
        print(f"Failed to initialize Scout agent: {e}")
        yield
    finally:
        # Clean up Scout agent
        await cleanup_scout_agent()


app = FastAPI(title="Scout Agent API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "agent_ready": agent_graph is not None}


@app.post("/chat")
async def chat_endpoint(chat_message: ChatMessage):
    """
    Chat endpoint that returns streaming responses from the Scout agent.
    """
    if not agent_graph:
        raise HTTPException(status_code=503, detail="Scout agent not initialized")
    
    # Generate thread_id if not provided
    thread_id = chat_message.thread_id or str(uuid.uuid4())
    
    # Create graph config with thread_id for memory
    graph_config = {
        "configurable": {
            "thread_id": thread_id
        }
    }
    
    async def generate_response():
        """Generate streaming response from the Scout agent."""
        try:
            # Send initial response with thread_id
            yield f"data: {json.dumps({'type': 'thread_id', 'thread_id': thread_id})}\n\n"

            # Create input state
            input_state = ScoutState(messages=[HumanMessage(content=chat_message.message)])

            # Stream response from agent
            async for response_chunk in stream_graph_response(
                input=input_state,
                graph=agent_graph,
                config=graph_config
            ):
                # Check if this is a tool call indicator
                if "< TOOL CALL:" in response_chunk and ">" in response_chunk:
                    # Extract tool name
                    start_idx = response_chunk.find("< TOOL CALL:") + len("< TOOL CALL:")
                    end_idx = response_chunk.find(">", start_idx)
                    if end_idx > start_idx:
                        tool_name = response_chunk[start_idx:end_idx].strip()
                        yield f"data: {json.dumps({'type': 'tool_call', 'tool_name': tool_name})}\n\n"
                        # Send any remaining content after the tool call
                        remaining_content = response_chunk[response_chunk.find(">", start_idx) + 1:]
                        if remaining_content.strip():
                            yield f"data: {json.dumps({'type': 'content', 'content': remaining_content})}\n\n"
                    else:
                        # Send as regular content if parsing fails
                        yield f"data: {json.dumps({'type': 'content', 'content': response_chunk})}\n\n"
                else:
                    # Send regular content
                    yield f"data: {json.dumps({'type': 'content', 'content': response_chunk})}\n\n"

            # Send completion signal
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            # Send error message
            error_msg = f"Error processing request: {str(e)}"
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )


@app.get("/conversations/{thread_id}")
async def get_conversation(thread_id: str):
    """Get conversation history for a specific thread."""
    # This would require implementing conversation storage
    # For now, return a placeholder
    return {"thread_id": thread_id, "messages": []}


@app.get("/visualizations/{filename}")
async def get_visualization(filename: str):
    """
    Serve visualization JSON files from the output directory.

    Args:
        filename: The name of the visualization file (with or without .json extension)

    Returns:
        JSON response containing the Plotly visualization data
    """
    # Ensure filename has .json extension
    if not filename.endswith('.json'):
        filename += '.json'

    # Construct the file path
    file_path = Path("output") / filename

    # Check if file exists
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Visualization '{filename}' not found"
        )

    try:
        # Read and return the JSON file
        with open(file_path, 'r') as f:
            visualization_data = json.load(f)

        return JSONResponse(
            content=visualization_data,
            headers={
                "Cache-Control": "no-cache",
                "Access-Control-Allow-Origin": "*",
            }
        )

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid JSON format in visualization file '{filename}'"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading visualization file: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
