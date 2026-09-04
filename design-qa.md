# Landing Page Design QA

## Visual truth

- Source: `/var/folders/50/km_sgfsd0zzb0n0lxy3scv_00000gn/T/codex-clipboard-e28aa4ff-747f-4712-b574-ec0221476920.png`
- Implementation: `http://localhost:3017/`
- Final browser capture: `/tmp/intertool-minimal-final.png`
- Quiet-scale browser capture: `/tmp/intertool-landing-quiet-settled.png`
- Normalized comparison: `/tmp/intertool-minimal-comparison-final.png`
- Source size: 3420 x 2146 px; central reference panel normalized from a 2410 x 1513 px crop.
- Implementation QA viewport: 1636 x 1027 CSS px at DPR 0.88; capture size 1859 x 1233 px.
- State: unauthenticated, dark theme, animations settled.

## Comparison history

### Pass 1

- P2: The existing landing page contained multiple marketing sections and card-heavy content that did not match the reference's single focused hero.
- Fix: Removed the lower workflow, trust, pricing, and decorative sections. Kept one centered message, two actions, one proof line, and a three-image fan.
- P2: The initial simplified hero was visually undersized against the reference.
- Fix: Increased the display hierarchy to 60 px at desktop, expanded the fan to 1120 CSS px, removed the eyebrow, and moved the footer below the initial viewport.

### Pass 2

- Full view: Centered headline, short supporting copy, paired pill actions, proof line, and overlapping fan now follow the reference composition and vertical rhythm.
- Focused region: The hero's critical text and controls remain readable and the product fan preserves clear foreground/background depth.
- Typography: Intentional difference. The implementation uses the existing Geist-based Intertool design system rather than the reference serif.
- Colour: Intentional difference. The implementation uses the product's warm black, foreground, border, and muted tokens.
- Imagery: Intentional difference. Real Intertool dashboard, memories, and repository screens replace the reference artwork.
- Navigation: Intentional difference. The compact Intertool brand bar remains because it is part of the requested product shell.
- Responsive verification: The targeted homepage test passed in desktop Chromium and mobile Chromium.
- Browser diagnostics: No current runtime errors or image-loading warnings after the final reload.

### Pass 3

- P3: The hero used unequal top and bottom padding, leaving the composition approximately 12 px below the section's geometric centre at the live viewport.
- Fix: Replaced the asymmetric padding with matched vertical spacing while retaining the existing centred flex alignment.
- Verification: The heading, image fan, inner wrapper, and hero section share the same horizontal centre line.

### Pass 4

- Removed complexity: Eyebrow-style uppercase subheadings are absent from the landing page. The hero begins directly with the main headline.
- Regression coverage: The public-page browser test now rejects both the removed copy and any rendered `.eyebrow` or `.uppercase` element inside the landing-page main content.

### Pass 5

- Brand source: `http://localhost:3017/brand` and `/tmp/intertool-brand-reference.png`.
- Matched-viewport comparison: `/tmp/intertool-brand-landing-comparison-final.png` at 887 x 1109 CSS px.
- Normalization: The landing page already inherited the brand's warm OKLCH tokens, Geist Sans, Lucide iconography, pill controls, 8 px card radius, and 48 px shared header.
- Fix: Moved the hero and product fan onto the brand guide's `max-w-5xl` content grid, adopted its `leading-7` body rhythm, and reserved `--primary` blue for the key landing-page CTA.

### Pass 6

- P2: The 60 px headline, large pill controls, and 1024 px fan still made the hero feel louder than the intended restrained SaaS direction.
- Fix: Capped the heading at 48 px, returned body copy to 14 px / 24 px, changed both actions to compact pills, and reduced the fan to `max-w-4xl`.
- Brand correction: Filled primary buttons now use the neutral foreground/background pair. Blue remains available for links, focus rings, and active states, but not buttons.

### Pass 7

- Typography reference: The live `/sign-in` screen renders its heading at 18 px / 500 and supporting copy at 14 px.
- Fix: The landing-page headline now uses the same `text-lg font-medium tracking-tight` rule, with 14 px supporting copy and a reduced `max-w-3xl` product fan.
- System rule: The brand guide, design-system heading, and primary application page headings now use the same compact interface-scale hierarchy.
- Regression coverage: The public-page browser test asserts the landing headline remains 18 px / 500.

### Pass 8

- Spacing reference: The Loops landing-page example separates its intro, actions, and product visual into distinct vertical groups with progressively larger gaps.
- Fix: Moved the compact hero toward the top of the viewport, set 16 px between headline and copy, 28 px between copy and actions, and 80 px between the desktop actions and product fan.
- Responsive rhythm: The product gap contracts to 56 px on small screens while the hero keeps the same compact type hierarchy.

### Pass 9

