import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

def generate_markdown(doc_structure: Dict[str, Any], file_name: str = "document.pdf") -> str:
    """Generates clean GitHub-Flavored Markdown from document blocks."""
    md_lines = []
    md_lines.append(f"# {file_name}\n")
    
    current_page = None
    
    for block in doc_structure.get("blocks", []):
        page_num = block.get("pageNumber", 1)
        if current_page != page_num:
            if current_page is not None:
                md_lines.append("\n---\n")  # Page break separator
            md_lines.append(f"<!-- Page {page_num} -->\n")
            current_page = page_num
            
        b_type = block.get("type", "paragraph")
        content = block.get("content", "").strip()
        level = block.get("level", 2)
        
        if b_type == "heading":
            prefix = "#" * (level if level else 2)
            md_lines.append(f"{prefix} {content}\n")
        elif b_type == "list":
            if content.startswith(("-", "*", "•")):
                md_lines.append(f"- {content.lstrip('-*• ')}")
            else:
                md_lines.append(f"{content}")
        elif b_type == "table":
            if "htmlContent" in block:
                md_lines.append(f"\n{content}\n")
            else:
                md_lines.append(f"\n| Content |\n| --- |\n| {content} |\n")
        elif b_type == "caption":
            md_lines.append(f"_*Caption:* {content}_\n")
        else:
            md_lines.append(f"{content}\n")
            
    return "\n".join(md_lines)

def generate_html(doc_structure: Dict[str, Any], file_name: str = "document.pdf") -> str:
    """Generates clean, semantic HTML string from document blocks."""
    html_parts = []
    html_parts.append('<div class="document-ai-container">')
    html_parts.append(f'<header class="doc-header"><h2>{file_name}</h2></header>')
    
    current_page = None
    
    for block in doc_structure.get("blocks", []):
        page_num = block.get("pageNumber", 1)
        if current_page != page_num:
            if current_page is not None:
                html_parts.append('</div>')  # Close previous page container
            html_parts.append(f'<div class="doc-page" data-page="{page_num}">')
            html_parts.append(f'<div class="page-badge">Page {page_num}</div>')
            current_page = page_num
            
        b_type = block.get("type", "paragraph")
        content = block.get("content", "").strip()
        level = block.get("level", 2)
        conf = block.get("confidence", 0.0)
        
        # Escape basic HTML entities if needed, but allow simple formatting
        escaped_content = content.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        
        if b_type == "heading":
            tag = f"h{level if level and level <= 6 else 2}"
            html_parts.append(f'<{tag} class="doc-heading">{escaped_content}</{tag}>')
        elif b_type == "list":
            html_parts.append(f'<li class="doc-list-item">{escaped_content}</li>')
        elif b_type == "table":
            html_parts.append(f'<div class="doc-table-wrapper">{escaped_content}</div>')
        elif b_type == "caption":
            html_parts.append(f'<figure><figcaption class="doc-caption">{escaped_content}</figcaption></figure>')
        else:
            html_parts.append(f'<p class="doc-paragraph" data-confidence="{conf:.2f}">{escaped_content}</p>')
            
    if current_page is not None:
        html_parts.append('</div>')  # Close last page container
        
    html_parts.append('</div>')  # Close document container
    return "\n".join(html_parts)

def build_full_output(pdf_path: str, doc_structure: Dict[str, Any], file_name: str = "document.pdf") -> Dict[str, Any]:
    """
    Assembles final structured payload returning:
    - Structured JSON
    - HTML
    - Markdown
    """
    markdown_str = generate_markdown(doc_structure, file_name)
    html_str = generate_html(doc_structure, file_name)
    
    return {
        "metadata": {
            "fileName": file_name,
            "totalPages": doc_structure["totalPages"],
            "overallConfidence": doc_structure["overallConfidence"],
            "summary": doc_structure["summary"]
        },
        "output": {
            "markdown": markdown_str,
            "html": html_str,
            "json": {
                "summary": doc_structure["summary"],
                "pages": doc_structure["pages"],
                "blocks": doc_structure["blocks"]
            }
        }
    }
