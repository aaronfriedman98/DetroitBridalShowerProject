// Remove one address from the mailing list (all copies, case-insensitive).
//   node remove-subscriber.js <email>            -> preview
//   node remove-subscriber.js <email> --delete   -> remove
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });
const Emails = require('./models/emailList');

(async () => {
  const email = process.argv[2];
  if (!email) { console.log('usage: node remove-subscriber.js <email> [--delete]'); process.exit(1); }
  await mongoose.connect(process.env.DB_CONNECTION);
  const pattern = new RegExp('^\\s*' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i');
  const found = await Emails.find({ email: pattern });
  console.log('matching rows:', found.length);
  found.forEach(f => console.log('  ', JSON.stringify(f.email)));
  if (process.argv.includes('--delete') && found.length) {
    const r = await Emails.deleteMany({ email: pattern });
    console.log('DELETED', r.deletedCount, '| list size now:', await Emails.countDocuments());
  } else if (!process.argv.includes('--delete')) {
    console.log('preview only — add --delete to remove');
  }
  await mongoose.disconnect();
})();
