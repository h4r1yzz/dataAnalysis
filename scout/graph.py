from langchain_anthropic import ChatAnthropic
from langgraph.graph import StateGraph, add_messages, START, END
from langchain_core.messages import SystemMessage, BaseMessage
from pydantic import BaseModel, Field
from typing import List, Annotated, Optional
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langchain.tools import BaseTool
import os

from scout.prompts.prompts import scout_system_prompt, scout_datalysis_system_prompt


class ScoutState(BaseModel):
    messages: Annotated[List[BaseMessage], add_messages] = Field(default_factory=list)


class ScoutAgent:
    """
    ScoutAgent encapsulates a LangGraph agent for data science project management.

    Attributes:
        name: Name of the agent.
        tools: List of tools the agent can use.
        model: The LLM model to run.
        system_prompt: The system prompt for the agent.
        temperature: Sampling temperature for generation.
    """
    def __init__(
        self,
        name: str = "Scout",
        tools: Optional[List[BaseTool]] = None,
        model: str = "claude-3-5-haiku-20241022",
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
    ):
        self.name = name
        self.tools = tools or []
        self.model = model
        self.temperature = temperature

        # Select appropriate system prompt based on available tools
        self.system_prompt = self._select_prompt()

        # bind tools if provided
        self.llm = ChatAnthropic(model=self.model, temperature=self.temperature)
        if self.tools:
            self.llm = self.llm.bind_tools(self.tools)
            tools_json = [
                tool.model_dump_json(include=["name", "description"]) for tool in self.tools
            ]
            self.system_prompt = self.system_prompt.format(
                tools="\n".join(tools_json),
                working_dir=os.environ.get("MCP_FILESYSTEM_DIR"),
            )

        self.runnable = self._build_graph()

    def _select_prompt(self) -> str:
        """Select the appropriate prompt based on available tools."""
        if self.tools:
            tool_names = [tool.name for tool in self.tools]
            # If datalysis tools are available, use the data analysis prompt
            if any("datalysis" in name for name in tool_names):
                return scout_datalysis_system_prompt
        # Default to general Scout prompt
        return scout_system_prompt

    def _build_graph(self):
        """
        Build the LangGraph for ScoutAgent.
        """
        def scout_node(state: ScoutState) -> ScoutState:
            response = self.llm.invoke(
                [SystemMessage(content=self.system_prompt)] + state.messages
            )
            state.messages = state.messages + [response]
            return state

        def router(state: ScoutState) -> str:
            last_message = state.messages[-1]
            if not last_message.tool_calls:
                return END
            return "tools"

        builder = StateGraph(ScoutState)

        builder.add_node("chatbot", scout_node)
        builder.add_node("tools", ToolNode(self.tools))

        builder.add_edge(START, "chatbot")
        builder.add_conditional_edges("chatbot", router, ["tools", END])
        builder.add_edge("tools", "chatbot")

        return builder.compile(checkpointer=MemorySaver())


# visualize graph
if __name__ == "__main__":
    from IPython.display import display, Image

    agent = ScoutAgent()
    display(Image(agent.runnable.get_graph().draw_mermaid_png()))
