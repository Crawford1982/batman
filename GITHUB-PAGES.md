# batman1989.co.uk — GitHub Pages + Namecheap

Prepared locally; nothing has been pushed, deployed or changed in DNS.

The game builds to static files and needs no application server. GitHub Pages is suitable for the present free game. GitHub Free supports Pages from public repositories; use an appropriate paid plan if the repository must be private. The browser downloads the game assets in either case.

## Repository setup

1. Use the owner's chosen GitHub repository. This folder is not currently a Git repository; do not overwrite or assume an existing remote.
2. Commit the source, package.json, package-lock.json, index.html, public assets and .github/workflows/pages.yml. The ignore file excludes dependencies, generated builds and screenshot artifacts. Check the commit contents before pushing.
3. In repository Settings > Pages, select **GitHub Actions** as the publishing source.
4. Before pointing DNS at Pages, verify `batman1989.co.uk` in the GitHub account's Pages settings using the exact TXT record GitHub generates. Its value depends on the GitHub account and cannot be filled in yet.
5. Set repository Settings > Pages > Custom domain to `batman1989.co.uk`. Custom Actions deployments still require this repository setting; the included CNAME file alone does not configure the domain.
6. After release review, run **Publish game to GitHub Pages** from the Actions tab. The workflow installs the lockfile dependencies, runs unit tests, builds and publishes only `dist`. It does not publish automatically on each push. Browser playthrough tests remain a separate release gate.

## Namecheap DNS

For Namecheap BasicDNS/PremiumDNS/FreeDNS: Domain List > Manage > Advanced DNS. If the domain uses other authoritative nameservers, edit DNS with that provider instead.

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | YOUR_GITHUB_USERNAME.github.io |

Replace YOUR_GITHUB_USERNAME with the actual owner; do not include a repository name. Remove only conflicting parking/redirect/address records for the same web hosts after inspecting them. Preserve mail MX records and unrelated TXT/CNAME records. Do not use wildcard DNS. Keep the domain-verification TXT record.

Allow DNS to propagate, confirm the Pages DNS check passes, then enable **Enforce HTTPS** after the certificate is available. Test both `https://batman1989.co.uk` and `https://www.batman1989.co.uk`, including the redirect, model downloads, credits and both chapters. Namecheap documents a normal 30-minute update window; GitHub notes propagation can take up to 24 hours.

## Launch gates

See RELEASE-READINESS.md: replacement car fidelity, real-device performance, uninterrupted playthroughs and asset/franchise-rights review remain unresolved. Free distribution does not establish permission for Batman/DC branding or third-party vehicle designs. A small development-process/credits page is appropriate for a showcase, without implying official endorsement.

## Verified instructions

- GitHub custom domain: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- GitHub Actions Pages deployment: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Namecheap: https://www.namecheap.com/support/knowledgebase/article.aspx/9645/2208/how-do-i-link-my-domain-to-github-pages/

Prepared 7 September 2026. Recheck provider instructions when deploying.
