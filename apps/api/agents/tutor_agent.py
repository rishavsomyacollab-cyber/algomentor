"""Tutor Agent — explains DSA concepts with rich educational content."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import claude_service
from typing import Optional, Dict, Any, Generator


class TutorAgent:
    name = "tutor"
    description = "Explains DSA concepts with rich structured content including intuition, worked examples, code, and tips."

    def run(self, topic_id: str, topic_name: str) -> Optional[Dict[str, Any]]:
        """Fetch a full explanation. Uses cache; falls back to empty dict on failure."""
        return claude_service.explain_topic(topic_id, topic_name)

    def stream(self, topic_id: str, topic_name: str) -> Generator[str, None, None]:
        """Stream explanation tokens from the LLM."""
        yield from claude_service.stream_explain(topic_id, topic_name)

    def get_pseudocode(self, topic_id: str, topic_name: str) -> Optional[Dict[str, Any]]:
        return claude_service.get_pseudocode(topic_id, topic_name)

    def analyze_complexity(self, topic_id: str, topic_name: str) -> Optional[Dict[str, Any]]:
        return claude_service.analyze_complexity(topic_id, topic_name)
