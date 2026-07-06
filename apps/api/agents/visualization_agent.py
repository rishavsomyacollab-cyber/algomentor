"""Visualization Agent — generates step-by-step algorithm animation states."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import claude_service
from typing import Optional, Dict, Any, List


class VisualizationAgent:
    name = "visualization"
    description = "Produces structured JSON animation steps for any DSA algorithm so the frontend can render them interactively."

    def get_animation(
        self,
        topic_id: str,
        topic_name: str,
        input_array: Optional[List[float]] = None,
        target: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        return claude_service.get_animation(topic_id, topic_name, input_array, target)
