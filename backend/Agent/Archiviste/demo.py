#!/usr/bin/env python


from __future__ import annotations

import logging
import os
import sys
import tempfile
from pathlib import Path

# Add src to path so we can import pipeline modules
SRC_DIR = Path(__file__).parent / "src"
sys.path.insert(0, str(SRC_DIR))

from rag_pipeline import RagPipeline
from llm import get_default_llm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
)
logger = logging.getLogger(__name__)


def create_sample_csv() -> str:
    
    csv_content = 
    
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False, encoding="utf-8"
    ) as f:
        f.write(csv_content)
        tmp_path = f.name
    
    logger.info(f"Created sample CSV at: {tmp_path}")
    return tmp_path


def main() -> None:
    
    logger.info("=" * 70)
    logger.info("ARCHIVISTE RAG PIPELINE DEMO")
    logger.info("=" * 70)

    # Initialize pipeline
    logger.info("\n[1/5] Initializing RAG pipeline...")
    pipeline = RagPipeline()
    logger.info("✓ Pipeline ready")

    # Create sample document
    logger.info("\n[2/5] Creating sample CSV document...")
    csv_path = create_sample_csv()
    logger.info(f"✓ Sample document created")

    # Ingest the file
    logger.info("\n[3/5] Ingesting document...")
    try:
        chunks_ingested = pipeline.ingest_file(csv_path)
        logger.info(f"✓ Ingested {chunks_ingested} chunk(s)")
    except Exception as exc:
        logger.error(f"✗ Ingest failed: {exc}")
        return
    finally:
        # Clean up temp file
        if os.path.exists(csv_path):
            os.unlink(csv_path)

    # Run test queries
    logger.info("\n[4/5] Running test queries...")
    test_queries = [
        "What was Apple iPhone revenue in North America?",
        "Which product had the highest growth in Asia?",
        "How many units did Samsung Galaxy sell in Europe?",
    ]

    for query in test_queries:
        logger.info(f"\n  Query: {query}")
        try:
            results = pipeline.retrieve(query, top_k=3)
            if results:
                for i, result in enumerate(results, 1):
                    logger.info(f"    [{i}] (sim={result.similarity:.3f}) {result.text[:80]}...")
            else:
                logger.info("    (no results)")
        except Exception as exc:
            logger.error(f"    Query failed: {exc}")

    # Generate answer with LLM (optional)
    logger.info("\n[5/5] Generating answer with LLM...")
    try:
        llm = get_default_llm()
        test_answer_query = "What was the total revenue for all products in North America in Q1 2024?"
        
        logger.info(f"\n  Query: {test_answer_query}")
        answer, prompt, results = pipeline.answer_query(
            test_answer_query,
            llm=llm,
            top_k=5,
        )
        logger.info(f"\n  Answer:\n    {answer}")
        logger.info(f"\n  Retrieved {len(results)} chunk(s)")
    except Exception as exc:
        logger.error(f"✗ Answer generation failed: {exc}")

    # Final status
    logger.info("\n" + "=" * 70)
    logger.info("DEMO COMPLETE")
    logger.info(f"Vector store contains: {pipeline.vector_store.count()} vector(s)")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
