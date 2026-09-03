#!/usr/bin/env python3
"""
Academic Teaching Load & Department Resourcing Analyzer CLI
------------------------------------------------------------
Main command-line interface to parse enrollment CSVs, compute metrics,
generate Department Starter Rosters, and export schema-compliant JSON
for the interactive Web Dashboard.
"""

import argparse
import glob
import os
import sys

from analyzer.parser import RegistrarParser
from analyzer.metrics import MetricsEngine
from analyzer.roster_generator import RosterGenerator
from analyzer.export_engine import ExportEngine


def main():
    parser = argparse.ArgumentParser(
        description="Analyze academic teaching loads, department resourcing, and enrollment data."
    )
    parser.add_argument(
        "csv_files", nargs="+",
        help="Path to one or more enrollment CSV files (supports wildcards/globs)"
    )
    parser.add_argument(
        "--output-dir", "-o", default="./dashboard/data",
        help="Directory to save workload_data.json (default: ./dashboard/data)"
    )
    parser.add_argument(
        "--rosters-dir", "-r", default="./rosters",
        help="Directory to export Department Starter Rosters (default: ./rosters)"
    )
    parser.add_argument(
        "--no-rosters", action="store_true",
        help="Disable generation of starter roster CSVs"
    )
    parser.add_argument(
        "--quiet", "-q", action="store_true",
        help="Suppress terminal summary output"
    )

    args = parser.parse_args()

    # Collect matched files
    all_files = []
    for pattern in args.csv_files:
        matches = glob.glob(pattern)
        if matches:
            all_files.extend(matches)
        elif os.path.exists(pattern):
            all_files.append(pattern)
        else:
            print(f"Warning: No file found matching: {pattern}", file=sys.stderr)

    if not all_files:
        print("Error: No valid input CSV files found.", file=sys.stderr)
        sys.exit(1)

    print(f"\nProcessing {len(all_files)} enrollment file(s)...")
    reg_parser = RegistrarParser()
    for fp in all_files:
        print(f"  - Ingesting: {os.path.basename(fp)}")
        reg_parser.parse_file(fp)

    sections_list = list(reg_parser.sections.values())
    print(f"Total Unique Sections Ingested: {len(sections_list):,}")
    print(f"Total Unique Cadets Ingested:   {len(reg_parser.cadets):,}")

    # Compute Metrics
    engine = MetricsEngine(sections_list, reg_parser.cadets)
    results = engine.compute_all_metrics()

    # Export JSON Contract
    meta_info = {
        'files_processed': reg_parser.files_processed,
        'terms': reg_parser.terms,
        'total_sections': len(sections_list),
        'total_cadets': len(reg_parser.cadets)
    }
    json_path = os.path.join(args.output_dir, "workload_data.json")
    exporter = ExportEngine(results, meta_info)
    exporter.export_json(json_path)
    print(f"\n[OK] Exported Web Dashboard JSON to: {os.path.abspath(json_path)}")

    # Generate Starter Rosters
    if not args.no_rosters:
        roster_gen = RosterGenerator(results, output_dir=args.rosters_dir)
        roster_files = roster_gen.generate_all_rosters()
        print(f"[OK] Generated {len(roster_files)} Department Starter Rosters in: {os.path.abspath(args.rosters_dir)}")
        for dcode, rpath in sorted(roster_files.items()):
            print(f"     * {dcode}: {os.path.basename(rpath)}")

    # Print Executive Summary
    if not args.quiet:
        kpis = results['school_kpis']
        print("\n" + "=" * 90)
        print(" " * 22 + "SCHOOL OF INTEGRATED ENGINEERING - WORKLOAD SUMMARY")
        print("=" * 90)
        print(f"Active Sections:       {kpis['total_sections']:,} | Total Cadet Seats: {kpis['total_cadet_seats']:,} | SCH: {kpis['total_sch']:,}")
        print(f"Deduplicated Faculty:  {kpis['unique_faculty_count']} instructors | Average Class Size: {kpis['overall_avg_section_size']} cadets")
        print(f"Sub-10 Cadet Sections: {kpis['overall_sub10_count']} sections ({kpis['overall_sub10_pct']}%)")
        print("-" * 90)
        hfmt = "{:<8} {:<32} {:>5} {:>5} {:>7} {:>7} {:>6} {:>6} {:>7}"
        rfmt = "{:<8} {:<32} {:>5} {:>5} {:>7.0f} {:>7} {:>6.1f} {:>6.1f} {:>7.1f}%"
        print(hfmt.format("Dept", "Department Name", "Fac", "Secs", "Seats", "SCH", "Sec/In", "Stu/In", "Sub10%"))
        print("-" * 90)
        for d in results['departments']:
            if d['total_sections'] > 0:
                print(rfmt.format(
                    d['dept_code'], d['dept_name'][:32], d['faculty_count'], d['total_sections'],
                    d['total_cadet_seats'], int(d['total_sch']),
                    d['sections_per_inst_mean'], d['students_per_inst_mean'], d['sub10_percentage']
                ))
        print("=" * 90 + "\n")


if __name__ == "__main__":
    main()