- P2: The three overlapping dashboard screenshots competed with the compact hero message and made the visual treatment feel busier than the surrounding interface.
- Fix: Kept the three-card depth treatment but replaced literal product UI with three original, quiet watercolor landscapes inspired by the supplied reference.
- Consistency: All three assets share a faded bone, ochre, smoke, and pale-blue palette with soft paper texture and low contrast.
- Restraint: The artwork contains no text, logos, dashboard cards, charts, neon, or interface elements.

### Pass 10

- Direction reset: The standalone picture fan did not support the product story and was removed.
- Live references: Cursor informed the single large product proof over an atmospheric background; Linear informed the workflow-led section sequence; Warp informed the direct system and infrastructure explanation.
- Hero: One real Intertool dashboard now sits over an original warm-charcoal terrain backdrop rather than unrelated decorative slides.
- Story: The full page now explains sourced memory, retrieval scope, the capture-confirm-retrieve workflow, and product guardrails with focused product visuals.
- Brand: Geist, warm OKLCH surfaces, compact 18 px headings, neutral filled buttons, subtle borders, and the Intertool mark remain unchanged.

### Pass 11

- User correction: The generated hero composite felt artificial and was removed.
- Placeholder: The hero now reserves the final media dimensions with one empty brand-surface placeholder, ready for user-supplied imagery.
- Simplification: Removed the hero image markup, animation dependency, decorative backdrop, shadow treatment, and alternate mobile image composition.
- Scope: The supporting memory and repository product screens remain because they explain their adjacent sections; only the rejected hero artwork was removed.

### Pass 12

- User correction: The remaining memory-ledger and repository screenshots were also removed from the landing page.
- Placeholder system: All three reserved media areas now use empty, warm neutral surfaces with the same radius and border treatment.
- Layout continuity: Each placeholder preserves the original media aspect ratio and responsive grid position so user-supplied images can be inserted without shifting the page.
- Code simplification: Removed the final `next/image` dependency and the nested screenshot frames, padding, borders, and shadows from the landing component.

### Pass 13

- Audience correction: Repositioned Intertool for small product teams, growing platform organisations, and enterprise AI programmes rather than implying a single-team ceiling.
- Scale story: Added a three-stage operating model from one repository to enterprise rollout, grounded in current repository/path scopes, roles, tenant isolation, revocable tokens, lifecycle controls, and audit events.
- Proof boundary: Kept all three user-requested media placeholders intact and made no SSO, certification, compliance, or deployment claims that the current product does not prove.
- Browser verification: Desktop and Pixel 7 public-page tests passed. Full-page dark-theme captures are `/tmp/intertool-enterprise-desktop.png` and `/tmp/intertool-enterprise-mobile.png`; neither layout showed horizontal overflow.

### Pass 14

- Visual source: `/var/folders/50/km_sgfsd0zzb0n0lxy3scv_00000gn/T/codex-clipboard-83287a4d-4d5c-4795-aef3-193dac804833.png`.
- Browser captures: `/tmp/intertool-framed-desktop-final.jpg` and `/tmp/intertool-framed-mobile-final.jpg`; normalized side-by-side comparison is `/tmp/intertool-framed-comparison-final.png`.
- Composition: Adopted the reference's thin framed hero, centred product statement, functional command strip, and deliberate whitespace while keeping Intertool's compact 18 px heading scale.
- Brand adaptation: Retained Geist, the existing warm OKLCH surface ladder, neutral actions, Lucide iconography, and the shared Intertool navigation. The reference's bright pixel decorations were intentionally omitted.
- Content integrity: The hero command is the documented `/intertool:remember` workflow and links to the existing Claude Code setup guide. The copy control changes to a confirmed state after writing the command.
- Image boundary: No dashboard, terminal, or decorative imagery is fabricated. All three user-requested media positions remain empty dashed placeholders ready for supplied assets.
- Responsive verification: Fresh desktop and 390 px mobile browser sessions showed no horizontal overflow, no console errors, and no rendered images. The heading stayed at 18 px / 500 and the command remained readable on mobile.
- Shell stability: Removed a theme-dependent server/client attribute mismatch in the shared header so dark-theme reloads no longer trigger the development issue overlay.

### Pass 15

- Palette normalization: The homepage now inherits the exact scoped dashboard semantic tokens for background, surface, card, border, muted text, focus, and primary accent colours.
- Shell boundary: The landing header, content, and footer share the dashboard palette without inheriting the signed-in dashboard's framed application shell.
- Consistency: All existing landing sections, placeholders, command surfaces, controls, and links continue to use semantic classes, so both light and dark modes follow the dashboard token set without one-off colours.
- Documentation: Updated the development context to record that the homepage is the intentional public exception to the warm palette.

## Final result

passed
