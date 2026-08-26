const Couples = require('../models/couplesList')
const Contribution = require('../models/contribution')
const Emails = require('../models/emailList')
const { buildContributorListEmail } = require('../mailTemplates')
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.API_KEY)

const MOM_EMAIL = 'bridalshower@detroitbridalshower.org'

// thank-you email sent (optionally) when mom verifies a gift
async function sendThankYou(to, name, coupleNamesList) {
  const couples = coupleNamesList.map(n =>
    `<div style="font-family: Georgia, serif; font-size:19px; color:#494e46; line-height:1.8;"><strong>${n}</strong></div>`).join('')
  const html = `
  <div style="background:#f4f1ea; padding:30px 12px; font-family: Arial, sans-serif;">
    <div style="max-width:520px; margin:0 auto; background:#fff; border:1px solid #e7e2d8; border-radius:14px; padding:34px 32px; text-align:center;">
      <img src="${(process.env.AZURE_URL || '').replace(/['"]/g, '')}/assets/images/bridalshowerpic.jpg" width="90" alt="Detroit Bridal Shower" style="display:block; margin:0 auto;">
      <div style="font-size:11px; letter-spacing:4px; text-transform:uppercase; color:#494e46; margin-top:14px;">Detroit Bridal Shower</div>
      <h2 style="font-family: Georgia, serif; font-style:italic; font-weight:normal; color:#b3925a; font-size:34px; margin:16px 0 6px;">Thank You!</h2>
      <div style="font-family: Georgia, serif; font-size:18px; color:#2e2e29; line-height:1.6; margin-top:8px;">
        ${name ? name + ', your' : 'Your'} gift toward the bridal shower${coupleNamesList.length > 1 ? 's' : ''} of
      </div>
      <div style="margin:14px 0;">${couples}</div>
      <div style="font-family: Georgia, serif; font-size:18px; color:#2e2e29; line-height:1.6;">
        has been received. May we share in many more simchas together!
      </div>
      <div style="width:54px; height:1px; background:#d9c9a6; margin:22px auto;"></div>
      <div style="font-family: Georgia, serif; font-style:italic; font-size:20px; color:#494e46;">Becky Friedman</div>
    </div>
  </div>`
  try {
    await sgMail.send({ to, from: MOM_EMAIL, subject: 'Thank you for your gift 💛', html })
  } catch (e) {
    console.error('thank-you email failed:', e.message)
  }
}

// simple per-IP rate limit: max 5 pledge submissions per hour
const pledgeLog = new Map()
function pledgeRateLimited(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown'
  const now = Date.now()
  const hits = (pledgeLog.get(ip) || []).filter(t => now - t < 60 * 60 * 1000)
  if (hits.length >= 5) return true
  hits.push(now)
  pledgeLog.set(ip, hits)
  return false
}

