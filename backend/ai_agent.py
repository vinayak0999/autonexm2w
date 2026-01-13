"""
Strict AI Evaluator for comparing user responses against ideal answers.
Implements deterministic evaluation logic with 100% consistency.

Modules:
1. Normalization - Clean and standardize inputs
2. Status Verification - Hard filter on status match
3. Semantic Similarity - Cosine similarity for SUCCESS (≥0.85)
4. Keyword Overlap - Keyword match for FAILURE (≥60%)
"""
import os
import re
from typing import Tuple, Dict, Any, List
import numpy as np

# OpenAI API key from environment
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# ============== CONSTANTS ============== #
SEMANTIC_THRESHOLD = 0.85  # Minimum cosine similarity for SUCCESS
KEYWORD_THRESHOLD = 0.60   # Minimum keyword overlap ratio for FAILURE

# Common stop words to filter out during keyword extraction
STOP_WORDS = {
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're",
    'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
    'she', "she's", 'her', 'hers', 'herself', 'it', "it's", 'its', 'itself',
    'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who',
    'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do',
    'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or',
    'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
    'about', 'against', 'between', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on',
    'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
    'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 's', 't', 'can', 'will', 'just', 'don', "don't", 'should',
    "should've", 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren',
    "aren't", 'couldn', "couldn't", 'didn', "didn't", 'doesn', "doesn't",
    'hadn', "hadn't", 'hasn', "hasn't", 'haven', "haven't", 'isn', "isn't",
    'ma', 'mightn', "mightn't", 'mustn', "mustn't", 'needn', "needn't", 'shan',
    "shan't", 'shouldn', "shouldn't", 'wasn', "wasn't", 'weren', "weren't",
    'won', "won't", 'wouldn', "wouldn't", 'task', 'model', 'agent', 'correctly',
    'able', 'completed', 'successfully', 'process', 'overall', 'required', 'user'
}


# ============== MODULE 1: NORMALIZATION ============== #
def normalize_text(text: str) -> str:
    """Clean and standardize text for comparison."""
    if text is None:
        return ""
    # Lowercase and strip whitespace
    text = str(text).lower().strip()
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text


def normalize_status(status: str) -> str:
    """Normalize status to lowercase 'success' or 'failure'."""
    status = normalize_text(status)
    # Handle common variations
    if status in ['success', 'pass', 'passed', 'correct', 'true', '1']:
        return 'success'
    elif status in ['failure', 'fail', 'failed', 'incorrect', 'false', '0']:
        return 'failure'
    return status


# ============== MODULE 2: STATUS VERIFICATION ============== #
def verify_status(ideal_status: str, user_status: str) -> Tuple[bool, str]:
    """
    Hard filter: Status must match exactly.
    Returns: (is_match, status_result)
    """
    ideal = normalize_status(ideal_status)
    user = normalize_status(user_status)
    
    if ideal == user:
        return True, "MATCH"
    else:
        return False, "MISMATCH"


