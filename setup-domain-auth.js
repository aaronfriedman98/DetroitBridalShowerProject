// Creates (or shows) SendGrid Domain Authentication for the domain we actually
// send from, and prints the exact DNS records to add at GoDaddy.
//   node setup-domain-auth.js          -> show current state only
//   node setup-domain-auth.js --create -> create the authentication record
require('dotenv').config({ path: './config/.env' });
const sgClient = require('@sendgrid/client');
sgClient.setApiKey(process.env.API_KEY);

const DOMAIN = 'detroitbridalshower.org';   // the From: domain used by every email

function printRecords(d) {
  console.log(`\n  id=${d.id}  domain=${d.domain}  subdomain=${d.subdomain}  valid=${d.valid}`);
  console.log('\n  --- DNS records to add at GoDaddy (Type / Name / Value) ---');
  Object.entries(d.dns || {}).forEach(([key, rec]) => {
    // GoDaddy wants the host WITHOUT the root domain appended
    const host = String(rec.host || '').replace(new RegExp('\\.' + DOMAIN.replace(/\./g, '\\.') + '$'), '');
    console.log(`   ${String(rec.type).toUpperCase().padEnd(6)} ${host.padEnd(28)} ${rec.data}   ${rec.valid ? '(valid)' : '(not yet verified)'}`);
  });
}

(async () => {
  const [, list] = await sgClient.request({ url: '/v3/whitelabel/domains', method: 'GET' });
  const rows = Array.isArray(list) ? list : [];
  console.log('=== existing authenticated domains ===');
  rows.forEach(d => console.log(`   ${d.domain}  valid=${d.valid}  default=${d.default}  id=${d.id}`));

  const existing = rows.find(d => d.domain === DOMAIN);

  // --validate: ask SendGrid to re-check DNS once the CNAMEs are in place
  if (process.argv.includes('--validate')) {
    if (!existing) { console.log(`\n${DOMAIN} has no authentication record yet - run with --create first.`); return; }
    console.log(`\nasking SendGrid to validate ${DOMAIN} ...`);
    try {
      const [, result] = await sgClient.request({ url: `/v3/whitelabel/domains/${existing.id}/validate`, method: 'POST' });
      console.log('valid:', result.valid);
      if (!result.valid && result.validation_results) {
        Object.entries(result.validation_results).forEach(([k, v]) => {
          if (!v.valid) console.log(`   still failing - ${k}: ${v.reason}`);
        });
      } else if (result.valid) {
        console.log('\nDomain authentication is live. Emails from @' + DOMAIN + ' are now DKIM-signed and SPF-aligned.');
      }
    } catch (e) {
      console.log('validation call failed:', e.code || e.message, JSON.stringify(e.response?.body || {}));
    }
    return;
  }

  if (existing) {
    console.log(`\n${DOMAIN} already has an authentication record:`);
    printRecords(existing);
    return;
  }

  if (!process.argv.includes('--create')) {
    console.log(`\n${DOMAIN} is NOT authenticated. Re-run with --create to set it up.`);
    return;
  }

  console.log(`\ncreating domain authentication for ${DOMAIN} ...`);
  const [, created] = await sgClient.request({
    url: '/v3/whitelabel/domains',
    method: 'POST',
    body: { domain: DOMAIN, automatic_security: true, default: false }
  });
  console.log('created.');
  printRecords(created);
  console.log('\nAdd those CNAMEs at GoDaddy, then run: node setup-domain-auth.js --validate');
})();
