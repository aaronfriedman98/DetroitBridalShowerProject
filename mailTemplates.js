// Shared branded email templates for the Detroit Bridal Shower site.

// Public-facing base URL used for links and the logo inside emails.
// NOTE: detroitbridalshower.org is currently only a domain-forwarding stub -
// it 301s the bare root here and 404s on every path (/give, /assets/...), so
// it CANNOT be used for email links or images. Once that domain is bound to
// the app properly in Azure, set SITE_URL and everything switches over.
function publicSiteURL() {
  return String(process.env.SITE_URL || process.env.AZURE_URL || 'https://detroit-bridal-shower.azurewebsites.net')
    .replace(/['"]/g, '').replace(/\/+$/, '')
}

// ---------------------------------------------------------------------------
// Shared branded transactional email (confirmations, verifications).
// ---------------------------------------------------------------------------
function emailRows(pairs) {
  const rows = pairs.filter(p => p[1] && String(p[1]).trim() && String(p[1]).trim() !== 'Title')
    .map(p => `
    <tr>
      <td style="padding:7px 12px; border-bottom:1px solid #f0ece3; font-family:'Jost','Segoe UI',Arial,sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#6d6d64; white-space:nowrap;">${p[0]}</td>
      <td style="padding:7px 12px; border-bottom:1px solid #f0ece3; font-family:'Cormorant Garamond',Georgia,serif; font-size:17px; color:#2e2e29;">${p[1]}</td>
    </tr>`).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:6px; text-align:left;">${rows}</table>`
}

function buildActionEmail(kicker, title, bodyHtml, buttonText, buttonUrl, footNote) {
  const site = publicSiteURL()
  const serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
  const sans = "'Jost', 'Segoe UI', Arial, sans-serif"
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet" type="text/css"/>
</head>
<body style="margin:0; padding:0; background-color:#f4f1ea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ea;">
<tr><td align="center" style="padding:34px 12px 44px;">
  <table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" style="width:100%; max-width:560px; margin:0 auto; background-color:#ffffff; border:1px solid #e7e2d8; border-radius:18px;">
    <tr><td align="center" style="padding:38px 34px 0;">
      <img src="${site}/assets/images/bridalshowerpic.jpg" width="92" alt="Detroit Bridal Shower" style="display:block; margin:0 auto; border:0;"/>
      <div style="font-family:${sans}; font-size:11px; letter-spacing:5px; text-transform:uppercase; color:#494e46; padding-top:14px;">Detroit Bridal Shower</div>
      <div style="font-family:${sans}; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#b3925a; font-weight:bold; padding-top:22px;">${kicker}</div>
      <div style="font-family:${serif}; font-size:30px; color:#383c36; padding-top:8px; line-height:1.25;">${title}</div>
    </td></tr>
    <tr><td style="padding:16px 34px 0;">
      <div style="font-family:${serif}; font-size:18px; color:#2e2e29; line-height:1.65; text-align:center;">${bodyHtml}</div>
    </td></tr>
    ${buttonText ? `<tr><td align="center" style="padding:26px 34px 0;">
      <a href="${buttonUrl}" style="display:inline-block; background-color:#b3925a; color:#ffffff; font-family:${sans}; font-size:15px; letter-spacing:1px; text-decoration:none; border-radius:999px; padding:15px 40px;">${buttonText}</a>
    </td></tr>` : ''}
    ${footNote ? `<tr><td align="center" style="padding:18px 40px 0;">
      <div style="font-family:${sans}; font-size:12.5px; color:#6d6d64; line-height:1.6;">${footNote}</div>
    </td></tr>` : ''}
    <tr><td align="center" style="padding:26px 34px 36px;">
      <div style="width:54px; height:1px; background-color:#d9c9a6; margin:0 auto 16px; font-size:0;">&nbsp;</div>
      <div style="font-family:${serif}; font-style:italic; font-size:19px; color:#494e46;">Becky Friedman</div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Collection email template (shared by sendNewsletter, sendNewNewsletter and
// the dashboard preview). The couple strings are built by the callers with
// the full divorced / remarried / deceased parent logic - this only wraps
// them in the branded layout. Table-based + inline styles for email clients.
// ---------------------------------------------------------------------------
function buildCollectionEmail(newCoupleString, couplesString, unsubscribeURL) {
  const site = publicSiteURL()
  const logo = site + '/assets/images/bridalshowerpic.jpg'
  const serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
  const sans = "'Jost', 'Segoe UI', Arial, sans-serif"
  const ink = '#2e2e29', soft = '#6d6d64', sage = '#494e46', gold = '#b3925a'

  const sectionLabel = (text) => `
  <tr><td align="center" style="padding: 34px 40px 6px;">
    <div style="font-family: ${sans}; font-size: 12px; letter-spacing: 4px; text-transform: uppercase; color: ${gold}; font-weight: bold;">${text}</div>
    <div style="width: 54px; height: 1px; background-color: #d9c9a6; margin: 12px auto 0; font-size: 0; line-height: 0;">&nbsp;</div>
  </td></tr>`

  const payCell = (method, value) => `
  <td width="50%" align="center" valign="top" style="padding: 14px 10px;">
    <div style="font-family: ${sans}; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: ${sage}; font-weight: bold; padding-bottom: 6px;">${method}</div>
    <div style="font-family: ${serif}; font-size: 18px; color: ${ink}; line-height: 1.45;">${value}</div>
  </td>`

  const featuredSection = newCoupleString ? `
  ${sectionLabel('New Chosson &amp; Kallah')}
  <tr><td align="center" style="padding: 16px 48px 8px;">
    <div style="font-family: ${serif}; font-size: 24px; color: ${sage}; line-height: 1.55;">${newCoupleString}</div>
  </td></tr>` : ''

  const collectingSection = couplesString ? `
  ${sectionLabel('Still Collecting For')}
  <tr><td align="center" style="padding: 16px 48px 8px;">
    <div style="font-family: ${serif}; font-size: 20px; color: ${soft}; line-height: 1.55;">${couplesString}</div>
  </td></tr>` : ''

  return `<!DOCTYPE html>
<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<title>Detroit Bridal Shower</title>
<meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet" type="text/css"/>
<!--<![endif]-->
<style>
  body { margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none; }
  table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { border: 0; display: block; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  @media (max-width: 700px) {
    .card { width: 100% !important; }
    .pad-lg { padding-left: 22px !important; padding-right: 22px !important; }
  }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f1ea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f1ea;">
<tr><td align="center" style="padding: 36px 12px 44px;">

  <!--[if mso]><table role="presentation" width="640" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
  <table role="presentation" class="card" align="center" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e2d8; border-radius: 18px;">

    <!-- header -->
    <tr><td align="center" style="padding: 44px 40px 0;">
      <img src="${logo}" width="120" alt="Detroit Bridal Shower" style="width: 120px; height: auto; margin: 0 auto;"/>
    </td></tr>
    <tr><td align="center" style="padding: 22px 40px 0;">
      <div style="font-family: ${sans}; font-size: 13px; letter-spacing: 6px; text-transform: uppercase; color: ${sage};">Detroit Bridal Shower</div>
    </td></tr>
    <tr><td align="center" style="padding: 10px 40px 0;">
      <div style="font-family: ${serif}; font-style: italic; font-size: 52px; color: ${gold}; line-height: 1.1;">Mazel Tov!</div>
    </td></tr>

    <!-- intro -->
    <tr><td align="center" class="pad-lg" style="padding: 22px 56px 4px;">
      <div style="font-family: ${serif}; font-size: 20px; color: ${ink}; line-height: 1.6;">
        We are so fortunate for all the future Chossons and Kallahs from our community.
        To take part in these bridal showers, tap the button below to pledge your gift online.
      </div>
    </td></tr>

    <!-- give online button (top - most readers never reach the bottom) -->
    <tr><td align="center" style="padding: 24px 40px 2px;">
      <a href="${site}/give" style="display: inline-block; background-color: ${gold}; color: #ffffff; font-family: ${sans}; font-size: 16px; letter-spacing: 1px; text-decoration: none; border-radius: 999px; padding: 15px 40px;">💛 Pledge Your Gift Online &rarr;</a>
      <div style="font-family: ${sans}; font-size: 12.5px; color: ${soft}; padding-top: 8px;">Pick your couples in under a minute &mdash; then send payment however you like.</div>
    </td></tr>

    ${featuredSection}
    ${collectingSection}

    <!-- amount -->
    <tr><td class="pad-lg" style="padding: 30px 48px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f3e8; border-radius: 14px;">
        <tr><td align="center" style="padding: 24px 30px;">
          <div style="font-family: ${serif}; font-size: 21px; color: ${sage}; line-height: 1.55;">
            The recommended amount is <strong style="color: ${gold};">$65 per shower</strong> &mdash; any amount is warmly accepted.
          </div>
          <div style="font-family: ${sans}; font-size: 14px; color: ${soft}; line-height: 1.6; padding-top: 10px;">
            Please reply confirming which shower/s you would like to join, and send payment using one of the methods below.
          </div>
        </td></tr>
      </table>
    </td></tr>

    <!-- give online button -->
    <tr><td align="center" style="padding: 26px 40px 4px;">
      <a href="${site}/give" style="display: inline-block; background-color: ${gold}; color: #ffffff; font-family: ${sans}; font-size: 16px; letter-spacing: 1px; text-decoration: none; border-radius: 999px; padding: 16px 44px;">Give a Gift Online &rarr;</a>
      <div style="font-family: ${sans}; font-size: 12.5px; color: ${soft}; padding-top: 10px;">Pick your couples in under a minute &mdash; then send payment any way you like below.</div>
    </td></tr>

    <!-- payment methods -->
    ${sectionLabel('Ways to Give')}
    <tr><td class="pad-lg" style="padding: 10px 40px 6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${payCell('Zelle', 'beckyfriedman1@gmail.com')}
          ${payCell('Venmo', '@Becky-Friedman-8')}
        </tr>
        <tr>
          ${payCell('PayPal', 'beckyfriedman1@gmail.com')}
          ${payCell('Check', 'Made out to<br/>Detroit Bridal Shower Project<br/>17322 Goldwin Drive<br/>Southfield, MI 48075')}
        </tr>
      </table>
    </td></tr>

    <!-- closing -->
    <tr><td align="center" class="pad-lg" style="padding: 26px 56px 0;">
      <div style="width: 54px; height: 1px; background-color: #d9c9a6; margin: 0 auto 22px; font-size: 0; line-height: 0;">&nbsp;</div>
      <div style="font-family: ${serif}; font-size: 19px; color: ${soft}; line-height: 1.65;">
        Every collection helps start off a Chosson and Kallah with all of their household basics.<br/>
        Recently engaged? <a href="${site}" style="color: ${gold}; text-decoration: underline;">Add your couple on our website</a>.
      </div>
    </td></tr>

    <tr><td align="center" class="pad-lg" style="padding: 26px 56px 40px;">
      <div style="font-family: ${serif}; font-size: 20px; color: ${ink}; line-height: 1.6;">
        We should continue to hear of many more simchas!
      </div>
      <div style="font-family: ${serif}; font-style: italic; font-size: 26px; color: ${sage}; padding-top: 10px;">Becky Friedman</div>
    </td></tr>
  </table>

  <!-- footer -->
  <table role="presentation" class="card" align="center" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 640px; margin: 0 auto;">
    <tr><td align="center" style="padding: 20px 30px 0;">
      <div style="font-family: ${sans}; font-size: 12px; color: #9b998e; line-height: 1.7;">
        Questions? Reach us at <a href="mailto:bridalshower@detroitbridalshower.org" style="color: #9b998e;">bridalshower@detroitbridalshower.org</a><br/>
        Detroit Bridal Shower &middot; Southfield, Michigan${unsubscribeURL ? `<br/><a href="${unsubscribeURL}" style="color: #9b998e; text-decoration: underline;">Unsubscribe</a>` : ''}
      </div>
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->

</td></tr>
</table>
</body>
</html>`
}


// Personalized, forwardable collection email for the couple's family:
// same design as the community email, without the collecting list or
// unsubscribe link.
function buildPersonalCollectionEmail(newCoupleString) {
  return buildCollectionEmail(newCoupleString, '', '')
}

// Couple-facing notice sent when mom verifies them.
function buildInstructionsEmail() {
  return buildActionEmail(
    'Great News',
    'Your Couple Has Been Verified!',
    'A collection email has been sent out to the community on your behalf. You will also receive a personal collection email — forward it to any friends and family who are not on our mailing list, so they can share in the simcha too.<br/><br/>Mazel tov! May we share in many more simchas!',
    null, null, null
  )
}

module.exports = { emailRows, buildActionEmail, buildCollectionEmail, buildPersonalCollectionEmail, buildInstructionsEmail }
