"""
FastAPI server that provides a web API interface for the Scout agent.
Handles streaming responses and conversation state management.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import asyncio
import json
import uuid
import re
from contextlib import asynccontextmanager

from scout.client import stream_graph_response
from scout.graph import ScoutAgent, ScoutState
from scout.my_mcp.config import mcp_config
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_core.messages import HumanMessage


def detect_visualization_data(content: str) -> tuple[str, dict | None]:
    """
    Detect if content contains Plotly visualization data and extract it.
    Returns (cleaned_content, visualization_data)
    """
    import os

    # Check for file references to JSON visualizations
    if "output/" in content and ".json" in content:
        # Look for file paths in the content
        file_pattern = r'output/[^\s]+\.json'
        matches = re.findall(file_pattern, content)

        for file_path in matches:
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r') as f:
                        file_content = f.read()
                        parsed = json.loads(file_content)
                        if isinstance(parsed, dict) and "data" in parsed and "layout" in parsed:
                            # Remove the file reference from content
                            cleaned_content = content.replace(file_path, "").strip()
                            return cleaned_content, parsed
                except (json.JSONDecodeError, IOError):
                    continue

    # Look for JSON objects that might be Plotly figures
    # They typically start with {"data": and contain "layout":
    try:
        # Find JSON-like structures in the content
        json_pattern = r'\{[^{}]*"data"\s*:\s*\[[^\]]*\][^{}]*"layout"\s*:\s*\{[^{}]*\}[^{}]*\}'
        matches = re.findall(json_pattern, content, re.DOTALL)

        for match in matches:
            try:
                # Try to parse as JSON
                parsed = json.loads(match)
                if isinstance(parsed, dict) and "data" in parsed and "layout" in parsed:
                    # This looks like a Plotly figure
                    cleaned_content = content.replace(match, "").strip()
                    return cleaned_content, parsed
            except json.JSONDecodeError:
                continue

        # Also check if the entire content is a JSON visualization
        if content.strip().startswith('{"data":') and '"layout":' in content:
            try:
                parsed = json.loads(content.strip())
                if isinstance(parsed, dict) and "data" in parsed and "layout" in parsed:
                    return "", parsed
            except json.JSONDecodeError:
                pass

    except Exception:
        pass

    return content, None


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
async def lifespan(app: FastAPI):
    """Initialize and cleanup the MCP client and agent."""
    global agent_graph, mcp_client
    
    try:
        # Initialize MCP client
        mcp_client = MultiServerMCPClient(connections=mcp_config)
        
        # Get tools from all connected servers
        tools = await mcp_client.get_tools()
        
        # Create Scout agent
        scout_agent = ScoutAgent(tools=tools)
        agent_graph = scout_agent.runnable
        
        print("Scout agent initialized successfully")
        yield
        
    except Exception as e:
        print(f"Failed to initialize Scout agent: {e}")
        yield
    finally:
        # Cleanup
        if mcp_client:
            try:
                if hasattr(mcp_client, 'close'):
                    await mcp_client.close()
                elif hasattr(mcp_client, 'cleanup'):
                    await mcp_client.cleanup()
            except Exception as cleanup_error:
                print(f"Warning: Error during client cleanup: {cleanup_error}")


app = FastAPI(title="Scout Agent API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
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
            accumulated_content = ""
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
                            accumulated_content += remaining_content
                    else:
                        # Send as regular content if parsing fails
                        accumulated_content += response_chunk
                else:
                    # Accumulate content to check for visualizations
                    accumulated_content += response_chunk

                    # Check if we have a complete visualization
                    cleaned_content, viz_data = detect_visualization_data(accumulated_content)

                    if viz_data:
                        # Send any text content before the visualization
                        if cleaned_content.strip():
                            yield f"data: {json.dumps({'type': 'content', 'content': cleaned_content})}\n\n"

                        # Send the visualization data
                        yield f"data: {json.dumps({'type': 'visualization', 'visualization_data': viz_data})}\n\n"

                        # Reset accumulated content
                        accumulated_content = ""
                    else:
                        # Send regular content chunk
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
