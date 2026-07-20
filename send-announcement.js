// Community announcement for the new site.
//   node send-announcement.js --preview          -> writes announcement-preview.html, sends nothing
//   node send-announcement.js --test you@x.com   -> sends ONLY to that address
//   node send-announcement.js --send-all         -> sends to the entire mailing list (batched)
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });
const Emails = require('./models/emailList');
const { buildActionEmail } = require('./mailTemplates');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.API_KEY);

const site = (process.env.AZURE_URL || 'https://detroit-bridal-shower.azurewebsites.net').replace(/['"]/g, '');
const gold = '#b3925a', sage = '#494e46';
const h = (t) => `<div style="font-family:'Jost','Segoe UI',Arial,sans-serif; font-size:12px; letter-spacing:3px; text-transform:uppercase; color:${gold}; font-weight:bold; padding:26px 0 6px;">${t}</div>`;

const body = `
We're excited to share that the Detroit Bridal Shower website has been completely rebuilt &mdash; a fresh new look, and some wonderful new ways to take part in every simcha.
${h('The big change: pledge online')}
When you receive a collection email, tap the new <strong style="color:${gold};">&ldquo;Pledge Your Gift Online&rdquo;</strong> button (or visit the website and choose <em>Give a Gift</em>). Pick the couples you'd like to give to &mdash; the suggested $65 is filled in for you and you can adjust it &mdash; and submit. Then send your payment by Zelle, Venmo, PayPal, or check, exactly as you always have.<br/><br/>
No more back-and-forth messages about who you're giving to &mdash; your pledge tells us everything, and you'll even receive a thank-you email once your gift arrives.
${h('With gratitude')}
Our new <a href="${site}/contributors" style="color:${gold};">With Gratitude</a> page lets you search any couple and see the friends and family who gave toward their shower. And under <em>Your Gifts</em>, enter your email to see every couple you've ever contributed to.
${h('And a fresh new look')}
The whole website has been redesigned &mdash; adding a newly engaged couple, browsing the shopping guide, and joining this beautiful project are all easier than ever.
`;

const html = buildActionEmail(
  'Exciting News',
  'A Brand-New Detroit Bridal Shower Website',
  body,
  'Visit the New Website',
  site,
  'Same project, same community, same payment methods you already use — just much easier.'
);

const subject = 'The new Detroit Bridal Shower website is here 💛';
const FROM = 'bridalshower@detroitbridalshower.org';

(async () => {
  if (process.argv.includes('--preview')) {
    fs.writeFileSync('announcement-preview.html', html);
    console.log('wrote announcement-preview.html — nothing sent');
    return;
  }
  const ti = process.argv.indexOf('--test');
  if (ti > -1 && process.argv[ti + 1]) {
    await sgMail.send({ to: process.argv[ti + 1], from: FROM, subject: '[TEST] ' + subject, html });
    console.log('test sent to', process.argv[ti + 1]);
    return;
  }
  if (process.argv.includes('--send-all')) {
    await mongoose.connect(process.env.DB_CONNECTION);
    const emails = await Emails.find().select('email');
    const recipients = [...new Set(emails.map(e => String(e.email || '').trim()).filter(e => /^\S+@\S+\.\S+$/.test(e)))];
    console.log('sending to', recipients.length, 'unique addresses...');
    const batches = [];
    const list = [...recipients];
    while (list.length) batches.push(list.splice(0, 1000));
    for (const batch of batches) {
      await sgMail.sendMultiple({ to: batch, from: FROM, subject, html });
      console.log('sent batch of', batch.length);
    }
    console.log('ALL SENT');
    await mongoose.disconnect();
    return;
  }
  console.log('no mode given: use --preview, --test <email>, or --send-all');
})();
