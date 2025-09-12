"""
This file implements the MCP Client for our Langgraph Agent.

MCP Clients are responsible for connecting and communicating with MCP servers. 
This client is analagous to Cursor or Claude Desktop and you would configure them in the 
same way by specifying the MCP server configuration in my_mcp/mcp_config.json.
"""

from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.graph import StateGraph
from langchain_core.messages import HumanMessage, AIMessageChunk
from typing import AsyncGenerator, Tuple, Optional
from scout.my_mcp.config import mcp_config
from scout.graph import ScoutAgent, ScoutState


async def stream_graph_response(
        input: ScoutState, graph: StateGraph, config: dict = {}
        ) -> AsyncGenerator[str, None]:
    """
    Stream the response from the graph while parsing out tool calls.

    Args:
        input: The input for the graph.
        graph: The graph to run.
        config: The config to pass to the graph. Required for memory.

    Yields:
        A processed string from the graph's chunked response.
    """
    async for message_chunk, metadata in graph.astream(
        input=input,
        stream_mode="messages",
        config=config
        ):
        if isinstance(message_chunk, AIMessageChunk):
            if message_chunk.response_metadata:
                finish_reason = message_chunk.response_metadata.get("finish_reason", "")
                if finish_reason == "tool_calls":
                    yield "\n\n"

            if message_chunk.tool_call_chunks:
                tool_chunk = message_chunk.tool_call_chunks[0]

                tool_name = tool_chunk.get("name", "")
                args = tool_chunk.get("args", "")

                if tool_name:
                    yield f"\n\n< TOOL CALL: {tool_name} >\n\n"
                if args:
                    yield args
            else:
                # Handle different content formats (Anthropic vs other providers)
                content = message_chunk.content
                if isinstance(content, list):
                    # Anthropic format: list of content blocks
                    for block in content:
                        if isinstance(block, dict) and block.get('type') == 'text':
                            yield block.get('text', '')
                elif isinstance(content, str):
                    # Simple string format (Groq, etc.)
                    yield content
                else:
                    # Fallback: convert to string
                    yield str(content)
            continue


# Global variables to store the shared client and agent
_shared_client: Optional[MultiServerMCPClient] = None
_shared_agent_graph: Optional[StateGraph] = None


async def initialize_scout_agent() -> Tuple[MultiServerMCPClient, StateGraph]:
    """
    Initialize the MCP client and Scout agent. Reuses existing instances if available.

    Returns:
        Tuple of (mcp_client, agent_graph)
    """
    global _shared_client, _shared_agent_graph

    if _shared_client is None or _shared_agent_graph is None:
        # Create the MCP client
        _shared_client = MultiServerMCPClient(connections=mcp_config)

        # Get tools from all connected servers
        tools = await _shared_client.get_tools()

        # Create Scout agent
        agent = ScoutAgent(tools=tools)
        _shared_agent_graph = agent.runnable

        print("Scout agent initialized successfully")

    return _shared_client, _shared_agent_graph


async def cleanup_scout_agent():
    """Clean up the shared MCP client and agent."""
    global _shared_client, _shared_agent_graph

    if _shared_client is not None:
        try:
            if hasattr(_shared_client, 'close'):
                await _shared_client.close()
            elif hasattr(_shared_client, 'cleanup'):
                await _shared_client.cleanup()
        except Exception as cleanup_error:
            print(f"Warning: Error during client cleanup: {cleanup_error}")
        finally:
            _shared_client = None
            _shared_agent_graph = None


async def main():
    """
    Initialize the MCP client and run the agent conversation loop.
    """
    try:
        # Initialize the Scout agent
        client, graph = await initialize_scout_agent()

        # Pass a config with a thread_id to use memory
        graph_config = {
            "configurable": {
                "thread_id": "cli_session"
            }
        }

        while True:
            user_input = input("\n\nUSER: ")
            if user_input in ["quit", "exit"]:
                break

            print("\n ----  USER  ---- \n\n", user_input)
            print("\n ----  ASSISTANT  ---- \n\n")

            try:
                async for response in stream_graph_response(
                    input = ScoutState(messages=[HumanMessage(content=user_input)]),
                    graph = graph,
                    config = graph_config
                    ):
                    print(response, end="", flush=True)
            except Exception as e:
                print(f"\nError processing request: {e}")

    except Exception as e:
        print(f"Failed to initialize MCP client: {e}")
        print("Please check your configuration and environment variables.")
    finally:
        # Clean up the Scout agent
        await cleanup_scout_agent()

if __name__ == "__main__":
    import asyncio
    # only needed if running in an ipykernel
    import nest_asyncio
    nest_asyncio.apply()

    asyncio.run(main())