# P5 · Agent Assurance

[Open the live demo](https://mohamedyasser722.github.io/P5-prototype/)

P5 is a frontend-only prototype for assessing existing AI agents against a proposed technical governance policy. The workspace starts with fictional Demo National Bank agents, completed assessments, and one sample attestation.

## Run locally

Use Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. To check the production build locally:

```sh
npm run build
npm run preview
```

## Guided demo

1. Open **Overview** and select **Start guided demo**. Review the prefilled Customer Support Agent profile and tool scope, then register it.
2. On the integration page, select **See How Integration Works**. Watch the Python configuration change, or step through the walkthrough with the playback controls. The JavaScript example is available in the language switcher.
3. Keep **LLM + tool execution** selected and choose **Simulate Connection Test**. Continue to **Configure assessment**.
4. Review the six mandatory control categories in **P5 Basic Agent Governance v1.0**. Optionally add the repeated disclosure probe. Select **Run assessment** to see per-control progress and live evidence events.
5. Open the report. Expand **SEC-002** and **PRIV-001**. By default, restricted operation enforcement and response redaction are disabled.
6. Follow **Open safeguards**, enable **Restricted operation enforcement** and **Response redaction**, and save. Go back to the report and choose **Retest Failed Controls**. The retest records fresh evidence and keeps the preceding results in the attempt history.
7. Open the updated report and choose **Issue certificate**. Preview it, then use **Print / Save PDF** if you want a copy. Refresh and find the certificate again under **Certificates**.

To demonstrate incomplete coverage, select **LLM traffic only** at integration. Both tool controls are marked **NOT VERIFIED**. Use the finding to return to integration, switch to instrumented coverage, then retest. Issuance requires all seven mandatory checks to pass for the current agent configuration.

Use **Settings → Reset Demo** and confirm to restore the original records in the current browser. The **Register new agent** action also supports entering a different fictional agent from scratch.

## Architecture

- **Presentation** uses React, TypeScript, hash-based React Router navigation, Tailwind, Lucide, Motion, and a bundled Inter font. The walkthrough is rendered entirely in the interface.
- **Policy and simulation** live in `src/domain/policy.ts` and `src/domain/simulator.ts`. Each scenario deterministically evaluates a captured agent configuration and produces a result, synthetic evidence, and a remediation recommendation where applicable.
- **Repository** operations in `src/domain/repository.ts` own registration, integration, assessment attempts, versioning, activity, and issuance. Retests rerun failed, unverified, and affected controls. Unaffected passing evidence retains its original configuration version.
- **Client persistence** uses `src/domain/service.ts` and `src/StoreProvider.tsx`. The provider wraps mutations in a promise-based interface with simulated latency and persists each completed scenario. In-flight runs resume from the saved checkpoint after a refresh. The store listens for changes across tabs and uses browser Web Locks where available.

## Simulation boundaries

Setting an LLM client’s base URL only exposes supported LLM traffic. Real enforcement of tool calls requires a compatible MCP gateway or an instrumented execution layer. P5 simulates both coverage levels locally. The gateway address and credential shown in the UI are placeholders. Test traffic, customer identifiers, evidence records, and certificates are synthetic.

**Prototype technical assurance attestation. Not an official Egyptian PDPL or government-issued certification.**

## Verify

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

For an existing Google Chrome installation, use `P5_CHROME_CHANNEL=chrome npm run test:e2e` in a POSIX shell.

## Static deployment

The output is the `dist` directory. Relative asset URLs and hash navigation support nested paths without host-side route rewrites.

- **GitHub Pages** — The Pages workflow runs the domain tests, builds the site, and deploys `dist` on pushes to `main`. To deploy a fork, select **GitHub Actions** as the publishing source under **Settings → Pages**, then run the workflow.
- **Vercel** — Import the repository as a Vite project. Set the build command to `npm run build` and the output directory to `dist`.
