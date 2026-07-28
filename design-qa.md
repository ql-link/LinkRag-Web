# Design QA — LinkRag Minimal Auth

## Visual truth and evidence

- Original selected direction: `/Users/jixu/.codex/generated_images/019fa90a-06b8-7e31-a856-6e2bd9f9cf6f/exec-8f297c2d-5682-4691-b364-b08e906cb87b.png`, 1448 × 1086 px.
- User override: remove the extra decorative elements from auth and make the screen visibly calmer. This instruction intentionally supersedes the original layered-paper treatment for `/login` and `/register` only.
- Before capture: `/tmp/linkrag-selected-auth-v2.png`, 1440 × 900 px, DPR 1.
- Revised desktop login: `/tmp/linkrag-minimal-auth-desktop.png`, 1280 × 720 px, CSS viewport 1280 × 720, DPR 1.
- Revised mobile register: `/tmp/linkrag-minimal-auth-mobile.png`, 390 × 844 px, CSS viewport 390 × 844, DPR 1.
- Landing evidence stage remains covered by `/tmp/linkrag-selected-evidence.png` and was not changed in this iteration.

## State and interaction coverage

- Light theme, signed-out `/login` and `/register` states.
- Desktop login contains one form and two inputs; mobile register contains one form and four inputs.
- The login-to-register text link was clicked in-browser and navigated to `/register` with the correct four-field form.
- Desktop and mobile document width matches the viewport; no horizontal overflow or unwanted vertical scroll was found.
- Browser console was checked after route switching and contained no errors.

## Full-view and focused comparison

- The before and after desktop screenshots were opened in the same comparison input.
- The full-view comparison confirms removal of the floating pill navigation, angled documents, quotes, paperclip, segmented mode control, duplicate in-card logo, security claims, and duplicate home link.
- The focused form region remains fully readable at desktop and mobile sizes. A separate crop was unnecessary because labels, inputs, CTA, and the mode-switch link are legible in the captures.

## Required fidelity surfaces

- Typography: system/PingFang stack, compact heading tracking, readable labels, and stable wrapping are preserved.
- Spacing and layout: a single 23.5rem form surface establishes the only visual focal point. Desktop whitespace is deliberate; mobile registration remains within one viewport.
- Colors and tokens: beige dotted background and warm brown primary action remain unchanged. Card border and shadow were reduced to quiet separation.
- Image quality: only the existing LinkRag brand asset remains; no decorative placeholder imagery or CSS illustration is present.
- Copy and content: headings and supporting copy now describe only the immediate authentication task.
- Accessibility: semantic labels, focus rings, practical tap targets, reduced-motion handling, and the existing reduced-transparency/contrast fallbacks remain intact.

## Comparison history

1. Previous pass matched the selected layered-paper reference but the result was rejected as visually cluttered.
2. P1 density issue: decorative documents and duplicated navigation/brand content competed with the form. Fix: removed all nonessential auth decoration and reduced the hierarchy to brand, return action, form, and mode switch.
3. P2 control density issue: icons and the segmented login/register switch added unnecessary chrome. Fix: removed field icons and replaced the segmented control with one contextual text link.
4. Post-fix desktop and mobile captures show one clear focal point, no overflow, stable form hierarchy, and no remaining actionable P0/P1/P2 finding.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3 follow-up only: the form surface could be made fully borderless in a future pass if an even more austere treatment is desired.

## Final result

final result: passed
