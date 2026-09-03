"""
Export Engine & JSON Data Contract
-----------------------------------
Emits standardized, schema-compliant workload_data.json consumed by the Web Dashboard.
"""

import json
import os
from datetime import datetime
from typing import Any, Dict


class ExportEngine:
    def __init__(self, metrics_data: Dict[str, Any], meta_info: Dict[str, Any]):
        self.metrics_data = metrics_data
        self.meta_info = meta_info

    def build_payload(self) -> Dict[str, Any]:
        return {
            'schema_version': '2.0.0',
            'generated_at': datetime.now().isoformat(),
            'meta': self.meta_info,
            'school_kpis': self.metrics_data['school_kpis'],
            'departments': self.metrics_data['departments'],
            'faculty_directory': self.metrics_data['faculty_directory'],
            'sections_audit': self.metrics_data['sections_audit']
        }

    def export_json(self, output_path: str) -> str:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        payload = self.build_payload()
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2)
        return output_path
