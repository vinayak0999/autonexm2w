"""
AI Agent for evaluating user responses against ideal answers.
Uses OpenAI GPT-4 for evaluation.
"""
import os
from typing import Tuple

# OpenAI API key from environment (REQUIRED - no default value for security)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def evaluate_single_answer(user_response, ideal_question) -> Tuple[int, str]:
    """
    Compares user response to ideal question data.
    Returns: (score, feedback)
    """
    # Check if API key is configured
    if not OPENAI_API_KEY:
        return 0, "AI Evaluation unavailable: OPENAI_API_KEY not configured."
    
    # Fail-safe: If no ideal answer is provided by Admin, we cannot grade.
    if not ideal_question.ideal_status:
        return 0, "No Ideal Answer provided by Admin yet."

    prompt = f"""
    You are a QA Lead. Compare the Tester's answer to the Ground Truth.
    
    --- GROUND TRUTH (IDEAL) ---
    Status: {ideal_question.ideal_status}
    Explanation: {ideal_question.ideal_explanation}
    Critical Error: {ideal_question.ideal_error}

    --- TESTER ANSWER ---
    Status: {user_response.status}
    Explanation: {user_response.explanation}
    Critical Error: {user_response.critical_error}

    --- RULES ---
    1. If the 'Status' does not match the Ground Truth, score is 0.
    2. If Status matches, evaluate the Explanation quality (1-100).
    3. Check if they caught the Critical Error (if one existed).
    
    Return strictly in this format:
    SCORE: [number]
    FEEDBACK: [text]
    """

    try:
        import openai
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.3  # Lower temperature for consistent grading
        )
        content = response.choices[0].message.content
        
        # Parse response
        score = 0
        feedback = "Evaluated"
        
        lines = content.split('\n')
        for line in lines:
            if "SCORE:" in line.upper():
                try:
                    score = int(line.split(":")[1].strip())
                except:
                    pass
            if "FEEDBACK:" in line.upper():
                feedback = line.split(":", 1)[1].strip()
                
        return score, feedback

    except Exception as e:
        return 0, f"AI Error: {str(e)}"
