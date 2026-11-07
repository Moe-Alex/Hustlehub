// Unit tests for the tax estimator. Expected values were worked out by hand from the SARS tables.
// Run with: npm run test:unit

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateTax, taxThreshold, taxYearOf, taxYearRange, taxYearMonths } = require('../utils/tax');

test('income below the threshold pays no tax (2026/27, under 65)', () => {
  const result = calculateTax({ taxableIncome: 99000, endYear: 2027 });
  assert.equal(result.taxBeforeRebates, 17820); // 99 000 x 18%
  assert.equal(result.estimatedTax, 0); // the R17 820 primary rebate cancels it exactly
  assert.equal(result.marginalRate, 0);
  assert.equal(result.effectiveRate, 0);
});

test('zero income gives zero tax and an empty breakdown', () => {
  const result = calculateTax({ taxableIncome: 0, endYear: 2027 });
  assert.equal(result.estimatedTax, 0);
  assert.deepEqual(result.breakdown, []);
});

test('income inside the first bracket (R200 000)', () => {
  // 200 000 x 18% = 36 000, minus the 17 820 rebate = 18 180
  const result = calculateTax({ taxableIncome: 200000, endYear: 2027 });
  assert.equal(result.estimatedTax, 18180);
  assert.equal(result.marginalRate, 0.18);
  assert.equal(result.effectiveRate, 0.0909);
});

test('income that crosses brackets is taxed slice by slice (R500 000)', () => {
  // 245 100 x 18% = 44 118; 138 000 x 26% = 35 880; 116 900 x 31% = 36 239 -> 116 237; minus 17 820 = 98 417
  const result = calculateTax({ taxableIncome: 500000, endYear: 2027 });
  assert.equal(result.taxBeforeRebates, 116237);
  assert.equal(result.estimatedTax, 98417);
  assert.equal(result.marginalRate, 0.31);
  assert.deepEqual(result.breakdown.map((row) => row.tax), [44118, 35880, 36239]);
});

test('the top bracket applies above R1 878 600', () => {
  // SARS formula: 666 339 + 45% of the amount above 1 878 600 = 666 339 + 45% x 121 400 = 720 969; minus 17 820
  const result = calculateTax({ taxableIncome: 2000000, endYear: 2027 });
  assert.equal(result.taxBeforeRebates, 720969);
  assert.equal(result.estimatedTax, 703149);
  assert.equal(result.marginalRate, 0.45);
  assert.equal(result.breakdown.at(-1).to, null);
});

test('slice-by-slice tax matches the SARS formula at every bracket boundary (2026/27)', () => {
  const sarsBase = [[245100, 44118], [383100, 79998], [530200, 125599], [695800, 185215], [887000, 259783], [1878600, 666339]];
  for (const [income, expected] of sarsBase) {
    assert.equal(calculateTax({ taxableIncome: income, endYear: 2027 }).taxBeforeRebates, expected, `at ${income}`);
  }
});

test('2025/26 tables give different results from 2026/27', () => {
  // 250 000: 237 100 x 18% = 42 678; 12 900 x 26% = 3 354 -> 46 032; minus 17 235 = 28 797
  assert.equal(calculateTax({ taxableIncome: 250000, endYear: 2026 }).estimatedTax, 28797);
  assert.notEqual(calculateTax({ taxableIncome: 250000, endYear: 2027 }).estimatedTax, 28797);
});

test('older taxpayers get the secondary and tertiary rebates', () => {
  const under65 = calculateTax({ taxableIncome: 200000, endYear: 2027, ageGroup: 'under65' }).estimatedTax;
  const sixtyFive = calculateTax({ taxableIncome: 200000, endYear: 2027, ageGroup: '65to74' }).estimatedTax;
  const seventyFive = calculateTax({ taxableIncome: 200000, endYear: 2027, ageGroup: '75plus' }).estimatedTax;
  assert.equal(under65 - sixtyFive, 9765);
  assert.equal(sixtyFive - seventyFive, 3249);
});

test('tax thresholds match the figures published by SARS', () => {
  assert.equal(taxThreshold(2027, 'under65'), 99000);
  assert.equal(taxThreshold(2027, '65to74'), 153250);
  assert.equal(taxThreshold(2027, '75plus'), 171300);
  assert.equal(taxThreshold(2026, 'under65'), 95750);
});

test('invalid input is rejected instead of giving a wrong answer', () => {
  assert.throws(() => calculateTax({ taxableIncome: -1, endYear: 2027 }), RangeError);
  assert.throws(() => calculateTax({ taxableIncome: NaN, endYear: 2027 }), RangeError);
  assert.throws(() => calculateTax({ taxableIncome: 100, endYear: 1999 }), RangeError);
  assert.throws(() => calculateTax({ taxableIncome: 100, endYear: 2027, ageGroup: 'teen' }), RangeError);
});

test('the tax year starts on 1 March (South African time)', () => {
  assert.equal(taxYearOf(new Date('2026-02-28T21:59:59Z')), 2026); // 23:59:59 on 28 Feb in SA
  assert.equal(taxYearOf(new Date('2026-02-28T22:00:00Z')), 2027); // midnight 1 March in SA
  assert.equal(taxYearOf(new Date('2026-11-07T08:00:00Z')), 2027);
  assert.equal(taxYearOf(new Date('2027-02-15T10:00:00Z')), 2027);
});

test('tax year range and months', () => {
  const { start, end } = taxYearRange(2027);
  assert.equal(start.toISOString(), '2026-02-28T22:00:00.000Z');
  assert.equal(end.toISOString(), '2027-02-28T22:00:00.000Z');
  const months = taxYearMonths(2027);
  assert.equal(months.length, 12);
  assert.deepEqual(months[0], { key: '2026-03', label: 'Mar' });
  assert.deepEqual(months[9], { key: '2026-12', label: 'Dec' });
  assert.deepEqual(months[11], { key: '2027-02', label: 'Feb' });
});
