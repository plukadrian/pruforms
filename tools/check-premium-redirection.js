'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const { generatePdf } = require('../lib/pdf-filler');
const { visibleQuestions } = require('../lib/conditions');
const def = require('../definitions/premium-redirection-fund-switch.json');
const { validatePremiumRedirection } = require('../lib/premium-redirection-validation');
(async () => {
  const answers = {};
  for (const s of def.sections) for (const q of s.questions) {
    answers[q.id] = q.type === 'radio' ? q.options[0].value : q.type === 'date' ? '2026-09-18' : q.type === 'number' ? '25' : q.type === 'signature' ? undefined : 'SAMPLE ANSWER';
  }
  Object.assign(answers, { policy_number: '12345678', request_type: 'both', personal_changes: 'yes', redirection_count: '4', switch_count: '4', civil_status: 'other', fund_source: 'other', has_beneficiary: 'yes', has_assignee: 'yes' });
  assert.equal(validatePremiumRedirection(answers), null);
  assert(validatePremiumRedirection({ ...answers, allocation_0: '24' }));
  assert(validatePremiumRedirection({ ...answers, allocation_0: '20' }));
  for (const kind of ['redirection', 'switch', 'both']) {
    const a = { ...answers, request_type: kind };
    const visible = visibleQuestions(def, a).map(x => x.question.id);
    assert.equal(visible.includes('fund_0'), kind !== 'switch');
    assert.equal(visible.includes('from_0'), kind !== 'redirection');
    assert(!visible.includes('witness_name'));
    const result = await generatePdf(def, a);
    assert.deepEqual(result.problems, []);
    const pdf = await PDFDocument.load(result.bytes);
    assert.equal(pdf.getPageCount(), 3);
    assert.equal(pdf.getForm().getFields().length, 0);
    if (kind === 'both') {
      fs.mkdirSync('tmp/pdfs', { recursive: true });
      fs.writeFileSync('tmp/pdfs/premium-redirection-check.pdf', result.bytes);
    }
  }
  assert(!visibleQuestions(def, { ...answers, personal_changes: 'no' }).some(x => x.question.id === 'gender'));
  console.log('PASS: all request paths render three pages without mapping errors; conditional KYC and witness visibility verified.');
})().catch(e => { console.error(e); process.exitCode = 1; });
