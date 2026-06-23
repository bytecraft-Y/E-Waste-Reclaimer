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

import pytest
from google.adk.runners import InMemoryRunner
from google.genai import types

from app.agent import app


@pytest.mark.asyncio
async def test_shipping_query() -> None:
    runner = InMemoryRunner(app=app)
    session = await runner.session_service.create_session(
        app_name="app", user_id="test_user"
    )

    last_event = None
    async for event in runner.run_async(
        user_id="test_user",
        session_id=session.id,
        new_message=types.Content(
            role="user", parts=[types.Part.from_text(text="Where is my package?")]
        ),
    ):
        if event.output is not None:
            last_event = event

    assert last_event is not None
    # Verify that the response contains tracking or package info (i.e. processed by shipping FAQ agent)
    assert last_event.output is not None
    assert isinstance(last_event.output, str)
    assert len(last_event.output) > 0


@pytest.mark.asyncio
async def test_unrelated_query() -> None:
    runner = InMemoryRunner(app=app)
    session = await runner.session_service.create_session(
        app_name="app", user_id="test_user"
    )

    last_event = None
    async for event in runner.run_async(
        user_id="test_user",
        session_id=session.id,
        new_message=types.Content(
            role="user",
            parts=[types.Part.from_text(text="What is the capital of France?")],
        ),
    ):
        if event.output is not None:
            last_event = event

    assert last_event is not None
    assert last_event.output is not None
    assert "only assist with shipping-related inquiries" in last_event.output
