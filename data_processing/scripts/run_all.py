"""
run_all.py — Orchestrator for the Vizcolab data-processing pipeline.

Runs each processing step in order:
  01. Universities
  02. Programs
  03. Productions (dedup)
  04. Authors (entity resolution)
  05. Co-authorships (edge generation)

Usage:
    python scripts/run_all.py
    python scripts/run_all.py --steps 1 2 3    # run only specific steps
"""

import argparse
import subprocess
import sys
import time
from pathlib import Path

SCRIPTS = [
    ("01", "scripts.universities"),
    ("02", "scripts.programs"),
    ("03", "scripts.productions"),
    ("04", "scripts.authors"),
    ("05", "scripts.co_authorships"),
]


def run_step(step_num: str, module_name: str) -> float:
    """Run a single step as a module, return elapsed seconds."""
    print(f"\n{'='*60}")
    print(f"  STEP {step_num}: {module_name.split('.')[-1]}")
    print(f"{'='*60}\n")

    t0 = time.perf_counter()
    result = subprocess.run(
        [sys.executable, "-m", module_name],
        check=True,
    )
    elapsed = time.perf_counter() - t0
    print(f"\n   ⏱  Step {step_num} completed in {elapsed:.1f}s")
    return elapsed


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Vizcolab processing pipeline")
    parser.add_argument(
        "--steps",
        nargs="*",
        type=int,
        help="Specific step numbers to run (e.g., 1 2 3). Default: all.",
    )
    args = parser.parse_args()

    selected = args.steps
    total_time = 0.0
    steps_run = 0

    for step_num, script_path in SCRIPTS:
        if selected and int(step_num) not in selected:
            continue
        elapsed = run_step(step_num, script_path)
        total_time += elapsed
        steps_run += 1

    print(f"\n{'='*60}")
    print(f"  PIPELINE COMPLETE — {steps_run} steps in {total_time:.1f}s")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
