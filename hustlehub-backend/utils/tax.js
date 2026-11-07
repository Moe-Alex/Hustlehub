// Tax estimation for South African freelancers. Pure functions (no database, no clock) so every
// calculation can be checked by hand and unit tested.
//
// Method (progressive tax, as described by SARS):
//   1. Taxable income = income earned in the tax year minus deductible business expenses.
//   2. Each slice of taxable income is taxed at the rate of the bracket it falls in.
//   3. The rebate(s) for the taxpayer's age group are subtracted. Tax can never go below zero.
// Sources: SARS (2026) Rates of tax for individuals; SARS (2026) Provisional tax.

const { TAX_TABLES, AGE_GROUPS } = require('../config/taxTables');
const { round2 } = require('./money');

// South Africa uses one time zone all year (UTC+2, no daylight saving), so a fixed offset is exact.
const SAST_OFFSET = '+02:00';
const TAX_TIME_ZONE = 'Africa/Johannesburg';

// Which tax year a date falls in: from 1 March the next tax year (which is named after the year it ends in) begins.
function taxYearOf(date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TAX_TIME_ZONE, year: 'numeric', month: 'numeric' }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year').value);
  const month = Number(parts.find((p) => p.type === 'month').value);
  return month >= 3 ? year + 1 : year;
}

// The exact moment the tax year starts (inclusive) and ends (exclusive).
function taxYearRange(endYear) {
  return {
    start: new Date(`${endYear - 1}-03-01T00:00:00${SAST_OFFSET}`),
    end: new Date(`${endYear}-03-01T00:00:00${SAST_OFFSET}`),
  };
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The 12 months of a tax year in order, March first: [{ key: '2026-03', label: 'Mar' }, ...]
function taxYearMonths(endYear) {
  return Array.from({ length: 12 }, (_, i) => {
    const monthNumber = ((i + 2) % 12) + 1; // 3,4,...,12,1,2
    const year = monthNumber >= 3 ? endYear - 1 : endYear;
    return { key: `${year}-${String(monthNumber).padStart(2, '0')}`, label: MONTH_NAMES[monthNumber - 1] };
  });
}

function rebateFor(ageGroup, rebates) {
  let total = rebates.primary;
  if (ageGroup === '65to74' || ageGroup === '75plus') total += rebates.secondary;
  if (ageGroup === '75plus') total += rebates.tertiary;
  return total;
}

// Income below this amount pays no tax at all (the rebate wipes out the tax on the first bracket).
function taxThreshold(endYear, ageGroup = 'under65') {
  // eslint-disable-next-line security/detect-object-injection -- endYear is a whole number checked by the validator, and the age group is checked against AGE_GROUPS
  const table = TAX_TABLES[endYear];
  return round2(rebateFor(ageGroup, table.rebates) / table.brackets[0].rate);
}

// Calculates the estimated tax for one tax year.
function calculateTax({ taxableIncome, endYear, ageGroup = 'under65' }) {
  // eslint-disable-next-line security/detect-object-injection -- endYear is a whole number checked by the validator, and the age group is checked against AGE_GROUPS
  const table = TAX_TABLES[endYear];
  if (!table) throw new RangeError(`No tax table for the ${endYear} tax year.`);
  if (!AGE_GROUPS.includes(ageGroup)) throw new RangeError(`Unknown age group "${ageGroup}".`);
  if (!Number.isFinite(taxableIncome) || taxableIncome < 0) throw new RangeError('Taxable income must be zero or more.');

  const breakdown = [];
  let previousLimit = 0;
  let taxBeforeRebates = 0;
  let marginalRate = table.brackets[0].rate;

  for (const bracket of table.brackets) {
    const amountInBracket = Math.max(0, Math.min(taxableIncome, bracket.upTo) - previousLimit);
    if (amountInBracket > 0) {
      const tax = amountInBracket * bracket.rate;
      taxBeforeRebates += tax;
      marginalRate = bracket.rate;
      breakdown.push({
        from: previousLimit,
        to: bracket.upTo === Infinity ? null : bracket.upTo,
        rate: bracket.rate,
        amountInBracket: round2(amountInBracket),
        tax: round2(tax),
      });
    }
    previousLimit = bracket.upTo;
  }

  const rebate = rebateFor(ageGroup, table.rebates);
  const estimatedTax = round2(Math.max(0, taxBeforeRebates - rebate));

  return {
    taxBeforeRebates: round2(taxBeforeRebates),
    rebate,
    estimatedTax,
    marginalRate: estimatedTax === 0 ? 0 : marginalRate,
    effectiveRate: taxableIncome > 0 ? Math.round((estimatedTax / taxableIncome) * 10000) / 10000 : 0,
    threshold: taxThreshold(endYear, ageGroup),
    breakdown,
  };
}

module.exports = { taxYearOf, taxYearRange, taxYearMonths, calculateTax, taxThreshold, TAX_TIME_ZONE };
