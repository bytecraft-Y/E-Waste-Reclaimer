# ruff: noqa
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import google.auth
from google.auth.exceptions import DefaultCredentialsError
from pydantic import BaseModel, Field

from google.adk.workflow import Workflow, node, START
from google.adk.agents import LlmAgent
from google.adk.events.event import Event
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

# Setup authentication fallback
try:
    _, project_id = google.auth.default()
    if project_id:
        os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
        os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
except DefaultCredentialsError:
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"


# 1. Structured output schema for classification
class ClassificationResult(BaseModel):
    category: str = Field(
        description="Must be either 'shipping' or 'unrelated'. Use 'shipping' if query is related to rates, tracking, delivery, or returns. Otherwise, use 'unrelated'."
    )
    query: str = Field(description="The user's original query.")


# 2. Nodes
# The Classifier Agent categorizes the query
classifier_agent = LlmAgent(
    name="classifier_agent",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=(
        "You are a routing classifier. Analyze the user's input query and classify it. "
        "Output the classification result. The category must be 'shipping' if it's about "
        "rates, tracking, delivery, returns, or other shipping topics. Otherwise, 'unrelated'."
    ),
    output_schema=ClassificationResult,
)


# The router node receives the ClassificationResult, sets the routing parameter,
# and outputs the original query text for downstream agents
@node(name="router_node")
def router_node(node_input: dict) -> Event:
    category = "unrelated"
    query = ""
    if isinstance(node_input, dict):
        category = node_input.get("category", "unrelated")
        query = node_input.get("query", "")
    else:
        category = getattr(node_input, "category", "unrelated")
        query = getattr(node_input, "query", "")

    return Event(output=query, route=category)


# Shipping FAQ Agent handles shipping queries
shipping_faq_agent = LlmAgent(
    name="shipping_faq_agent",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=(
        "You are a helpful customer support agent for a shipping company. "
        "Answer the user's shipping question (rates, tracking, delivery, returns) politely and accurately."
    ),
)


# Decline Node handles unrelated queries
@node(name="decline_node")
def decline_node(node_input: str) -> Event:
    message = (
        "I'm sorry, but I can only assist with shipping-related inquiries "
        "(such as rates, tracking, delivery, and returns). Let me know if you "
        "have any shipping questions!"
    )
    content = types.Content(role="model", parts=[types.Part.from_text(text=message)])
    return Event(output=message, content=content)


# Define edges
edges = [
    ("START", classifier_agent),
    (classifier_agent, router_node),
    (router_node, {"shipping": shipping_faq_agent, "unrelated": decline_node}),
]

root_agent = Workflow(
    name="root_agent",
    edges=edges,
)

app = App(
    root_agent=root_agent,
    name="app",
)
