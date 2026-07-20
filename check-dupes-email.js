// READ-ONLY: check duplicate rows in the Emails (mailing list) collection
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });
const Emails = require('./models/emailList');

(async () => {
  await mongoose.connect(process.env.DB_CONNECTION);
  const all = await Emails.find().select('email');
  console.log('total mailing-list rows:', all.length);
  const counts = new Map();
  for (const e of all) {
    const k = String(e.email || '').trim().toLowerCase();
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const dupes = [...counts].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
  console.log('addresses with duplicates:', dupes.length);
  dupes.slice(0, 25).forEach(([em, n]) => console.log(' ', em, 'x' + n));
  console.log('cudman98@hotmail.com count:', counts.get('cudman98@hotmail.com') || 0);
  await mongoose.disconnect();
})();
