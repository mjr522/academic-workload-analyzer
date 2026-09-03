"""
Independent verification script to test mathematical correctness of analyzer.
"""
import math
import os
import sys
import tempfile
import csv

# Ensure workspace root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from analyzer.metrics import calc_stats, MetricsEngine
from analyzer.parser import RegistrarParser


def test_calc_stats():
    # Test case 1: simple values [10, 20, 30]
    # Mean = 20, Median = 20, Sample Variance = ((10-20)^2 + 0 + (30-20)^2)/2 = 200/2 = 100 -> StdDev = 10.0
    res = calc_stats([10, 20, 30])
    assert res['min'] == 10.0
    assert res['max'] == 30.0
    assert res['mean'] == 20.0
    assert res['median'] == 20.0
    assert res['stddev'] == 10.0
    assert res['count'] == 3

    # Test case 2: single value [15] -> StdDev should be 0.0
    res1 = calc_stats([15])
    assert res1['mean'] == 15.0
    assert res1['stddev'] == 0.0
    assert res1['min'] == 15.0
    assert res1['max'] == 15.0

    # Test case 3: empty
    res0 = calc_stats([])
    assert res0['count'] == 0

    print("calc_stats unit tests PASSED!")


def test_split_attribution():
    """
    Creates a synthetic mini-CSV with known hand-calculated values:
    - Subject: MECHENGR (mapped to DFEM)
      - Section 1 (Class Nbr 1001): 20 students, Instructor: Smith, John A
      - Section 2 (Class Nbr 1002): 30 students, Instructors: Smith, John A, Doe, Jane B
      - Section 3 (Class Nbr 1003): 10 students, Instructor: Doe, Jane B
    
    Hand Calculations:
    Smith:
      - Sec 1: 1 sec, 20 stu
      - Sec 2: 0.5 sec, 15 stu
      Total Sec: 1.5, Total Stu: 35
    Doe:
      - Sec 2: 0.5 sec, 15 stu
      - Sec 3: 1.0 sec, 10 stu
      Total Sec: 1.5, Total Stu: 25
    """
    with tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'Term', 'Class Nbr', 'Subject', 'Course Number', 'Course Title', 'Section', 'Cadet EMPLID', 'Instructor Name(s)', 'Unit Taken'
        ])
        writer.writeheader()
        # Section 1001: 20 cadets
        for i in range(20):
            writer.writerow({'Term': '2268', 'Class Nbr': '1001', 'Subject': 'MECHENGR', 'Course Number': '330',
                             'Course Title': 'Deformable Bodies', 'Section': 'M1', 'Cadet EMPLID': f'C{i}',
                             'Instructor Name(s)': 'Smith,John A', 'Unit Taken': '3.0'})
        # Section 1002: 30 cadets
        for i in range(30):
            writer.writerow({'Term': '2268', 'Class Nbr': '1002', 'Subject': 'MECHENGR', 'Course Number': '350',
                             'Course Title': 'Fluid Dynamics', 'Section': 'M2', 'Cadet EMPLID': f'C{100+i}',
                             'Instructor Name(s)': 'Smith,John A, Doe,Jane B', 'Unit Taken': '3.0'})
        # Section 1003: 10 cadets
        for i in range(10):
            writer.writerow({'Term': '2268', 'Class Nbr': '1003', 'Subject': 'MECHENGR', 'Course Number': '491',
                             'Course Title': 'Capstone', 'Section': 'M3', 'Cadet EMPLID': f'C{200+i}',
                             'Instructor Name(s)': 'Doe,Jane B', 'Unit Taken': '3.0'})
        tmp_path = f.name

    parser = RegistrarParser()
    parser.parse_file(tmp_path)
    engine = MetricsEngine(list(parser.sections.values()), parser.cadets)
    results = engine.compute_all_metrics()

    fac_map = {f['instructor']: f for f in results['faculty_directory']}
    assert 'Smith, John A' in fac_map
    assert 'Doe, Jane B' in fac_map
    assert fac_map['Smith, John A']['weighted_sections'] == 1.5
    assert fac_map['Smith, John A']['cadet_load_allocated'] == 35.0
    assert fac_map['Doe, Jane B']['weighted_sections'] == 1.5
    assert fac_map['Doe, Jane B']['cadet_load_allocated'] == 25.0

    esme = next(d for d in results['departments'] if d['dept_code'] == 'ESME')
    assert esme['total_sections'] == 3
    assert esme['total_cadet_seats'] == 60
    assert esme['faculty_count'] == 2
    assert esme['total_sch'] == 180.0
    assert esme['sub10_sections_count'] == 1  # Section 1003 has 10 cadets

    os.remove(tmp_path)
    print("End-to-End Mathematical & Department Attribution Verification PASSED!")


if __name__ == '__main__':
    test_calc_stats()
    test_split_attribution()
