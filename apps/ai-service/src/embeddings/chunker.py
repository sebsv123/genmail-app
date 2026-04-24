"""Text chunking utility for RAG context."""

import re
from typing import List


def chunk_text(text: str, max_tokens: int = 400, overlap: int = 50) -> List[str]:
    """
    Split text into chunks with overlap.
    
    Respects paragraph boundaries when possible.
    Approximately 1 token ≈ 4 characters for English text.
    """
    if not text:
        return []

    # Approximate tokens: 1 token ≈ 4 characters
    max_chars = max_tokens * 4
    overlap_chars = overlap * 4

    chunks = []
    
    # Split into paragraphs first
    paragraphs = re.split(r'\n\s*\n', text.strip())
    
    current_chunk = []
    current_length = 0

    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue

        paragraph_length = len(paragraph)

        # If a single paragraph is longer than max, split it by sentences
        if paragraph_length > max_chars:
            # First, flush current chunk if any
            if current_chunk:
                chunks.append('\n\n'.join(current_chunk))
                # Keep overlap for next chunk
                overlap_text = get_overlap_text(current_chunk, overlap_chars)
                current_chunk = [overlap_text] if overlap_text else []
                current_length = sum(len(p) for p in current_chunk)

            # Split long paragraph by sentences
            sentences = re.split(r'(?<=[.!?])\s+', paragraph)
            for sentence in sentences:
                if current_length + len(sentence) + 1 > max_chars:
                    if current_chunk:
                        chunks.append('\n\n'.join(current_chunk))
                        overlap_text = get_overlap_text(current_chunk, overlap_chars)
                        current_chunk = [overlap_text] if overlap_text else []
                        current_chunk.append(sentence)
                        current_length = sum(len(p) for p in current_chunk)
                else:
                    current_chunk.append(sentence)
                    current_length += len(sentence) + 1
        else:
            # Check if adding this paragraph exceeds limit
            if current_length + paragraph_length + 2 > max_chars:
                # Save current chunk
                if current_chunk:
                    chunks.append('\n\n'.join(current_chunk))
                
                # Start new chunk with overlap from previous
                overlap_text = get_overlap_text(current_chunk, overlap_chars)
                if overlap_text:
                    current_chunk = [overlap_text, paragraph]
                    current_length = len(overlap_text) + paragraph_length + 2
                else:
                    current_chunk = [paragraph]
                    current_length = paragraph_length
            else:
                current_chunk.append(paragraph)
                current_length += paragraph_length + 2

    # Don't forget the last chunk
    if current_chunk:
        chunks.append('\n\n'.join(current_chunk))

    return [chunk.strip() for chunk in chunks if chunk.strip()]


def get_overlap_text(chunks: List[str], overlap_chars: int) -> str:
    """Get overlap text from the end of chunks."""
    if not chunks or overlap_chars <= 0:
        return ""
    
    full_text = '\n\n'.join(chunks)
    if len(full_text) <= overlap_chars:
        return full_text
    
    # Get last N characters, respecting word boundaries
    overlap = full_text[-overlap_chars:]
    # Find the start of the first complete word
    first_space = overlap.find(' ')
    if first_space > 0 and first_space < 20:  # Skip incomplete word at start
        overlap = overlap[first_space + 1:]
    
    return overlap.strip()


def estimate_token_count(text: str) -> int:
    """Estimate token count (rough approximation)."""
    return len(text) // 4
