import json
import os
import re
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MATH_REPLACEMENTS = {
    "x squared": "x²",
    "x cubed": "x³",
    "square root of": "√",
    "root of": "√",
    "pi": "π",
    "theta": "θ",
    "alpha": "α",
    "beta": "β",
    "infinity": "∞",
    "to the power of": "^",
    "cos theta": "cos θ",
    "sin theta": "sin θ",
    "tan theta": "tan θ",
}


def apply_math_replacements(text: str) -> str:
    for phrase, symbol in MATH_REPLACEMENTS.items():
        text = re.sub(re.escape(phrase), symbol, text, flags=re.IGNORECASE)
    return text


def safe_json_parse(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```json\s*", "", text)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


async def generate_chapter_intro(chapter_name: str, grade: int) -> dict:
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": f"""You are a friendly CBSE Math tutor. Generate a simple, student-friendly
introduction to the chapter "{chapter_name}" for Class {grade} CBSE students.

Output format -- return JSON only, no markdown:
{{
  "introduction": "2-3 sentence chapter overview",
  "sections": [
    {{
      "title": "section title",
      "explanation": "3-4 sentence explanation in simple language",
      "key_terms": ["term1", "term2", "term3"]
    }}
  ],
  "concepts": ["concept_key_1", "concept_key_2", "concept_key_3"]
}}

Rules:
- Maximum 5 sections
- No heavy textbook language
- Use analogies and real-life examples
- concepts list = list of testable concept keys (snake_case), 3-6 concepts"""
            }],
            max_tokens=1500,
            response_format={"type": "json_object"},
        )
        return safe_json_parse(response.choices[0].message.content)
    except Exception as e:
        return {
            "introduction": f"Welcome to {chapter_name}! This is an important chapter in your CBSE curriculum.",
            "sections": [{"title": "Overview", "explanation": "This chapter covers fundamental concepts.", "key_terms": []}],
            "concepts": ["concept_1", "concept_2", "concept_3"],
            "error": str(e),
        }


async def generate_comprehension_questions(chapter_name: str, grade: int, concepts_list: list[str]) -> dict:
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": f"""Generate 3-5 comprehension questions for CBSE Class {grade} chapter: {chapter_name}.
The student just watched a video explanation. Test their understanding of: {concepts_list}.

Return JSON only:
{{
  "questions": [
    {{
      "concept_key": "concept_snake_case",
      "question": "the question text",
      "expected_answer": "what a correct answer should contain",
      "difficulty": "easy|medium|hard"
    }}
  ]
}}

Start with easy recall questions, end with application-level questions."""
            }],
            max_tokens=1200,
            response_format={"type": "json_object"},
        )
        return safe_json_parse(response.choices[0].message.content)
    except Exception as e:
        return {"questions": [], "error": str(e)}


async def generate_diagnostic_question(
    chapter_name: str, grade: int, concept_key: str, mastery_score: float, error_history: str
) -> dict:
    if mastery_score < 40:
        difficulty = "easy"
    elif mastery_score <= 70:
        difficulty = "medium"
    else:
        difficulty = "hard"

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": f"""Generate a diagnostic question for CBSE Class {grade} chapter: {chapter_name}.
Target concept: {concept_key}
Student's last mastery score on this concept: {mastery_score}%
Student's previous errors: {error_history}

Return JSON only:
{{
  "question": "the question text",
  "expected_answer": "correct answer explanation",
  "difficulty": "{difficulty}",
  "hint": "a subtle hint without giving away the answer"
}}

Set difficulty to {difficulty} based on mastery score."""
            }],
            max_tokens=800,
            response_format={"type": "json_object"},
        )
        return safe_json_parse(response.choices[0].message.content)
    except Exception as e:
        return {"question": f"Explain the concept of {concept_key}.", "expected_answer": "", "difficulty": difficulty, "hint": "", "error": str(e)}


async def evaluate_answer(
    chapter_name: str, grade: int, concept_key: str,
    question: str, expected_answer: str, student_answer: str, attempt_number: int
) -> dict:
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": f"""You are an expert CBSE Math teacher evaluating a student's answer.

Chapter: {chapter_name}
Class: {grade}
Concept being tested: {concept_key}
Question asked: {question}
Expected answer: {expected_answer}
Student's answer: {student_answer}
Student's previous attempts on this concept this session: {attempt_number}

Evaluate and return JSON only -- no markdown, no explanation outside JSON:
{{
  "score": <integer 0-100>,
  "is_correct": <true if score >= 80, false otherwise>,
  "what_student_got_right": "<specific praise for correct parts>",
  "gap_identified": "<specific concept or step the student missed>",
  "error_type": "<one of: arithmetic_error | formula_error | conceptual_gap | sign_error | partial_understanding | no_attempt | correct>",
  "explanation": "<if score < 80: targeted 2-3 sentence explanation of gap. If score >= 80: empty string>",
  "new_question": "<if score < 80: a new question variant on the same concept. If score >= 80: empty string>",
  "mastery_update": <float: suggested new mastery score 0-100>
}}

Scoring rules:
- Award partial credit (40-79) for correct method with calculation error
- Give 0-20 for completely wrong approach
- Give 80-100 only if the core concept is correctly applied
- Be fair but strict -- "I don't know" = 0"""
            }],
            max_tokens=1000,
            response_format={"type": "json_object"},
        )
        result = safe_json_parse(response.choices[0].message.content)
        result["is_correct"] = result.get("score", 0) >= 80
        return result
    except Exception as e:
        return {
            "score": 0, "is_correct": False,
            "what_student_got_right": "", "gap_identified": "Evaluation failed",
            "error_type": "conceptual_gap", "explanation": "There was an error evaluating your answer. Please try again.",
            "new_question": question, "mastery_update": 0.0, "error": str(e),
        }


async def generate_text_analogy(chapter_name: str, concept_key: str, attempt_number: int) -> str:
    style = "simple analogy" if attempt_number == 3 else "fully worked step-by-step example"
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": f"""A CBSE student is struggling with the concept "{concept_key}" in chapter "{chapter_name}".
This is attempt {attempt_number}. Generate a {style} to help them understand.
Keep it concise (4-6 sentences), use simple language, and be encouraging.
Return plain text only."""
            }],
            max_tokens=400,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Let's think about {concept_key} differently. This concept is fundamental to {chapter_name}. Take your time and try again!"


async def generate_session_summary(chapter_name: str, concept_scores: dict, time_seconds: int) -> str:
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": f"""Generate a 3-line encouraging session summary for a CBSE student.
Chapter: {chapter_name}
Concept scores: {json.dumps(concept_scores)}
Time spent: {time_seconds // 60} minutes

Return plain text, 3 sentences, encouraging and specific."""
            }],
            max_tokens=200,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Great session on {chapter_name}! You worked hard for {time_seconds // 60} minutes. Keep practicing to strengthen your understanding!"


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    try:
        import io
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="en",
        )
        text = response.text
        return apply_math_replacements(text)
    except Exception as e:
        return f"[Transcription error: {str(e)}]"
