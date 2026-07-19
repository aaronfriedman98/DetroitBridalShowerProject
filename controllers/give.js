const Couples = require('../models/couplesList')
const Contribution = require('../models/contribution')
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.API_KEY)

const MOM_EMAIL = 'bridalshower@detroitbridalshower.org'

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
        if (!map.has(c.coupleId)) map.set(c.coupleId, { coupleId: c.coupleId, coupleNames: c.coupleNames, contributors: [] })
        map.get(c.coupleId).contributors.push(c.contributorName)
      }
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
      const couples = await Couples.find({ collecting: true }).select('chossonName kallahName').sort({ _id: -1 })
      res.json({ contributions, couples })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Could not load data' })
    }
  },

  addContribution: async (req, res) => {
    try {
      const { coupleId, contributorName, amount } = req.body
      if (!coupleId || !contributorName || !String(contributorName).trim()) {
        return res.status(400).json({ status: false, message: 'Couple and name are required.' })
      }
      const couple = await Couples.findById(coupleId).select('chossonName kallahName')
      if (!couple) return res.status(404).json({ status: false, message: 'Couple not found.' })
      let amt = parseFloat(amount)
      if (!isFinite(amt) || amt <= 0) amt = 65
      const doc = await Contribution.create({
        coupleId: String(couple._id),
        coupleNames: couple.chossonName + ' & ' + couple.kallahName,
        contributorName: String(contributorName).trim(),
        amount: Math.round(amt * 100) / 100,
        verified: true,          // mom entering it = already confirmed
        source: 'manual'
      })
      res.json({ status: true, contribution: doc })
    } catch (err) {
      console.error(err)
      res.status(500).json({ status: false, message: 'Could not add contributor.' })
    }
  },

  verifyContribution: async (req, res) => {
    try {
      const c = await Contribution.findById(req.body.id)
      if (!c) return res.status(404).json({ status: false })
      c.verified = !c.verified
      await c.save()
      res.json({ status: true, verified: c.verified })
    } catch (err) {
      console.error(err)
      res.status(500).json({ status: false })
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
