import { test, expect } from '@playwright/test';
import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import ts from 'typescript';
test('Las interfaces reales conservan los campos y obligatoriedad del kernel', () => {
  const kernel = path.resolve(__dirname, '../../kernel/src');
  const script = 'import sys,json; sys.path.insert(0,sys.argv[1]); from dataclasses import fields,MISSING; from khora_kernel.api import ObjetoDeInformacion,Provenance; print(json.dumps({c.__name__:{f.name:f.default is MISSING and f.default_factory is MISSING for f in fields(c)} for c in [ObjetoDeInformacion,Provenance]}))';
  const schema = JSON.parse(execFileSync(process.platform === 'win32' ? 'py' : 'python', ['-c', script, kernel], { encoding: 'utf8' }));
  const file = path.resolve(__dirname, '../lib/contracts/InformationObject.ts');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const actual: Record<string, Record<string, boolean>> = {};
  for (const node of source.statements) if (ts.isInterfaceDeclaration(node)) {
    actual[node.name.text] = Object.fromEntries(node.members.filter(ts.isPropertySignature).map(member => [member.name.getText(source), !member.questionToken]));
  }
  expect(actual).toEqual(schema);
});
