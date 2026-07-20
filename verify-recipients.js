// READ-ONLY: confirm the announcement would go to the SAME list as collection emails
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });
const Emails = require('./models/emailList');

(async () => {
  await mongoose.connect(process.env.DB_CONNECTION);
  const rows = await Emails.find().select('email');
  const valid = [...new Set(rows.map(e => String(e.email || '').trim()).filter(e => /^\S+@\S+\.\S+$/.test(e)))];
  const invalid = rows.filter(e => !/^\S+@\S+\.\S+$/.test(String(e.email || '').trim()));
  console.log('collection-email source  : models/emailList  (collection "Emails.find({})")');
  console.log('total rows in list       :', rows.length);
  console.log('unique valid recipients  :', valid.length);
  console.log('skipped (malformed)      :', invalid.length);
  console.log('sample:', valid.slice(0, 3).join(', '));
  await mongoose.disconnect();
})();
