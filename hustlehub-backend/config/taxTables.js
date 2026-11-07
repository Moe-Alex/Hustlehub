// South African individual income tax tables used by the tax estimator.
//
// Source: South African Revenue Service (SARS) (n.d.) Rates of tax for individuals.
// Available at: https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/ (Accessed 7 November 2026).
//
// A "tax year" runs from 1 March to the last day of February and is named after the year it ends in
// (the 2027 tax year is 1 March 2026 to 28 February 2027). Each bracket says "income up to this amount is
// taxed at this rate" - only the part of the income that falls inside a bracket is taxed at that bracket's rate.
// Update this file each year when SARS publishes new tables; nothing else in the app needs to change.

const NO_LIMIT = Infinity;

const TAX_TABLES = {
  2026: {
    label: '2025/26',
    brackets: [
      { upTo: 237100, rate: 0.18 },
      { upTo: 370500, rate: 0.26 },
      { upTo: 512800, rate: 0.31 },
      { upTo: 673000, rate: 0.36 },
      { upTo: 857900, rate: 0.39 },
      { upTo: 1817000, rate: 0.41 },
      { upTo: NO_LIMIT, rate: 0.45 },
    ],
    // Rebates are subtracted from the tax calculated on the brackets. Older taxpayers get the extra rebates too.
    rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
  },
  2027: {
    label: '2026/27',
    brackets: [
      { upTo: 245100, rate: 0.18 },
      { upTo: 383100, rate: 0.26 },
      { upTo: 530200, rate: 0.31 },
      { upTo: 695800, rate: 0.36 },
      { upTo: 887000, rate: 0.39 },
      { upTo: 1878600, rate: 0.41 },
      { upTo: NO_LIMIT, rate: 0.45 },
    ],
    rebates: { primary: 17820, secondary: 9765, tertiary: 3249 },
  },
};

// Age groups decide which rebates apply.
const AGE_GROUPS = ['under65', '65to74', '75plus'];

module.exports = { TAX_TABLES, AGE_GROUPS };
