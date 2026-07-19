// Deletes (with --delete) unverified junk approved on 2026-07-18:
//  1. duplicates of an already-verified couple (the unverified extra copy only)
//  2. leftover gibberish spam among unverified
//  3. the "Yent & Yenta" test entry
// HARD GUARD: a record is only ever deleted if verified, collecting and
// announcement are ALL false. Collecting couples are untouchable.
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });
const Couples = require('./models/couplesList');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
const firstLast = (s) => {
  const t = norm(s).split(' ');
  return t.length < 2 ? t[0] || '' : t[0] + ' ' + t[t.length - 1];
};
function spamScore(s) {
  if (!s) return 0;
  const str = String(s).trim();
  const letters = str.replace(/[^a-zA-Z]/g, '');
  if (!letters) return 0;
  let score = 0;
  const vowelRatio = (letters.match(/[aeiouAEIOU]/g) || []).length / letters.length;
  if (vowelRatio < 0.2) score += 2;
  else if (vowelRatio < 0.28) score += 1;
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(letters)) score += 2;
  else if (/[bcdfghjklmnpqrstvwxz]{4}/i.test(letters)) score += 1;
  if (!str.includes(' ') && str.length > 14) score += 1;
  return score;
}

(async () => {
  const doDelete = process.argv.includes('--delete');
  await mongoose.connect(process.env.DB_CONNECTION);
  const all = await Couples.find().select('chossonName kallahName name email verified collecting announcement');
  const safe = (c) => !c.verified && !c.collecting && !c.announcement;   // hard guard
  const unverified = all.filter(safe);
  const verified = all.filter(c => c.verified);

  const toDelete = [];
  const reasons = [];

  for (const u of unverified) {
    const keyExact = norm(u.chossonName) + '|' + norm(u.kallahName);
    const keyLoose = firstLast(u.chossonName) + '|' + firstLast(u.kallahName);

    // 1. duplicate of a verified couple
    const vMatch = verified.find(v =>
      (norm(v.chossonName) + '|' + norm(v.kallahName)) === keyExact ||
      (firstLast(v.chossonName) + '|' + firstLast(v.kallahName)) === keyLoose);
    if (vMatch) { toDelete.push(u); reasons.push(`dup of verified: ${vMatch.chossonName} & ${vMatch.kallahName}${vMatch.collecting ? ' (COLLECTING twin kept)' : ''}`); continue; }

    // 2. gibberish spam: both names spammy, at least one strongly
    const a = spamScore(u.chossonName), b = spamScore(u.kallahName);
    if (Math.min(a, b) >= 1 && Math.max(a, b) >= 3) { toDelete.push(u); reasons.push(`spam (scores ${a}/${b})`); continue; }

    // 3. the test entry
    if (norm(u.chossonName) === 'yent' && norm(u.kallahName) === 'yenta') { toDelete.push(u); reasons.push('test entry'); continue; }
  }

  console.log(`unverified (safe pool): ${unverified.length}`);
  console.log(`marked for deletion: ${toDelete.length}\n`);
  toDelete.forEach((c, i) => console.log(`  DEL ${c.chossonName} & ${c.kallahName}  [${reasons[i]}]`));
  console.log('\nremaining unverified for manual review:');
  unverified.filter(c => !toDelete.includes(c)).forEach(c => console.log(`  KEEP ${c.chossonName} & ${c.kallahName} | by: ${c.name}`));

  if (doDelete) {
    // guard re-check straight from the docs about to be deleted
    if (toDelete.some(c => c.verified || c.collecting || c.announcement)) throw new Error('GUARD TRIPPED - aborting');
    const result = await Couples.deleteMany({ _id: { $in: toDelete.map(c => c._id) }, verified: { $ne: true }, collecting: { $ne: true }, announcement: { $ne: true } });
    console.log(`\nDELETED ${result.deletedCount} records. Total couples now: ${await Couples.countDocuments()}`);
    console.log(`Collecting couples after (must be unchanged): ${await Couples.countDocuments({ collecting: true })}`);
  } else {
    console.log('\nPreview only. Run with --delete to remove.');
  }
  await mongoose.disconnect();
})();
