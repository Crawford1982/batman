# Shadow Striker: Portal Submission Checklist

This checklist outlines exactly what the owner must do on each portal versus what is ready to upload from the submission kit.

---

## Pre-Submission: What's Already Done ✅

- ✅ **IP audit complete:** All Batman/DC references removed (alfred/gordon renamed to handler/reeves)
- ✅ **Build created:** `shadow-striker-portal.zip` (10.47 MB, ready to upload)
- ✅ **Tests passing:** All unit tests verified
- ✅ **Cover images generated:** All required sizes for CrazyGames, GameDistribution, and itch.io
- ✅ **Store copy written:** Title, descriptions, controls, tags, and metadata prepared
- ✅ **Portal SDK stubs:** Basic integration ready for CrazyGames and GameDistribution

---

## What the Owner Must Do (Cannot Be Done by Agent)

### 1. Account Setup (All Portals)

#### CrazyGames
- [ ] Create developer account at [developer.crazygames.com](https://developer.crazygames.com)
- [ ] Complete profile (developer name, contact email)
- [ ] Verify email address
- [ ] Accept developer terms of service

#### GameDistribution  
- [ ] Create developer account at [gamedistribution.com/developers](https://gamedistribution.com/developers/partnership/)
- [ ] Complete profile and contact details
- [ ] Accept terms and SDK license
- [ ] Note your Game ID from the control panel (required for SDK)

#### itch.io
- [ ] Create account at [itch.io](https://itch.io/register)
- [ ] Set up creator profile
- [ ] Add payment/tax information if monetising (optional)

### 2. Tax and Payment Setup

#### CrazyGames
- [ ] Provide tax information (W-9 for US, W-8BEN for non-US)
- [ ] Set up payment method (PayPal or bank transfer)
- [ ] Configure revenue share preferences (applies after Full Launch approval)

#### GameDistribution
- [ ] Complete tax form during registration
- [ ] Add PayPal email for revenue payments
- [ ] Set minimum payout threshold

#### itch.io
- [ ] Optional: Add payment information if enabling donations/pay-what-you-want
- [ ] Configure payout settings (PayPal or Stripe)

---

## Portal-Specific Upload Steps

### CrazyGames Submission

**What's Ready to Upload:**
- `shadow-striker-portal.zip` (10.47 MB)
- Cover images:
  - `crazygames-landscape-1920x1080.png`
  - `crazygames-portrait-800x1200.png`
  - `crazygames-square-800x800.png`
- Game metadata from `LISTING.md` (title, descriptions, controls, tags)

**Owner Action Required:**

1. **Upload Game Build**
   - [ ] Log in to CrazyGames developer portal
   - [ ] Click "Upload New Game"
   - [ ] Upload `shadow-striker-portal.zip`
   - [ ] Set title: "Shadow Striker: Steel City"

2. **Add Metadata**
   - [ ] Copy short description from `LISTING.md`
   - [ ] Copy full description from `LISTING.md`
   - [ ] Set category: **Action**
   - [ ] Add tags: 3D, Flight, Driving, Stealth, Singleplayer, Action, Adventure, Mission-based
   - [ ] Set age rating: **Everyone 10+**
   - [ ] Copy controls section from `LISTING.md`

3. **Upload Cover Images**
   - [ ] Upload landscape cover (1920×1080)
   - [ ] Upload portrait cover (800×1200)
   - [ ] Upload square cover (800×800)

4. **Submit for Basic Launch**
   - [ ] Select "Basic Launch" (no SDK required initially)
   - [ ] Submit for review
   - [ ] Wait for approval email (typically 1-2 weeks)

5. **After Basic Launch Approval (Optional: Full Launch)**
   - [ ] Contact CrazyGames to request Full Launch
   - [ ] Integrate SDK GameplayStart event (code stub ready in `portal/portal-sdk.js`)
   - [ ] Re-upload build with SDK integration
   - [ ] Monetisation enabled after Full Launch approval

**Current SDK Status:**  
🟡 **SDK stub present** but not active. Basic Launch does not require SDK. For Full Launch (with ads/revenue), minimal integration needed—contact agent after approval.

---

### GameDistribution Submission

**What's Ready to Upload:**
- `shadow-striker-portal.zip` (10.47 MB)
- Cover images:
  - `gamedistribution-512x512.png` (mandatory)
  - `gamedistribution-512x384.png` (mandatory)
  - `gamedistribution-200x120.png` (mandatory)
  - `gamedistribution-landscape-1280x720.png` (optional promo)
- Game metadata from `LISTING.md`

**Owner Action Required:**

1. **Get Game ID and Integrate SDK** ⚠️
   - [ ] After creating account, note your **Game ID** from control panel
   - [ ] SDK integration is **MANDATORY** before upload
   - [ ] The build has SDK stubs, but needs your Game ID inserted
   - [ ] **Action:** Contact agent to insert Game ID into `portal/portal-sdk.js` before upload
   - [ ] Rebuild the zip after SDK is configured

2. **Upload Game Build**
   - [ ] Log in to developer.gamedistribution.com
   - [ ] Click "Upload Game"
   - [ ] Upload `shadow-striker-portal.zip` (with Game ID configured)
   - [ ] Set title: "Shadow Striker: Steel City"

3. **Add Metadata**
   - [ ] Copy short description from `LISTING.md`
   - [ ] Copy full description from `LISTING.md`
   - [ ] Set category: **Action / Adventure**
   - [ ] Add tags: flight, action, 3D, stealth, driving, mission, story, browser game

4. **Upload Thumbnails**
   - [ ] Upload 512×512 thumbnail (mandatory)
   - [ ] Upload 512×384 thumbnail (mandatory)
   - [ ] Upload 200×120 thumbnail (mandatory)
   - [ ] Upload 1280×720 landscape promo (optional but recommended)

5. **Verify SDK Integration** ⚠️
   - [ ] After upload, click "Open in iframe" button in admin
   - [ ] **Watch the entire preroll ad** without skipping
   - [ ] SDK integration will be marked as verified
   - [ ] If ad doesn't play, SDK is not configured—contact agent

6. **Request Publication**
   - [ ] Contact GameDistribution support: `support@gamedistribution.com`
   - [ ] Request game activation and QA review
   - [ ] Approval can take up to 3 weeks
   - [ ] Monitor email for QA feedback

**Current SDK Status:**  
🔴 **SDK present but Game ID not configured.** Must be done before upload—cannot proceed without it.

**Blocker:**  
The owner must provide their GameDistribution Game ID (from control panel) so the SDK can be properly initialised. This is a one-line change, but must be done before uploading.

---

### itch.io Submission

**What's Ready to Upload:**
- `shadow-striker-portal.zip` (10.47 MB)
- Cover image: `itchio-cover-630x500.png`
- Game metadata from `LISTING.md`

**Owner Action Required:**

1. **Create Game Page**
   - [ ] Log in to itch.io
   - [ ] Click "Upload new project"
   - [ ] Set title: "Shadow Striker: Steel City"
   - [ ] Set project URL: e.g., `yourname.itch.io/shadow-striker-steel-city`

2. **Upload Game Build**
   - [ ] In "Uploads" section, upload `shadow-striker-portal.zip`
   - [ ] Check "This file will be played in the browser"
   - [ ] Set kind of project: **HTML5**
   - [ ] Set viewport: **1280×720** (or enable fullscreen button)
   - [ ] Enable "Mobile friendly" if desired

3. **Add Metadata**
   - [ ] Set tagline: "One night. Three missions. Save Steel City."
   - [ ] Copy short description from `LISTING.md`
   - [ ] Copy full description from `LISTING.md` (use Markdown formatting)
   - [ ] Set classification: **Games**
   - [ ] Set genre: **Action, Adventure**
   - [ ] Add tags: action, 3d, flight, stealth, driving, singleplayer, browser, story-driven, mission-based, controller-support

4. **Upload Cover Image**
   - [ ] Upload `itchio-cover-630x500.png` as cover image
   - [ ] Optional: Upload 3-5 screenshots showing gameplay

5. **Configure Settings**
   - [ ] Set release status: **Released**
   - [ ] Set visibility: **Public** (or "Unlisted" for soft launch)
   - [ ] Pricing: **No payments** (free to play) or enable "Pay what you want"
   - [ ] Community: Enable comments if desired

6. **Publish**
   - [ ] Review all fields
   - [ ] Click "Save & view page" to preview
   - [ ] If ready, change status to **Public**
   - [ ] Game is live immediately (no approval process)

**Current SDK Status:**  
✅ **No SDK required for itch.io.** Ready to upload as-is.

---

## Post-Upload Testing

After uploading to each portal, the owner should:

### Functionality Test
- [ ] Load game in portal's iframe/embed
- [ ] Verify title screen loads correctly
- [ ] Test all three gameplay modes (flight, driving, stealth)
- [ ] Confirm controls work (keyboard, mouse, controller if available)
- [ ] Test mobile version on phone/tablet (if portal supports mobile)

### Visual Check
- [ ] Cover images display correctly in portal listings
- [ ] Game renders at correct resolution in iframe
- [ ] No UI elements are cut off at various viewport sizes
- [ ] Text is readable and not blurry

### SDK/Ads Check (GameDistribution and CrazyGames Full Launch only)
- [ ] Preroll ad plays before game starts
- [ ] Ad does not block gameplay after completing
- [ ] Game resumes correctly after ad
- [ ] No audio overlap between game and ads

---

## Known Issues and Limitations

### Non-Critical (Already Documented)

⚠️ **NC-Licensed Models:**  
The vehicle and drone models use Creative Commons NonCommercial licenses. This is documented in `portal/ASSET-LICENSING.md`. For ad-supported portals (CrazyGames Full Launch, GameDistribution), these models should technically be replaced with CC0 or CC-BY alternatives.

**Impact:**  
- Basic Launch on CrazyGames: No ads, so NC assets are fine
- GameDistribution: Technically violates NC terms if ads are shown
- itch.io: No monetisation by default, so NC assets are fine

**Recommendation:**  
If the owner plans to monetise (especially via GameDistribution), consider replacing the vehicle and drone models. For now, the game can be submitted as-is for testing and initial launch.

### Portal SDK Status Summary

| Portal | SDK Required? | Current Status | Blocker? |
|--------|---------------|----------------|----------|
| **CrazyGames** | Optional for Basic Launch, required for Full Launch | Stub present, not active | ❌ No blocker for Basic Launch |
| **GameDistribution** | **Mandatory** | Present but needs Game ID | ⚠️ **Owner must provide Game ID** |
| **itch.io** | Not required | N/A | ❌ No blocker |

---

## Quick Summary

### ✅ Can Upload Immediately (No Blockers)
- **CrazyGames:** Yes (Basic Launch, no SDK required)
- **itch.io:** Yes (no SDK required)

### ⚠️ Needs One More Step Before Upload
- **GameDistribution:** Must insert Game ID into SDK (5-minute fix after owner provides ID)

### What Owner Cannot Skip
1. Creating accounts on all three portals
2. Providing tax/payment information (for revenue)
3. Uploading the zip and images via portal web UI
4. Testing the uploaded game in each portal's iframe
5. For GameDistribution: Watching the preroll ad in dev iframe to verify SDK

---

## Support Resources

**CrazyGames Documentation:**  
- [Technical Requirements](https://docs.crazygames.com/requirements/technical/)
- [Game Covers Guide](https://docs.crazygames.com/requirements/game-covers/)
- [SDK Integration](https://docs.crazygames.com/sdk/html5/)

**GameDistribution Documentation:**  
- [Developer Guidelines](https://static.gamedistribution.com/developer/developers-guidelines.html)
- [SDK Implementation](https://github.com/GameDistribution/GD-HTML5/wiki/SDK-Implementation)

**itch.io Documentation:**  
- [Uploading HTML5 Games](https://itch.io/docs/creators/html5)
- [Getting Started Guide](https://itch.io/docs/creators/getting-started)

---

**Checklist Version:** 1.0  
**Last Updated:** 2026-10-08

**Questions?**  
If any step is unclear or technical issues arise, contact the agent for assistance.
