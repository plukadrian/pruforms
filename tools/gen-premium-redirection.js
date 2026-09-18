'use strict';
// Maps the original 2021 PRULink three-page application.
const fs = require('fs');
const path = require('path');
const sections = [];
const section = (id, title, questions, extra = {}) => sections.push({ id, title, ...extra, questions });
const text = (id, q, field, extra = {}) => ({ id, q, type: 'text', ...extra, map: field ? [{ text: field }] : [] });
const choice = (id, q, options, extra = {}) => ({ id, q, type: 'radio', required: true, options: options.map(([value, label]) => ({ value, label })), map: [], ...extra });
const yn = [['yes', 'Yes'], ['no', 'No']];
const comb = (fields, format) => [{ comb: fields, ...(format ? { format } : {}) }];
const nums = (prefix, start = 0) => Array.from({ length: 8 }, (_, i) => prefix + (i + start));
section('policyowner', 'Policyowner details', [
  { ...text('policy_number', 'Policy number', null, { required: true }), map: comb(nums('POLICYNUMBER-1.')) },
  text('surname', 'Surname', 'NAME-A5.0.0---ALPHA-1', { required: true }),
  text('given_name', 'Given name', '-2', { required: true }),
  text('middle_name', 'Middle name', 'NAME-A5.0.0---ALPHA'),
  text('alias', 'Other legal name / alias', 'NAME-A5.0.0'),
  { ...text('dob', 'Date of birth', null, { type: 'date', required: true }), map: comb(nums('DOB-1.'), 'date_digits') },
  text('nationality', 'Nationality', 'NUMBER-1.2', { required: true }),
  text('mobile', 'Mobile number', 'NUMBER-1.0', { type: 'phone', required: true }),
  text('telephone', 'Telephone number', 'NUMBER-1.1', { type: 'phone' }),
  text('occupation', 'Occupation and exact duties (AFP/PNP: include rank)', 'NAME-A5.0.1'),
  text('employer', 'Employer / business name', 'NAME-A5.1.1'),
  choice('personal_changes', 'Have your personal details changed in Pru Life UK records?', yn, { map: [{ radio: 'Check Box5-OH-OH', valueMap: { yes: 'Yes', no: '2' } }] }),
  choice('request_type', 'What would you like to request?', [['redirection', 'Premium redirection'], ['switch', 'Fund switch'], ['both', 'Both']]),
]);
for (const kind of ['redirection', 'switch']) {
  const questions = [choice(`${kind}_count`, `How many ${kind === 'switch' ? 'transfers' : 'fund allocations'}?`, [1, 2, 3, 4].map(n => [String(n), String(n)]))];
  for (let i = 0; i < 4; i++) {
    const extra = { required: true, showIf: { q: `${kind}_count`, gte: i + 1 } };
    if (kind === 'redirection') {
      questions.push(text(`fund_${i}`, `Fund ${i + 1}: name`, `TEXT TEXT AW.${i}`, extra));
      questions.push(text(`allocation_${i}`, `Fund ${i + 1}: percentage`, `TEXT TEXT AW-B.${i}`, { ...extra, type: 'number', help: 'Enter a multiple of 5, without %. All allocations must total 100%.' }));
    } else {
      questions.push(text(`from_${i}`, `Transfer ${i + 1}: source fund`, `FROM.${i}`, extra));
      questions.push(text(`to_${i}`, `Transfer ${i + 1}: destination fund`, `TO.${i}`, extra));
      questions.push(text(`amount_${i}`, `Transfer ${i + 1}: amount or percentage`, `AMOUNT.${i}`, { ...extra, help: 'Include the currency for an amount, or % for a percentage (e.g. PHP 10000 or 100%). Use multiples of 5% when switching by proportion to more than one fund.' }));
    }
  }
  section(kind, kind === 'switch' ? 'Fund switch' : 'Premium redirection', questions, {
    showIf: { q: 'request_type', in: [kind, 'both'] },
    intro: kind === 'switch' ? 'Transfer accumulated units between funds. Company minimum transfer and remaining-balance rules apply; review the rules in the PDF with your agent.' : 'Redirect future renewal premiums. Allocations must total 100%, in multiples of 5%. The new direction takes effect on the next premium payment.',
  });
}
const kyc = [];
const kt = (id, label, field, extra) => kyc.push(text(id, label, 'Text_RED-' + field, extra));
const kr = (id, label, options, field, valueMap, extra = {}) => kyc.push(choice(id, label, options, { required: false, map: [{ radio: field, valueMap }], ...extra }));
kr('gender', 'Gender', [['male', 'Male'], ['female', 'Female']], 'GENDER-1', { male: '1', female: '2' });
kr('civil_status', 'Civil status', [['single', 'Single'], ['married', 'Married'], ['other', 'Other']], 'CV-1', { single: '1', married: '3', other: '2' });
kt('civil_other', 'Other civil status', '1.1.0', { showIf: { q: 'civil_status', eq: 'other' } });
for (const [id, label, field, type] of [
  ['salutation', 'Salutation', '1.0.1'], ['kyc_dob', 'Updated date of birth', '1.0.2', 'date'],
  ['age', 'Age', '1.0.3', 'number'], ['kyc_nationality', 'Updated nationality', '1.1.1'],
  ['birthplace', 'Place of birth (city/province, country)', '1.1.3'], ['sss', 'SSS / GSIS number', '1.2.0'],
  ['tin', 'TIN', '1.2.1'], ['id_type', 'Other identification type', '1.2.2'], ['id_number', 'Other ID number', '1.2.3'],
  ['kyc_occupation', 'Updated occupation and exact duties', '1.1.2'], ['work_nature', 'Nature of work / business', '1.3.2'],
  ['kyc_employer', 'Updated employer', '1.3.0'], ['employer_nature', 'Nature of employer business', '1.4.0'],
  ['income', 'Gross annual income (PHP)', '1.3.1', 'number'], ['net_worth', 'Net worth (PHP)', '1.4.1', 'number'],
  ['kyc_mobile', 'Updated mobile number', '1.5.0', 'phone'], ['kyc_phone', 'Updated telephone number', '1.6.0', 'phone'],
  ['email', 'Email address', '1.7.0', 'email'],
]) kt(id, label, field, type ? { type } : {});
kyc.find(q => q.id === 'kyc_dob').map[0].format = 'date_mdY';
kr('fund_source', 'Source of funds', [['salary', 'Salary'], ['business', 'Business'], ['other', 'Other']], 'SF-1', { salary: '1', business: '3', other: '2' });
kt('fund_source_other', 'Other source of funds', '1.3.3', { showIf: { q: 'fund_source', eq: 'other' } });
for (const [prefix, label, row] of [['present', 'Present', 5], ['permanent', 'Permanent', 6], ['business', 'Business / employer', 7]]) {
  kt(`${prefix}_address`, `${label} address (number, street, city, province)`, `1.${row}.1`);
  kt(`${prefix}_country`, `${label} country`, `1.${row}.2`);
  kt(`${prefix}_zip`, `${label} ZIP code`, `1.${row}.3`);
}
kr('update_mailing', 'Update your mailing address?', yn, 'YN-1', { yes: '1', no: '3' });
kr('mailing_address', 'Preferred mailing address', [['present', 'Present'], ['permanent', 'Permanent'], ['business', 'Business / employer']], 'YN-2', { present: '1', permanent: '3', business: '2' }, { showIf: { q: 'update_mailing', eq: 'yes' } });
section('kyc', 'Additional KYC details', kyc, { showIf: { q: 'personal_changes', eq: 'yes' }, intro: 'Enter the details that have changed. If premiums come from a third-party payor, also accomplish the separate KYC for Beneficial Owner Form.' });
section('beneficial_owner', 'Beneficial owner', [choice('beneficial_owner', 'Do you have a beneficial owner?', yn, { help: 'A natural person who ultimately owns or controls the customer, or on whose behalf a transaction is conducted. If yes, also accomplish the separate KYC for Beneficial Owner Form.', map: [{ radio: 'YN-OH YES', valueMap: { yes: '1', no: '3' } }] })]);
const sig = (id, label, box, extra = {}) => ({ id, q: label, type: 'signature', ...extra, map: [{ image: { page: 3, tbox: box } }] });
const name = (id, label, x, y, extra = {}) => ({ ...text(id, label, null, extra), map: [{ draw: { page: 3, tbox: [x, y, 228, 9] } }] });
section('signatures', 'Declarations and signatures', [
  choice('declarations', 'Have you read and agreed to the declarations and privacy purpose statement on pages 2 and 3 of the PDF?', [['yes', 'I have read and agree']], { help: 'Open Preview PDF to read the complete terms before signing.' }),
  text('executed_at', 'Place of signing', 'SIGNATURE-2', { required: true }),
  { ...text('sign_date', 'Date completed', null, { type: 'date', required: true }), map: comb(nums('DATE-A', 1), 'date_digits') },
  name('signer_name', 'Policyowner / authorized representative: printed name', 64, 268, { required: true }),
  sig('signature', 'Policyowner / authorized representative: signature', [64, 251, 228, 17], { required: true }),
  choice('has_beneficiary', 'Does an irrevocable beneficiary need to sign?', yn),
  name('beneficiary_name', 'Irrevocable beneficiary: full name(s)', 64, 312, { required: true, showIf: { q: 'has_beneficiary', eq: 'yes' } }),
  sig('beneficiary_signature', 'Irrevocable beneficiary signature(s)', [64, 295, 228, 17], { required: true, showIf: { q: 'has_beneficiary', eq: 'yes' } }),
  choice('has_assignee', 'Does an authorized signatory of an assignee need to sign?', yn),
  name('assignee_name', 'Authorized signatory of assignee: printed name', 314, 312, { required: true, showIf: { q: 'has_assignee', eq: 'yes' } }),
  sig('assignee_signature', 'Authorized signatory of assignee: signature', [314, 295, 228, 17], { required: true, showIf: { q: 'has_assignee', eq: 'yes' } }),
], { intro: 'Review the full declarations and privacy statement in Preview PDF. The application takes effect only after Pru Life UK receives and approves it.' });
section('customary_signatures', 'Certification of customary signatures', [
  ...[0, 1, 2].map(i => sig(`customary_${i}`, `Policyowner / authorized representative: customary signature ${i + 1}`, [237 + i * 108, 361, 94, 50], { required: true })),
  ...[0, 1, 2].map(i => sig(`beneficiary_customary_${i}`, `Irrevocable beneficiary: customary signature ${i + 1}`, [236 + i * 108, 445, 94, 50], { showIf: { q: 'has_beneficiary', eq: 'yes' } })),
], { intro: 'Provide the customary signatures certified on page 3 of the form.' });
section('witness', 'Witness (agent review)', [
  name('witness_name', 'Witness: printed name', 314, 268),
  sig('witness_signature', 'Witness: signature', [314, 251, 228, 17]),
], { admin: true });
const definition = { id: 'premium-redirection-fund-switch', title: 'Premium Redirection and Fund Switch', description: 'Redirect future renewal premiums, switch accumulated units between funds, or request both.', pdf: 'premium-redirection-fund-switch.pdf', sections };
fs.writeFileSync(path.join(__dirname, '../definitions/premium-redirection-fund-switch.json'), JSON.stringify(definition, null, 2) + '\n');
