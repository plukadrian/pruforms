'use strict';

function validatePremiumRedirection(answers) {
  if (!['redirection', 'both'].includes(answers.request_type)) return null;
  const count = Number(answers.redirection_count);
  if (![1, 2, 3, 4].includes(count)) return 'Choose the number of premium allocations.';
  const values = Array.from({ length: count }, (_, i) => Number(answers[`allocation_${i}`]));
  if (values.some(v => !Number.isFinite(v) || v <= 0 || v > 100 || v % 5 !== 0)) {
    return 'Premium allocations must be positive multiples of 5%, up to 100%.';
  }
  if (values.reduce((sum, v) => sum + v, 0) !== 100) return 'Premium allocations must total 100%.';
  return null;
}

module.exports = { validatePremiumRedirection };
