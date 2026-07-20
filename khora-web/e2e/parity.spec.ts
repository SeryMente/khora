import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

test.describe('Web <-> Kernel Parity', () => {
  test('ObjetoDeInformacion has exact same fields in web and kernel', () => {
    // We create a temporary python script to dump the fields of ObjetoDeInformacion and Provenance
    const scriptPath = path.join(__dirname, 'dump_schema.py');
    const pyScript = `
import json
import sys
from dataclasses import fields
import os

# Ensure kernel is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../kernel/src')))

from khora_kernel.api import ObjetoDeInformacion, Provenance

def get_fields(cls):
    return {f.name: str(f.type) for f in fields(cls)}

schema = {
    'ObjetoDeInformacion': get_fields(ObjetoDeInformacion),
    'Provenance': get_fields(Provenance)
}
print(json.dumps(schema))
`;

    const fs = require('fs');
    fs.writeFileSync(scriptPath, pyScript);

    try {
      const result = execSync(`python ${scriptPath}`);
      const kernelSchema = JSON.parse(result.toString());

      // In TypeScript we don't have runtime reflection for interfaces, but we can verify the python
      // schema has the exact fields we manually defined in our TS interface test earlier.

      // We expect kernelSchema to have ObjetoDeInformacion and Provenance
      expect(kernelSchema).toHaveProperty('ObjetoDeInformacion');
      expect(kernelSchema).toHaveProperty('Provenance');

      // Expected keys based on our TS definition
      const expectedObjetoFields = ['id', 'texto', 'provenance', 'metadata'];
      const actualObjetoFields = Object.keys(kernelSchema.ObjetoDeInformacion);
      expect(actualObjetoFields.sort()).toEqual(expectedObjetoFields.sort());

      const expectedProvenanceFields = ['origen', 'driver', 'timestamp'];
      const actualProvenanceFields = Object.keys(kernelSchema.Provenance);
      expect(actualProvenanceFields.sort()).toEqual(expectedProvenanceFields.sort());
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });
});
