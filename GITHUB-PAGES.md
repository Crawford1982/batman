# batman1989.co.uk — deployment

Deployed 7 September 2026 from https://github.com/Crawford1982/batman using the manual GitHub Actions Pages workflow. Commit 5472c9d passed the remote test/build/deploy workflow.

## Domain configuration

Namecheap BasicDNS records saved and read back:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | Crawford1982.github.io |

The previous parking CNAME and apex URL redirect were replaced. Email forwarding and its SPF record were preserved. GitHub Pages custom domain is batman1989.co.uk; publishing source is GitHub Actions.

## Verification and remaining hosting step

The actual public HTTP domain loaded both the Batwing and replacement Batmobile in Edge headless, with four wheel assemblies and no page or asset errors. All 15 unit checks and local ground/road browser regressions passed.

GitHub's certificate was not yet issued at the last check; its API returned "The certificate does not exist yet" when enabling HTTPS. When the certificate becomes available, enable Enforce HTTPS in repository Settings > Pages and verify both apex and www secure URLs. DNS can take up to 24 hours to propagate. Account-level GitHub domain verification by TXT has not been configured.

## Updating

Push reviewed changes to main, then run Publish game to GitHub Pages in Actions. It runs npm ci, npm test and npm run build and publishes dist. A push alone does not deploy. To roll back, deploy a reviewed earlier source revision through the same workflow.

Current public build is a development preview; see RELEASE-READINESS.md for performance and device testing still needed.

Official setup references:
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://www.namecheap.com/support/knowledgebase/article.aspx/9645/2208/how-do-i-link-my-domain-to-github-pages/
