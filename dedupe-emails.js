// Dedupe the mailing list: keep the OLDEST row per address (case-insensitive), delete the rest.
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });
const Emails = require('./models/emailList');

(async () => {
  await mongoose.connect(process.env.DB_CONNECTION);
  const all = await Emails.find().select('email').sort({ _id: 1 });   // oldest first
  const seen = new Set();
  const remove = [];
  for (const e of all) {
    const k = String(e.email || '').trim().toLowerCase();
    if (seen.has(k)) remove.push(e._id);
    else seen.add(k);
  }
  console.log('rows:', all.length, '| unique:', seen.size, '| duplicates to delete:', remove.length);
  if (process.argv.includes('--delete') && remove.length) {
    const r = await Emails.deleteMany({ _id: { $in: remove } });
    console.log('DELETED', r.deletedCount, '| remaining:', await Emails.countDocuments());
    const c = await Emails.countDocuments({ email: /cudman98@hotmail\.com/i });
    console.log('cudman98@hotmail.com rows now:', c);
  } else {
    console.log('preview only — run with --delete');
  }
  await mongoose.disconnect();
})();