module.exports = {

  // ---------- public: gift pledge page ----------
  getGivePage: async (req, res) => {
    try {
      const couples = await Couples.find({ collecting: true })
        .select('chossonName kallahName').sort({ _id: -1 })
      res.render('give.ejs', { couples })
    } catch (err) {
      console.error(err)
      res.status(500).send('Something went wrong.')
    }
  },

  submitPledge: async (req, res) => {
    try {
      const { name, email, phone, selections, website, formToken } = req.body

      // spam protection (same approach as the add-couple form)
      if (website) return res.json({ status: true })
      const loadedAt = parseInt(formToken, 10)
      if (!loadedAt || Date.now() - loadedAt < 3000) return res.json({ status: true })
      if (pledgeRateLimited(req)) return res.status(429).json({ status: false, message: 'Too many submissions. Please try again later.' })

      if (!name || !String(name).trim()) return res.status(400).json({ status: false, message: 'Please enter your name.' })
      if (!email || !/^\S+@\S+\.\S+$/.test(String(email).trim())) return res.status(400).json({ status: false, message: 'Please enter a valid email address.' })
      if (!Array.isArray(selections) || !selections.length) return res.status(400).json({ status: false, message: 'Please select at least one couple.' })
      if (selections.length > 100) return res.status(400).json({ status: false, message: 'Too many selections.' })

      // validate selections against couples actually collecting
      const collecting = await Couples.find({ collecting: true }).select('chossonName kallahName')
      const byId = new Map(collecting.map(c => [String(c._id), c]))
      const clean = []
      for (const s of selections) {
        const c = byId.get(String(s.coupleId))
        if (!c) continue
        let amount = parseFloat(s.amount)
        if (!isFinite(amount) || amount <= 0) amount = 65
        amount = Math.round(amount * 100) / 100
        if (amount > 100000) amount = 100000
        clean.push({ couple: c, amount })
      }
      if (!clean.length) return res.status(400).json({ status: false, message: 'Please select at least one couple.' })

      const groupId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      await Contribution.insertMany(clean.map(x => ({
        coupleId: String(x.couple._id),
        coupleNames: x.couple.chossonName + ' & ' + x.couple.kallahName,
        contributorName: String(name).trim(),
        contributorEmail: String(email || '').trim(),
        contributorPhone: String(phone || '').trim(),
        amount: x.amount,
        verified: false,
        source: 'pledge',
        groupId
      })))

      // notify mom with the breakdown
      const total = clean.reduce((s, x) => s + x.amount, 0)
      const rows = clean.map(x => `
        <tr>
          <td style="padding:8px 14px; border-bottom:1px solid #eee7d9; font-family: Georgia, serif; font-size:16px; color:#2e2e29;">${x.couple.chossonName} &amp; ${x.couple.kallahName}</td>
          <td style="padding:8px 14px; border-bottom:1px solid #eee7d9; font-family: Georgia, serif; font-size:16px; color:#494e46; text-align:right;">$${x.amount.toFixed(2)}</td>
        </tr>`).join('')
      const html = `
      <div style="background:#f4f1ea; padding:30px 12px; font-family: Arial, sans-serif;">
        <div style="max-width:560px; margin:0 auto; background:#fff; border:1px solid #e7e2d8; border-radius:14px; padding:28px 30px;">
          <div style="font-size:12px; letter-spacing:4px; text-transform:uppercase; color:#b3925a; font-weight:bold;">New Gift Pledge</div>
          <h2 style="font-family: Georgia, serif; color:#494e46; margin:10px 0 4px;">${String(name).trim()}</h2>
          <div style="font-size:13px; color:#6d6d64;">${String(email || '').trim() || 'no email given'}${phone ? ' &middot; ' + String(phone).trim() : ''}</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px; border-collapse:collapse;">
            ${rows}
            <tr>
              <td style="padding:12px 14px; font-family: Georgia, serif; font-size:17px; color:#2e2e29;"><strong>Total pledged</strong></td>
              <td style="padding:12px 14px; font-family: Georgia, serif; font-size:17px; color:#b3925a; text-align:right;"><strong>$${total.toFixed(2)}</strong></td>
            </tr>
          </table>
          <div style="margin-top:16px; font-size:13px; color:#6d6d64; line-height:1.6;">
            They were shown your payment methods (Zelle / Venmo / PayPal / Check) after submitting.
            Once the money arrives, verify this pledge on the <a href="${(process.env.AZURE_URL || '').replace(/['"]/g, '')}/newAdmin/contributions" style="color:#b3925a;">Contributions dashboard</a> and their name will appear on the public contributors page.
          </div>
        </div>
      </div>`
      try {
        await sgMail.send({ to: MOM_EMAIL, from: MOM_EMAIL, subject: `Gift pledge from ${String(name).trim()} — $${total.toFixed(2)}`, html })
      } catch (e) {
        console.error('pledge notification email failed:', e.message)
      }

      return res.json({ status: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ status: false, message: 'Something went wrong. Please try again.' })
    }
  },

  // ---------- public: contributors page ----------
  getContributorsPage: async (req, res) => {
    try {
      const verified = await Contribution.find({ verified: true })
        .select('coupleId coupleNames contributorName').sort({ _id: -1 })
      // group names by couple; names only, never amounts
      const map = new Map()
      for (const c of verified) {
        if (!map.has(c.coupleId)) map.set(c.coupleId, { coupleId: c.coupleId, coupleNames: c.coupleNames, contributors: [], _seen: new Set() })
        const entry = map.get(c.coupleId)
        const key = String(c.contributorName || '').trim().toLowerCase()
        if (key && !entry._seen.has(key)) {          // never list the same name twice
          entry._seen.add(key)
          entry.contributors.push(c.contributorName)
        }
      }
      map.forEach(e => delete e._seen)
      res.render('contributors.ejs', { couples: [...map.values()] })
    } catch (err) {
      console.error(err)
      res.status(500).send('Something went wrong.')
    }
  },

  // ---------- admin (mounted behind adminAuth in routes/newAdmin.js) ----------
  adminContributionsPage: async (req, res) => {
    try {
      res.render('adminContributions.ejs')
    } catch (err) {
      console.error(err)
      res.status(500).send(err)
    }
  },

  getContributionsData: async (req, res) => {
    try {
      const contributions = await Contribution.find().sort({ _id: -1 })
      // ALL couples so mom can record gifts for past showers too
      const couples = await Couples.find().select('chossonName kallahName collecting').sort({ _id: -1 })
      res.json({ contributions, couples })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Could not load data' })
    }
  },

  // Record one person's gift to one OR MANY couples in a single entry.
  // Accepts selections: [{coupleId, amount}], or legacy coupleId + amount.
  // Any couple in the database is allowed here (admin-only) so past showers
  // can be backfilled - the public /give page stays limited to collecting.
  addContribution: async (req, res) => {
    try {
      const { contributorName, contributorEmail, sendThanks } = req.body
      const name = String(contributorName || '').trim()
      if (!name) return res.status(400).json({ status: false, message: 'Contributor name is required.' })

      let selections = Array.isArray(req.body.selections) ? req.body.selections : null
      if (!selections) {
        if (!req.body.coupleId) return res.status(400).json({ status: false, message: 'Select at least one couple.' })
        selections = [{ coupleId: req.body.coupleId, amount: req.body.amount }]
      }
      if (!selections.length) return res.status(400).json({ status: false, message: 'Select at least one couple.' })
      if (selections.length > 200) return res.status(400).json({ status: false, message: 'Too many couples in one entry.' })

      const email = String(contributorEmail || '').trim()
      const groupId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const docs = []
      const skipped = []
      for (const s of selections) {
        const couple = await Couples.findById(s.coupleId).select('chossonName kallahName')
        if (!couple) continue
        // hard duplicate guard: same person (by email when present, else by
        // name) may only be recorded once per couple
        const identity = email
          ? { contributorEmail: new RegExp('^' + escRe(email) + '$', 'i') }
          : { contributorName: new RegExp('^' + escRe(name) + '$', 'i') }
        const dup = await Contribution.findOne({ coupleId: String(couple._id), ...identity })
        if (dup) {
          skipped.push(couple.chossonName + ' & ' + couple.kallahName)
          continue
        }
        let amt = parseFloat(s.amount)
        if (!isFinite(amt) || amt <= 0) amt = 65
        docs.push({
          coupleId: String(couple._id),
          coupleNames: couple.chossonName + ' & ' + couple.kallahName,
          contributorName: name,
          contributorEmail: email,
          amount: Math.round(amt * 100) / 100,
          verified: true,          // mom entering it = already confirmed
          source: 'manual',
          groupId
        })
      }
      if (!docs.length) {
        return res.status(409).json({
          status: false,
          skipped,
          message: skipped.length
            ? 'Already recorded for ' + skipped.join(', ') + ' — nothing was added.'
            : 'No matching couples found.'
        })
      }

      const created = await Contribution.insertMany(docs)
      // one combined thank-you covering every couple in this entry
      if (sendThanks && /^\S+@\S+\.\S+$/.test(email)) {
        await sendThankYou(email, name, docs.map(d => d.coupleNames))
      }
      res.json({ status: true, count: created.length, skipped, contributions: created, contribution: created[0] })
    } catch (err) {
      console.error(err)
      res.status(500).json({ status: false, message: 'Could not add contributor.' })
    }
  },

  verifyContribution: async (req, res) => {
    try {
      const c = await Contribution.findById(req.body.id)
      if (!c) return res.status(404).json({ status: false })
      const amt = parseFloat(req.body.amount)
      if (isFinite(amt) && amt > 0) c.amount = Math.round(amt * 100) / 100
      c.verified = !c.verified
      await c.save()
      if (c.verified && req.body.sendThanks && c.contributorEmail) {
        await sendThankYou(c.contributorEmail, c.contributorName, [c.coupleNames])
      }
      res.json({ status: true, verified: c.verified })
    } catch (err) {
      console.error(err)
      res.status(500).json({ status: false })
    }
  },

  // verify a whole pledge submission at once; one combined thank-you email
  verifyGroup: async (req, res) => {
    try {
      const ids = Array.isArray(req.body.ids) ? req.body.ids : []
      const amounts = req.body.amounts || {}
      const couplesVerified = []
      let email = '', name = ''
      for (const id of ids) {
        const c = await Contribution.findById(id)
        if (!c) continue
        const amt = parseFloat(amounts[id])
        if (isFinite(amt) && amt > 0) c.amount = Math.round(amt * 100) / 100
        c.verified = true
        await c.save()
        couplesVerified.push(c.coupleNames)
        email = c.contributorEmail || email
        name = c.contributorName || name
      }
      if (req.body.sendThanks && email && couplesVerified.length) {
        await sendThankYou(email, name, couplesVerified)
      }
      res.json({ status: true, count: couplesVerified.length })
    } catch (err) {
      console.error(err)
      res.status(500).json({ status: false })
    }
  },

  // CSV export of contributions - all, or one couple via ?coupleId=
  exportContributions: async (req, res) => {
    try {
      const filter = req.query.coupleId ? { coupleId: String(req.query.coupleId) } : {}
      const all = await Contribution.find(filter).sort({ _id: -1 })
      const csvCell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
      const lines = ['Date,Contributor,Email,Phone,Couple,Amount,Status,Source']
      for (const c of all) {
        const date = new Date(parseInt(String(c._id).substring(0, 8), 16) * 1000).toLocaleDateString('en-US')
        lines.push([date, c.contributorName, c.contributorEmail, c.contributorPhone, c.coupleNames,
          (c.amount || 0).toFixed(2), c.verified ? 'Verified' : 'Pending', c.source].map(csvCell).join(','))
      }
      const fname = all.length && req.query.coupleId
        ? 'contributors - ' + String(all[0].coupleNames || 'couple').replace(/[^\w &-]/g, '') + '.csv'
        : 'contributions.csv'
      res.set('Content-Type', 'text/csv')
      res.set('Content-Disposition', 'attachment; filename="' + fname + '"')
      res.send('﻿' + lines.join('\r\n'))
    } catch (err) {
      console.error(err)
      res.status(500).send('Export failed')
    }
  },

  // Email the finished contributor list for one couple (names only, never
  // amounts) - mom sends this to the couple along with the check.
  sendContributorList: async (req, res) => {
    try {
      const { coupleId, to, preview } = req.body
      const couple = await Couples.findById(coupleId).select('chossonName kallahName')
      if (!couple) return res.status(404).json({ status: false, message: 'Couple not found.' })

      // NOTE: Cosmos DB refuses to sort on non-indexed fields, so sort in JS
      const rows = await Contribution.find({ coupleId: String(coupleId), verified: true })
        .select('contributorName')
      // unique names, alphabetical, no amounts anywhere
      const names = [...new Set(rows.map(r => String(r.contributorName || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
      if (!names.length) return res.status(400).json({ status: false, message: 'No verified contributors for this couple yet.' })

      const coupleNames = couple.chossonName + ' & ' + couple.kallahName
      const html = buildContributorListEmail(coupleNames, names)

      if (preview) {
        res.set('Content-Type', 'text/html')
        return res.send(html)
      }

      const dest = String(to || '').trim()
      if (!/^\S+@\S+\.\S+$/.test(dest)) return res.status(400).json({ status: false, message: 'Please enter a valid email address.' })

      await sgMail.send({
        to: dest,
        from: MOM_EMAIL,
        subject: 'With gratitude — your bridal shower contributors',
        html
      })
      res.json({ status: true, count: names.length, to: dest })
    } catch (err) {
      console.error(err)
      res.status(500).json({ status: false, message: 'Could not send the list.' })
    }
  },

  // ---------- mailing list management (admin) ----------
  getSubscribers: async (req, res) => {
    try {
      const rows = await Emails.find().select('email').sort({ _id: -1 })
      res.json({ subscribers: rows.map(r => ({ _id: r._id, email: r.email })) })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Could not load subscribers' })
    }
  },

  addSubscriber: async (req, res) => {
    try {
      const email = String(req.body.email || '').trim()
      if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ status: false, message: 'Please enter a valid email address.' })
      const pattern = new RegExp('^\\s*' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i')
      const existing = await Emails.findOne({ email: pattern })
      if (existing) return res.status(409).json({ status: false, message: 'That email is already on the list.' })
      const doc = await Emails.create({ email })
      res.json({ status: true, subscriber: doc })
    } catch (err) {
      console.error(err)
      res.status(500).json({ status: false, message: 'Could not add subscriber.' })
    }
  },

  removeSubscriber: async (req, res) => {
    try {
      // remove by id, but also sweep any duplicate rows of the same address
      const doc = await Emails.findById(req.body.id)
      if (!doc) return res.status(404).json({ status: false, message: 'Not found.' })
      const pattern = new RegExp('^\\s*' + String(doc.email).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i')
      const r = await Emails.deleteMany({ email: pattern })
      res.json({ status: true, removed: r.deletedCount, email: doc.email })
    } catch (err) {
      console.error(err)
      res.status(500).json({ status: false, message: 'Could not remove subscriber.' })
    }
  },

  exportSubscribers: async (req, res) => {
    try {
      // NOTE: Cosmos DB refuses to sort on non-indexed fields, so sort in JS
      const rows = await Emails.find().select('email')
      rows.sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')))
      const lines = ['Email']
      rows.forEach(r => lines.push('"' + String(r.email || '').replace(/"/g, '""') + '"'))
      res.set('Content-Type', 'text/csv')
      res.set('Content-Disposition', 'attachment; filename="mailing-list.csv"')
      res.send('﻿' + lines.join('\r\n'))
    } catch (err) {
      console.error(err)
      res.status(500).send('Export failed')
    }
  },

  // public: look up all couples a contributor gave to, by their email
  lookupContributor: async (req, res) => {
    try {
      const email = String(req.body.email || '').trim()
      if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ status: false, message: 'Please enter a valid email address.' })
      if (pledgeRateLimited(req)) return res.status(429).json({ status: false, message: 'Too many lookups — please try again later.' })
      const found = await Contribution.find({
        verified: true,
        contributorEmail: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
      }).select('coupleNames').sort({ _id: -1 })
      const couples = [...new Set(found.map(c => c.coupleNames))]
      res.json({ status: true, couples })
    } catch (err) {
      console.error(err)
      res.status(500).json({ status: false, message: 'Something went wrong.' })
    }
  },

  deleteContribution: async (req, res) => {
    try {
      await Contribution.deleteOne({ _id: req.body.id })
      res.json({ status: true })
    } catch (err) {
      console.error(err)
      res.status(500).json({ status: false })
    }
  }
}
