# Indian Waste Portal — Team Guide (Start to End)

A plain-language walkthrough of the whole business and product — so you can brief the
team (consultants, sales, support, developers) on **what we do, how it works, and who does
what.** (Developers: the deep technical doc is `PROJECT-GUIDE.md`.)

---

## 1. What we do — in one line
We help Indian businesses complete their **mandatory government waste registration**: they
give us their details and pay us, and **we do the paperwork on the government portal for
them** and hand them their official acknowledgement.

## 2. Why now — the opportunity
- India's **Solid Waste Management (SWM) Rules 2026** are **in force**.
- Any business that qualifies as a **Bulk Waste Generator (BWG)** **must register** on the
  government **CPCB SWM portal** (swm.cpcb.gov.in).
- A business is a **BWG if it meets ANY one** of:
  - ≥ **20,000 sq.m** built-up area, **or**
  - ≥ **100 kg/day** waste, **or**
  - ≥ **40,000 L/day** water use.
- The government portal is multi-step, English-only, and needs an OTP, a captcha, and exact
  "LGD" address data. Most businesses don't want to deal with it.
- Non-compliance can attract **Environmental Compensation** (penalties).
- **→ We are the "done-for-you" service.**

## 3. Who our customers are
BWGs: **hotels, hospitals, malls, industries, institutions** (schools/colleges/universities),
**large residential societies (RWAs)**, markets, stadiums, etc.

## 4. What the customer experiences (their journey)
1. Lands on our website — available in **English · हिंदी · ગુજરાતી**.
2. Realises they may be liable and checks eligibility.
3. Fills a short registration: **org details → category + waste numbers → address**.
4. We send them an **invoice**; they pay online.
5. Our consultant **files their registration on CPCB**.
6. CPCB texts them an **OTP** — they type it on their own tracking page (they never read it
   to us).
7. We record their official **ACK number**; they see it on their status page and can
   download a filing acknowledgement.

## 5. How we actually deliver it (operations — most important for the team)
We use a **manual, consultant-assisted model** — the safest, most reliable way to start.
Everything below happens in the **Admin Console** (`/admin`):

1. Customer registers → their details appear in the **Admin Console**.
2. Admin reviews → clicks **Send Invoice** (amount comes from our price book).
3. Customer pays → status becomes **Paid**.
4. Consultant opens the **real CPCB portal** and fills the 5-step form using the customer's
   data — all visible in the console (org, category, floor area / waste / water, full
   LGD address, coordinates).
5. CPCB texts an **OTP** to the customer's phone. Consultant clicks **"Request OTP from
   client"** → the customer enters it on **their own** tracking page → it appears **live** in
   the console → consultant types it into CPCB.
   **We never ask the customer to read the OTP aloud — they enter it themselves.**
6. Consultant finishes, gets the **ACK number**, and clicks **Record ACK & Complete**.
7. Customer's status flips to **Completed** with their ACK.

> Later we can switch on an **automated "robot"** (software that fills CPCB by itself). It's
> already built but **off by default** — we start manual and automate when volume grows.

## 6. Team roles
| Role | What they do | Where |
|---|---|---|
| **Consultant / Filing operator** | Reviews submissions, files on CPCB, handles the OTP relay, records the ACK | Admin Console |
| **Sales / Growth** | Brings in BWG customers, explains the service | — |
| **Support** | Answers questions, guides customers through the tracking page | — |
| **Developer** | Maintains the site, deploys, adds features | Code + `PROJECT-GUIDE.md` |
| **You (Lead)** | Sets prices (price book), oversees compliance/legal, strategy | Admin Console |

## 7. The technology (plain terms — for context)
- **Website + forms** — a modern web app (Next.js/React): fast, mobile-friendly, 3 languages.
- **Database** — stores every registration, payment, and status.
- **Admin Console** (`/admin`) — where the team runs everything.
- **Payments** — **Razorpay** (Indian gateway).
- **Messaging** — **WhatsApp/SMS (MSG91)** + **email (Resend)** to notify customers.
- **Address intelligence** — a built-in pincode database gives real
  State → District → Sub-district → Village dropdowns (matches the government's LGD system).
- **The robot (optional)** — browser automation that can file on CPCB automatically; runs on
  a small server, off by default.

## 8. How we make money
- A **one-time fee per registration**, priced by **establishment type × location** (a big
  hospital pays more than a small one).
- Prices live in an **admin price book** — you control them, shown **only on the invoice**
  (not public).
- Future: recurring services (annual returns, **E-Waste**) as new paid services under the
  same customer account.

## 9. Current status
✅ **Built & working (locally):** full 3-language website, registration, client accounts,
admin console, invoicing, the **manual filing workflow** (OTP relay + Record ACK), pincode
address picker, E-Waste waitlist, honest marketing copy, optimised images. **All code is on
GitHub.**

⏳ **Pending to go live:**
- Deploy to production (**Cloudflare + database**).
- **Razorpay live keys** (take real payments).
- **WhatsApp/email keys** (so customers actually receive messages).
- **Domain** + a **lawyer's review** of the legal pages and claims.
- **Business identity** (company / GST) in the footer.

## 10. Roadmap
1. **Phase 1 — Go live:** deploy → payments → notifications → domain → legal. *Take the first
   paying customer.*
2. **Phase 2 — Trust & growth:** SEO, real testimonials, business identity.
3. **Phase 3 — Scale:** switch on the automation robot; launch **E-Waste**.

## 11. Rules every team member must follow (say these correctly)
- ✅ We are an **independent consultant — NOT a government body, NOT CPCB.** Never imply otherwise.
- ✅ The **official record is the CPCB ACK number** (verifiable on swm.cpcb.gov.in). What we
  issue is a **"filing acknowledgement," not a government certificate.**
- ✅ **OTP:** the customer enters their **own** OTP on their **own** screen — never read it aloud.
- ✅ **Honesty:** no fake stats, no invented numbers, no exaggerated penalties. In compliance,
  trust is everything.
- ✅ **Accuracy:** what we file must match what the customer gave us — filing false information
  is a legal offence (the customer declares this before we file).

## 12. Glossary (so we all speak the same language)
| Term | Meaning |
|---|---|
| **SWM 2026** | Solid Waste Management Rules 2026 (the law) |
| **CPCB** | Central Pollution Control Board (runs the government portal) |
| **BWG** | Bulk Waste Generator (our customer — a business that must register) |
| **ACK** | Acknowledgement number (official proof the filing was submitted) |
| **LGD** | Local Government Directory (official State/District/Sub-district system) |
| **ULB / RLB** | Urban / Rural Local Body |
| **EC** | Environmental Compensation (penalty for non-compliance) |
| **EPR / E-Waste** | Future service — Extended Producer Responsibility for electronic waste |
