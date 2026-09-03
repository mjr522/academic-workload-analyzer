"""
Academic Workload & Department Resourcing Analyzer Package
"""

from analyzer.config import (
    DEFAULT_DEPARTMENT_MAPPINGS,
    DEPARTMENT_METADATA,
    DEFAULT_ENGINEERING_SUBJECTS,
    DEFAULT_EXCLUDED_SUBJECTS,
    TIER_EXPECTATIONS,
)
from analyzer.parser import RegistrarParser, parse_instructor_names, determine_section_weight
from analyzer.metrics import MetricsEngine, calc_stats
from analyzer.roster_generator import RosterGenerator
from analyzer.export_engine import ExportEngine

__all__ = [
    'DEFAULT_DEPARTMENT_MAPPINGS',
    'DEPARTMENT_METADATA',
    'DEFAULT_ENGINEERING_SUBJECTS',
    'DEFAULT_EXCLUDED_SUBJECTS',
    'TIER_EXPECTATIONS',
    'RegistrarParser',
    'parse_instructor_names',
    'determine_section_weight',
    'MetricsEngine',
    'calc_stats',
    'RosterGenerator',
    'ExportEngine'
]
