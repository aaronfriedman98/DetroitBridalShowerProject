// Spam cleanup for the couples collection.
//   node cleanup-spam.js            -> PREVIEW ONLY: writes spam-list.txt, deletes nothing
//   node cleanup-spam.js --delete   -> deletes the previewed records
//
// A record only qualifies when ALL are true:
//   - BOTH chosson and kallah names look like random consonant strings
//   - verified is not true
//   - collecting is not true
//   - announcement is not true
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });
const Couples = require('./models/couplesList');

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
const isSpamCouple = (c) =>
  spamScore(c.chossonName) >= 2 && spamScore(c.kallahName) >= 2 &&
  !c.verified && !c.collecting && !c.announcement;

(async () => {
  const doDelete = process.argv.includes('--delete');
  await mongoose.connect(process.env.DB_CONNECTION);
  const all = await Couples.find().select('chossonName kallahName name email verified collecting announcement');
  const spam = all.filter(isSpamCouple);
  const keep = all.length - spam.length;

  const lines = spam.map(c => `${c._id}  ${c.chossonName} & ${c.kallahName}  | by: ${c.name} | ${c.email}`);
  fs.writeFileSync('spam-list.txt', lines.join('\n'));
  console.log(`Total couples: ${all.length}`);
  console.log(`Spam matching strict criteria: ${spam.length}  (would keep ${keep})`);
  console.log('Full list written to spam-list.txt');

  if (doDelete) {
    const ids = spam.map(c => c._id);
    const result = await Couples.deleteMany({ _id: { $in: ids } });
    console.log(`DELETED ${result.deletedCount} spam records.`);
    console.log(`Remaining couples: ${await Couples.countDocuments()}`);
  } else {
    console.log('\nPreview only — nothing deleted. Run with --delete to remove them.');
  }
  await mongoose.disconnect();
})();
