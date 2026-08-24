// READ-ONLY: inspect recent contributions for the "not showing up" report
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });
const Contribution = require('./models/contribution');
const Couples = require('./models/couplesList');

(async () => {
  await mongoose.connect(process.env.DB_CONNECTION);
  const all = await Contribution.find().sort({ _id: -1 });
  console.log('total contributions:', all.length);
  console.log('verified:', all.filter(c => c.verified).length, '| pending:', all.filter(c => !c.verified).length);
  console.log('by source: manual =', all.filter(c => c.source === 'manual').length, '| pledge =', all.filter(c => c.source === 'pledge').length);
  console.log('\n--- last 15 (newest first) ---');
  for (const c of all.slice(0, 15)) {
    const when = new Date(parseInt(String(c._id).substring(0, 8), 16) * 1000).toLocaleString('en-US');
    console.log(`[${c.verified ? 'V' : ' '}|${(c.source || '?').padEnd(6)}] ${when} | ${c.contributorName} -> ${c.coupleNames} | $${c.amount} | email:${c.contributorEmail || '-'}`);
  }
  // integrity: does every contribution's coupleId still match a real couple?
  const coupleIds = new Set((await Couples.find().select('_id')).map(c => String(c._id)));
  const orphans = all.filter(c => !coupleIds.has(String(c.coupleId)));
  console.log('\norphaned contributions (coupleId not in couples db):', orphans.length);
  orphans.slice(0, 10).forEach(c => console.log('  ORPHAN:', c.contributorName, '->', c.coupleNames, '| coupleId:', c.coupleId));
  // integrity: missing coupleNames (breaks public page rendering)
  const noNames = all.filter(c => !c.coupleNames);
  console.log('missing coupleNames:', noNames.length);
  await mongoose.disconnect();
})();
