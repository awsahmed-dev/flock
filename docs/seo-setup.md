# Getting Paxawa into Google Search

The code side is done. To actually appear in Google results, two things have to happen — both require manual action **you** (the domain owner) need to take, because they prove to Google you own paxawa.com.

Total time: ~10 minutes for both. Indexing then takes Google anywhere from a few days to a few weeks to start surfacing the pages.

---

## 1. Google Search Console (the important one)

This is what tells Google "look at my sitemap, crawl my pages, here are the search analytics."

### Step 1 — Add the property

1. Open https://search.google.com/search-console
2. Sign in with the Google account you want to manage this site from.
3. Click **Add property** → pick the **URL prefix** type → enter `https://paxawa.com`
4. Google will show you a verification page with multiple options. Pick **HTML tag**.
5. It looks like: `<meta name="google-site-verification" content="ABC123XYZ..." />`
6. Copy the value of `content="..."` — that string is your verification code.

### Step 2 — Paste it into Vercel env vars

1. Open https://vercel.com/aws-projects-a7d3a8cc/flock/settings/environment-variables
2. Add a new **Production** env var:
   - Key: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
   - Value: the code from step 1 (without quotes, just the characters)
3. Save.
4. Trigger a redeploy: either push a new commit, or in the Vercel dashboard
   open the latest deployment → **⋯** → **Redeploy**.

### Step 3 — Confirm

1. Back in Search Console, click **Verify**.
2. Google fetches paxawa.com, sees the meta tag, marks the property as verified.

### Step 4 — Submit the sitemap

1. In Search Console, left nav → **Sitemaps**.
2. Enter `sitemap.xml` and **Submit**.
3. Google now knows about every page in `src/app/sitemap.ts` and will start
   crawling. The sitemap auto-includes every blog post listed in
   `src/lib/blog/posts.ts` — add a post, the sitemap picks it up on the
   next deploy.

### Step 5 — Request indexing on the big pages (optional, speeds things up)

For the homepage and each blog post:
1. Search Console → **URL Inspection** (top bar).
2. Paste the URL, press enter.
3. Click **Request indexing**.

Google rate-limits this to ~10/day. Do the homepage + 3 blog posts first.

---

## 2. Bing Webmaster Tools (worth 10 min for the Bing + ChatGPT + Copilot traffic)

Same flow, different provider.

1. https://www.bing.com/webmasters → **Add a site** → enter `https://paxawa.com`
2. Verify with the meta tag method. Copy the value out of `content="..."`.
3. Vercel env vars → add `NEXT_PUBLIC_BING_SITE_VERIFICATION` = the code.
4. Redeploy.
5. Bing → **Verify**.
6. Sitemaps section → submit `https://paxawa.com/sitemap.xml`.

(There's an even faster path: in Bing Webmaster, you can **import from Google Search Console** in one click. Skips steps 1-5.)

---

## What's already done in code

Verify it after deploy with:

```bash
# These all return 200 (proxy was 307-ing them; fixed)
curl -sI https://paxawa.com/sitemap.xml
curl -sI https://paxawa.com/robots.txt
curl -sI https://paxawa.com/blog
curl -sI https://paxawa.com/blog/how-to-plan-a-group-trip

# OG image renders dynamically
curl -s https://paxawa.com/ | grep og:image
```

In place:
- `metadataBase` so every absolute URL Google sees is correct
- Title template `%s · Paxawa` on every page
- Twitter card + OG block with auto-generated 1200×630 image
- JSON-LD on landing: Organization, WebSite (with SearchAction for sitelinks
  search box), SoftwareApplication
- JSON-LD on each blog post: BlogPosting + BreadcrumbList
- hreflang for en + ar + x-default
- robots directives: index, follow, googleBot max-image-preview large
- Sitemap auto-built from `src/lib/blog/posts.ts`
- Canonical URLs on every page

---

## When to expect results

- **Verification** confirmed: minutes after redeploy.
- **First crawl** of the sitemap: usually within 48 hours of submission.
- **Pages start appearing in `site:paxawa.com` search**: 3-10 days.
- **Brand-name queries** ("paxawa") ranking: 1-2 weeks if no name conflicts.
- **Long-tail queries** (e.g. "how to split expenses with friends on
  vacation") ranking: 2-3 months. Blog content takes time to build trust.

The single biggest accelerator after the steps above is **getting one
external backlink** to paxawa.com from a real site. Could be a Product Hunt
launch, a tweet from a reasonably-followed account, a guest post somewhere
travel-related. One real backlink and Google's interest jumps a level.

---

## Health-check checklist (do this monthly)

- Search Console → Coverage: should show pages as **Indexed**, not
  **Discovered, currently not indexed**.
- Search Console → Sitemaps: shows submitted + last read date.
- Search Console → Core Web Vitals: should be all green. Mostly LCP and
  CLS matter; we already keep both low.
- `site:paxawa.com` in Google: confirms what's actually indexed.
- Rich Results Test (https://search.google.com/test/rich-results) on the
  homepage + a blog post: confirms our JSON-LD is parsing cleanly.
