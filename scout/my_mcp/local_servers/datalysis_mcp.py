"""
MCP Server for data analysis tools - database querying and visualization generation.
"""
import pandas as pd
from mcp.server.fastmcp import FastMCP
from sqlalchemy import create_engine, text, Engine
from typing import Optional
import os
import io
from contextlib import redirect_stdout, redirect_stderr
from dotenv import load_dotenv

load_dotenv()

# Initialize FastMCP server
mcp = FastMCP("datalysis")

class DatalysisSession:
    """A session for database connections and data analysis operations."""
    
    def __init__(self):
        self.engine: Optional[Engine] = None
        self.df: Optional[pd.DataFrame] = None
        self._initialize_engine()

    def _initialize_engine(self):
        """Initialize the database engine with Supabase connection."""
        supabase_url = os.environ.get("SUPABASE_URL")
        if not supabase_url:
            print("Warning: SUPABASE_URL not found in environment variables")
            return
            
        try:
            # Configure SQLAlchemy for session pooling
            self.engine = create_engine(
                supabase_url,
                pool_size=5,
                max_overflow=5,
                pool_timeout=10,
                pool_recycle=1800,
                pool_pre_ping=True,
                pool_use_lifo=True,
                connect_args={
                    "application_name": "onlyvans_agent",
                    "options": "-c statement_timeout=30000",
                    "keepalives": 1,
                    "keepalives_idle": 60,
                    "keepalives_interval": 30,
                    "keepalives_count": 3
                }
            )
        except Exception as e:
            print(f"Error initializing database engine: {e}")
            self.engine = None

    async def query_database(self, query: str) -> str:
        """Execute a SQL query and return results as markdown table."""
        if not self.engine:
            return "Error: Database connection not available. Please check SUPABASE_URL environment variable."
        
        try:
            with self.engine.connect().execution_options(
                isolation_level="READ COMMITTED"
            ) as conn:
                result = conn.execute(text(query))
                columns = list(result.keys())
                rows = result.fetchall()
                df = pd.DataFrame(rows, columns=columns)
                
                # Store the DataFrame in the session for potential reuse
                self.df = df
                
                return df.to_markdown(index=False)
        except Exception as e:
            return f"Error executing query: {str(e)}"

    async def generate_visualization(self, name: str, sql_query: str, plotly_code: str) -> str:
        """Generate a visualization using SQL query and Plotly code."""
        if not self.engine:
            return "Error: Database connection not available. Please check SUPABASE_URL environment variable."
        
        # Create the output directory if it doesn't exist
        os.makedirs("output", exist_ok=True)
        file_path = f"output/{name}.json"
        
        # Capture stdout and stderr
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        
        # Prepare the complete code
        pre_code = f'''
from sqlalchemy import text
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import plotly.io as pio
import plotly

# Execute SQL query
df = pd.read_sql(text("""{sql_query}"""), engine)

# Generated plotly code
'''
        
        post_code = f'''

# Save the figure to JSON
if 'fig' in locals() or 'fig' in globals():
    fig_json = pio.to_json(fig)
    with open('{file_path}', 'w') as f:
        f.write(fig_json)
    print(f"Visualization saved to {file_path}")
else:
    print("Error: No 'fig' variable found in the plotly code")
'''
        
        # Combine all code parts
        complete_code = pre_code + plotly_code + post_code
        
        # Prepare execution environment
        exec_globals = {'engine': self.engine}
        
        try:
            # Execute the code with captured output
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                exec(complete_code, exec_globals, {})
            
            # Check if the visualization was created successfully
            if os.path.exists(file_path):
                return f"Visualization '{name}' created successfully and saved to {file_path}"
            else:
                stderr_output = stderr_capture.getvalue()
                return f"Error: Failed to generate visualization.\nError details: {stderr_output}"
                
        except Exception as e:
            return f"Error executing visualization code: {str(e)}"

# Create a global session instance
session = DatalysisSession()

@mcp.tool()
async def datalysis_query_db(query: str) -> str:
    """Query the database using PostgreSQL SQL.

    Args:
        query: The SQL query to execute. Must be a valid PostgreSQL SQL string that can be executed directly.

    Returns:
        str: The query result as a markdown table.
    """
    return await session.query_database(query)

@mcp.tool()
async def datalysis_generate_visualization(name: str, sql_query: str, plotly_code: str) -> str:
    """Generate a visualization using Python, SQL, and Plotly.

    Args:
        name: The name of the visualization. Should be a short name with underscores and no spaces.
        sql_query: The SQL query to retrieve data for the visualization. Must be a valid PostgreSQL SQL string.
        plotly_code: Python code that generates a Plotly figure. The code should create a variable named 'fig'.

    Returns:
        str: Success message with file path if successful, or an error message.

    Example:
        name = "top_creators_revenue"
        sql_query = "SELECT c.first_name, c.last_name, SUM(t.amount_usd) AS total_revenue FROM onlyvans.creators c JOIN onlyvans.transactions t ON c.id = t.creator_id GROUP BY c.id, c.first_name, c.last_name ORDER BY total_revenue DESC LIMIT 5"
        plotly_code = "fig = px.bar(df, x='first_name', y='total_revenue', title='Top 5 Creators by Revenue')"
    """
    return await session.generate_visualization(name, sql_query, plotly_code)

if __name__ == "__main__":
    mcp.run(transport='stdio')
