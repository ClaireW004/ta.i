from flask import Flask, request, jsonify
from flask_cors import CORS
import asyncio

# Import your AI agent related stuff here:
# Adjust these imports if your code is modularized
from google.adk.agents import Agent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types

app = Flask(__name__)
CORS(app)  # Enable CORS so React can call this API

# Constants for session
APP_NAME = "suggestion_agent_app"
USER_ID = "user_1"
SESSION_ID = "session_001"

# Globals for agent, runner, session
runner = None
session_service = None


def run_async(coro):
    """Run async coroutine synchronously"""
    return asyncio.run(coro)


def setup_agent():
    global runner, session_service

    AGENT_MODEL = "gemini-2.0-flash"

    suggestion_agent = Agent(
        name="suggestion_agent_v1",
        model=AGENT_MODEL,
        description="Provides suggestions on presentation slide content about what to say and examples to use.",
        instruction="Given the text content of a presentation slide, generate clear and concise speaking points along with relevant real-world examples that support the main message. Use an educational tone appropriate for a student audience. Do not include any introductory or conversational filler. Output only the suggestions and examples in bullet point format. Prioritize brevity, clarity, relevance, and speaker usability. Tailor the output to the topic and context of the slide."
    )

    session_service = InMemorySessionService()

    async def create_session():
        await session_service.create_session(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=SESSION_ID
        )

    run_async(create_session())

    runner = Runner(
        agent=suggestion_agent,
        app_name=APP_NAME,
        session_service=session_service
    )


async def call_agent_async(query: str) -> str:
    content = types.Content(role="user", parts=[types.Part(text=query)])

    final_response_text = "Agent did not produce a final response."

    async for event in runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=content):
        if event.is_final_response():
            if event.content and event.content.parts:
                final_response_text = event.content.parts[0].text
            break

    return final_response_text


@app.route("/query", methods=["POST"])
def query():
    data = request.json
    if not data or "query" not in data:
        return jsonify({"error": "Missing 'query' field"}), 400

    query_text = data["query"]

    response_text = run_async(call_agent_async(query_text))

    return jsonify({"response": response_text})


if __name__ == "__main__":
    print("Starting Flask AI agent API...")
    setup_agent()
    app.run(debug=True, host="0.0.0.0", port=5000)
