const crypto = require('crypto');

const TIER_PLANS = {
  'Trial': { max_student_uploads: 50, max_staff_uploads: 50, price: 0 },
  'Tier 1': { max_student_uploads: 5000, max_staff_uploads: 500, price: 500 },
  'Tier 2': { max_student_uploads: 10000, max_staff_uploads: 1000, price: 1200 },
  'Tier 3': { max_student_uploads: 15000, max_staff_uploads: 2500, price: 2500 },
  'Tier 4': { max_student_uploads: 50000, max_staff_uploads: 5000, price: 5000 },
  'Enterprise': { max_student_uploads: -1, max_staff_uploads: -1, price: -1 }
};

function generateLicenseKey() {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
}

module.exports = {
    TIER_PLANS,
    generateLicenseKey
};