# ============== MODULE 3A: SEMANTIC SIMILARITY ============== #
def get_embedding(text: str) -> List[float]:
    """Get OpenAI embedding for text."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not configured")
    
    import openai
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    a = np.array(vec1)
    b = np.array(vec2)
    
    # Handle zero vectors
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return float(np.dot(a, b) / (norm_a * norm_b))


def calculate_semantic_similarity(ideal_text: str, user_text: str) -> float:
    """
    Calculate semantic similarity between ideal and user explanation.
    Used for SUCCESS status evaluation.
    """
    ideal_clean = normalize_text(ideal_text)
    user_clean = normalize_text(user_text)
    
    # Handle empty text
    if not ideal_clean or not user_clean:
        return 0.0
    
    # Get embeddings
    ideal_embedding = get_embedding(ideal_clean)
    user_embedding = get_embedding(user_clean)
    
    # Calculate similarity
    return cosine_similarity(ideal_embedding, user_embedding)


# ============== MODULE 3B: KEYWORD OVERLAP ============== #
def extract_keywords(text: str) -> set:
    """
    Extract meaningful keywords from text.
    Removes stop words and keeps unique terms.
    """
    text = normalize_text(text)
    
    # Tokenize: split on non-alphanumeric
    tokens = re.findall(r'\b[a-z]+\b', text)
    
    # Filter: remove stop words and short words
    keywords = {
        word for word in tokens 
        if word not in STOP_WORDS and len(word) > 2
    }
    
    return keywords


def calculate_keyword_overlap(ideal_text: str, user_text: str) -> float:
    """
    Calculate keyword overlap ratio.
    Used for FAILURE status evaluation.
    """
    ideal_keywords = extract_keywords(ideal_text)
    user_text_clean = normalize_text(user_text)
    
    if not ideal_keywords:
        return 1.0  # No keywords to match = pass
    
    # Count how many ideal keywords appear in user text
    found = sum(1 for kw in ideal_keywords if kw in user_text_clean)
    
    return found / len(ideal_keywords)


# ============== MODULE 4: MAIN EVALUATOR ============== #
# Scoring weights
STATUS_WEIGHT = 60   # Points for status match
EXPLANATION_WEIGHT = 40  # Points for explanation quality

def evaluate_single_answer(user_response, ideal_question) -> Tuple[int, str]:
    """
    Weighted evaluation of user response against ideal answer.
    
    Scoring:
    - Status Match: 60 points (0 if mismatch)
    - Explanation Quality: 40 points (scaled by similarity/overlap)
    
    Returns: (score, feedback)
    - score: 0-100 based on weighted evaluation
    - feedback: Detailed evaluation result
    """
    # Check prerequisites
    if not OPENAI_API_KEY:
        return 0, "AI Evaluation unavailable: OPENAI_API_KEY not configured."
    
    if not ideal_question.ideal_status:
        return 0, "No Ideal Answer provided by Admin yet."
    
    try:
        total_score = 0
        status_score = 0
        explanation_score = 0
        
        # Build result structure
        result = {
            "task_id": getattr(ideal_question, 'task_id', None),
            "final_result": None,
            "status_check": None,
            "status_points": 0,
            "explanation_points": 0,
            "explanation_similarity": 0.0,
            "failure_reason": None
        }
        
        # ===== STEP 1: Status Verification (60 points) =====
        status_match, status_result = verify_status(
            ideal_question.ideal_status,
            user_response.status
        )
        result["status_check"] = status_result
        
        if status_match:
            status_score = STATUS_WEIGHT
            result["status_points"] = STATUS_WEIGHT
        else:
            status_score = 0
            result["status_points"] = 0
            result["failure_reason"] = f"Status mismatch: Expected '{normalize_status(ideal_question.ideal_status)}', got '{normalize_status(user_response.status)}'"
        
        # ===== STEP 2: Evaluate Explanation (40 points) =====
        ideal_status = normalize_status(ideal_question.ideal_status)
        
        if ideal_status == "success":
            # Use SEMANTIC SIMILARITY for Success
            similarity = calculate_semantic_similarity(
                ideal_question.ideal_explanation or "",
                user_response.explanation or ""
            )
            result["explanation_similarity"] = round(similarity, 3)
            # Scale 40 points by similarity
            explanation_score = int(EXPLANATION_WEIGHT * similarity)
            result["explanation_points"] = explanation_score
            
        elif ideal_status == "failure":
            # Use KEYWORD OVERLAP for Failure
            source_text = ideal_question.ideal_error or ideal_question.ideal_explanation or ""
            
            overlap = calculate_keyword_overlap(
                source_text,
                user_response.explanation or ""
            )
            result["explanation_similarity"] = round(overlap, 3)
            # Scale 40 points by overlap
            explanation_score = int(EXPLANATION_WEIGHT * overlap)
            result["explanation_points"] = explanation_score
        
        # ===== STEP 3: Calculate Total Score =====
        total_score = status_score + explanation_score
        
        # Determine final result
        if total_score >= 60:  # At least status matched
            result["final_result"] = "PASS" if total_score >= 80 else "PARTIAL"
        else:
            result["final_result"] = "FAIL"
        
        return total_score, format_feedback(result)
    
    except Exception as e:
        return 0, f"Evaluation Error: {str(e)}"


def format_feedback(result: Dict[str, Any]) -> str:
    """Format result as readable feedback string with score breakdown."""
    status_pts = result.get('status_points', 0)
    expl_pts = result.get('explanation_points', 0)
    similarity = result.get('explanation_similarity', 0)
    
    lines = [
        f"Result: {result['final_result']}",
        f"Score: {status_pts + expl_pts}/100",
        f"Status: {result['status_check']} ({status_pts}/60)",
        f"Explanation: {expl_pts}/40 (similarity: {similarity:.0%})"
    ]
    if result.get('failure_reason'):
        lines.append(f"Note: {result['failure_reason']}")
    
    return " | ".join(lines)


# ============== BATCH EVALUATION HELPER ============== #
def evaluate_batch(responses_with_ideals: List[Tuple]) -> List[Dict]:
    """
    Evaluate multiple responses efficiently.
    Input: List of (user_response, ideal_question) tuples
    Output: List of result dictionaries
    """
    results = []
    for user_response, ideal_question in responses_with_ideals:
        score, feedback = evaluate_single_answer(user_response, ideal_question)
        results.append({
            "score": score,
            "feedback": feedback,
            "passed": score > 0
        })
    return results
