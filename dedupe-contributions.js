// Duplicate contributions cleanup: same couple + same person recorded twice.
//   node dedupe-contributions.js            -> PREVIEW only
//   node dedupe-contributions.js --delete   -> keep the EARLIEST row per (couple, person), delete extras
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });
const Contribution = require('./models/contribution');

(async () => {
  await mongoose.connect(process.env.DB_CONNECTION);
  const all = await Contribution.find().sort({ _id: 1 });   // oldest first
  const seen = new Map();
  const extras = [];
  for (const c of all) {
    const person = String(c.contributorEmail || '').trim().toLowerCase() ||
                   'name:' + String(c.contributorName || '').trim().toLowerCase();
    const key = String(c.coupleId) + '|' + person;
    if (seen.has(key)) extras.push({ id: c._id, keep: seen.get(key), c });
    else seen.set(key, c);
  }
  console.log('total contributions:', all.length, '| duplicate rows found:', extras.length);
  let inflated = 0;
  for (const x of extras) {
    inflated += x.c.amount || 0;
    const amtNote = (x.c.amount === x.keep.amount) ? '' : `  << amounts differ (kept $${x.keep.amount}, removing $${x.c.amount})`;
    console.log(`  DUP ${x.c.contributorName} -> ${x.c.coupleNames}  $${x.c.amount}${amtNote}`);
  }
  console.log('total inflated amount to be removed: $' + inflated.toFixed(2));
  if (process.argv.includes('--delete') && extras.length) {
    const r = await Contribution.deleteMany({ _id: { $in: extras.map(x => x.id) } });
    console.log('DELETED', r.deletedCount, '| remaining:', await Contribution.countDocuments());
  } else if (!process.argv.includes('--delete')) {
    console.log('preview only — run with --delete');
  }
  await mongoose.disconnect();
})();
