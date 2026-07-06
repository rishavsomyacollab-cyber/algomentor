"""Quiz Agent — generates adaptive quiz questions and evaluates answers."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import claude_service
from typing import Optional, Dict, Any, List


class QuizAgent:
    name = "quiz"
    description = "Generates DSA quiz questions calibrated by difficulty and evaluates answers with explanations."

    def generate(
        self,
        topic_id: str,
        topic_name: str,
        difficulty: str = "medium",
        count: int = 5,
        variant: int = 0,
    ) -> Optional[Dict[str, Any]]:
        return claude_service.generate_quiz(topic_id, topic_name, difficulty, count, variant)

    def evaluate(
        self,
        topic_name: str,
        question: str,
        options: List[str],
        correct_index: int,
        user_index: int,
    ) -> Optional[Dict[str, Any]]:
        return claude_service.evaluate_answer(topic_name, question, options, correct_index, user_index)

    def hint(
        self,
        topic_name: str,
        question: str,
        options: List[str],
        hint_level: int = 1,
    ) -> Optional[Dict[str, Any]]:
        return claude_service.get_hint(topic_name, question, options, hint_level)
