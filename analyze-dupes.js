// READ-ONLY: are the unverified couples duplicates of verified ones?
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });
const Couples = require('./models/couplesList');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
const firstLast = (s) => {
  const t = norm(s).split(' ');
  return t.length < 2 ? t[0] || '' : t[0] + ' ' + t[t.length - 1];
};

(async () => {
  await mongoose.connect(process.env.DB_CONNECTION);
  const all = await Couples.find().select('chossonName kallahName name email verified collecting announcement');
  const unverified = all.filter(c => !c.verified);
  const verified = all.filter(c => c.verified);

  console.log('total:', all.length, '| unverified:', unverified.length, '| verified:', verified.length);
  console.log('');

  const results = { dupOfVerified: [], dupWithinUnverified: [], unique: [] };
  const seenUnv = new Map();

  for (const u of unverified) {
    const keyExact = norm(u.chossonName) + '|' + norm(u.kallahName);
    const keyLoose = firstLast(u.chossonName) + '|' + firstLast(u.kallahName);

    const vMatch = verified.find(v =>
      (norm(v.chossonName) + '|' + norm(v.kallahName)) === keyExact ||
      (firstLast(v.chossonName) + '|' + firstLast(v.kallahName)) === keyLoose
    );
    if (vMatch) {
      results.dupOfVerified.push({ u, v: vMatch });
    } else if (seenUnv.has(keyLoose)) {
      results.dupWithinUnverified.push({ u, first: seenUnv.get(keyLoose) });
    } else {
      seenUnv.set(keyLoose, u);
      results.unique.push(u);
    }
  }

  console.log('=== DUPLICATES of an already-VERIFIED couple:', results.dupOfVerified.length, '===');
  results.dupOfVerified.forEach(({ u, v }) =>
    console.log(`  ${u.chossonName} & ${u.kallahName}  (dup of ${v.collecting ? 'COLLECTING' : 'verified'}: ${v.chossonName} & ${v.kallahName})`));

  console.log('\n=== DUPLICATE submissions within unverified:', results.dupWithinUnverified.length, '===');
  results.dupWithinUnverified.forEach(({ u }) => console.log(`  ${u.chossonName} & ${u.kallahName}`));

  console.log('\n=== UNIQUE unverified (no match anywhere):', results.unique.length, '===');
  results.unique.forEach(u => console.log(`  ${u.chossonName} & ${u.kallahName} | by: ${u.name} | ${u.email}`));

  await mongoose.disconnect();
})();
