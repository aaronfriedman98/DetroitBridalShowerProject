// READ-ONLY spam analysis of the couples collection
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });
const Couples = require('./models/couplesList');

function gibberishScore(s) {
  if (!s) return 0;
  const str = String(s).trim();
  let score = 0;
  const letters = str.replace(/[^a-zA-Z]/g, '');
  if (!letters) return 0;
  const vowels = (letters.match(/[aeiouAEIOU]/g) || []).length;
  const ratio = vowels / letters.length;
  if (ratio < 0.2) score += 2;            // almost no vowels
  else if (ratio < 0.28) score += 1;
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(letters)) score += 2;  // long consonant run
  if (/[bcdfghjklmnpqrstvwxz]{4}/i.test(letters)) score += 1;
  if (!str.includes(' ') && str.length > 14) score += 1;        // one long token as "full name"
  if (/^[A-Z][a-z]+[A-Z]/.test(str)) score += 1;                // InternalCaps like bot strings
  return score;
}

(async () => {
  await mongoose.connect(process.env.DB_CONNECTION);
  const all = await Couples.find().select('chossonName kallahName name email verified collecting announcement confNumber').sort({ _id: -1 });

  const classify = (c) => {
    const s = gibberishScore(c.chossonName) + gibberishScore(c.kallahName) + gibberishScore(c.name);
    return s >= 3 ? 'junk' : (s >= 2 ? 'suspicious' : 'clean');
  };

  const buckets = { junk: [], suspicious: [], clean: [] };
  all.forEach(c => buckets[classify(c)].push(c));

  console.log('TOTAL:', all.length);
  console.log('verified:', all.filter(c => c.verified).length, '| collecting:', all.filter(c => c.collecting).length);
  console.log('---');
  console.log('junk:', buckets.junk.length, '| suspicious:', buckets.suspicious.length, '| clean:', buckets.clean.length);
  console.log('junk that are VERIFIED:', buckets.junk.filter(c => c.verified).length);
  console.log('junk that are COLLECTING:', buckets.junk.filter(c => c.collecting).length);
  console.log('suspicious that are VERIFIED:', buckets.suspicious.filter(c => c.verified).length);
  console.log('\n--- sample JUNK (first 15) ---');
  buckets.junk.slice(0, 15).forEach(c => console.log(` [${c.verified?'V':' '}${c.collecting?'C':' '}] ${c.chossonName} & ${c.kallahName} | by: ${c.name} | ${c.email}`));
  console.log('\n--- sample SUSPICIOUS (first 15) ---');
  buckets.suspicious.slice(0, 15).forEach(c => console.log(` [${c.verified?'V':' '}${c.collecting?'C':' '}] ${c.chossonName} & ${c.kallahName} | by: ${c.name} | ${c.email}`));
  console.log('\n--- sample CLEAN unverified (first 10) ---');
  buckets.clean.filter(c => !c.verified).slice(0, 10).forEach(c => console.log(` ${c.chossonName} & ${c.kallahName} | by: ${c.name} | ${c.email}`));

  await mongoose.disconnect();
})();
