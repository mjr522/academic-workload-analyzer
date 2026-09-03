"""
Unit tests for instructor name parser in analyzer.parser.
"""
import sys
import os

# Ensure workspace root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from analyzer.parser import parse_instructor_names


def run_tests():
    test_cases = [
        ("Smith,John A", ["Smith, John A"]),
        ("Smith, John A", ["Smith, John A"]),
        ("Smith,John", ["Smith, John"]),
        ("Smith,John A, Doe,Jane B", ["Smith, John A", "Doe, Jane B"]),
        ("Smith,John A, Doe,Jane B, Taylor,Bob C", ["Smith, John A", "Doe, Jane B", "Taylor, Bob C"]),
        ("Smith, John A; Doe, Jane B", ["Smith, John A", "Doe, Jane B"]),
        ("O'Connor,Michael, Van Dyke,Sarah L", ["O'Connor, Michael", "Van Dyke, Sarah L"]),
        ("Smith Jr.,John A", ["Smith Jr., John A"]),
        ("Smith, Jr., John A", ["Smith Jr., John A"]),
        ("Smith, Jr., John A, Doe, Jane B", ["Smith Jr., John A", "Doe, Jane B"]),
        ("Smith-Jones,Mary A, Davis,James", ["Smith-Jones, Mary A", "Davis, James"]),
        ("", []),
        ("   ", []),
        ("TBD", []),
        ("STAFF", []),
    ]

    all_passed = True
    for raw, expected in test_cases:
        res = parse_instructor_names(raw)
        if res != expected:
            print(f"FAILED: '{raw}' -> got {res}, expected {expected}")
            all_passed = False
        else:
            print(f"PASSED: '{raw}' -> {res}")

    if all_passed:
        print("\nALL NAME PARSER TESTS PASSED!")
    else:
        sys.exit(1)


if __name__ == '__main__':
    run_tests()
