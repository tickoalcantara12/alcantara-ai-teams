---
name: anti-slop
description: Anti-Slop quality filter and craftsmanship standard (adapted from miqdadbadjuber/anti-slop, MIT). Eliminates generic AI-generated UI, copywriting, layout, accessibility, and code-comment slop across design, implementation, code review, and QA.
---
# Skill: Anti-Slop (UI, Copywriting, Accessibility, Layout & Code Comment Hygiene)

> Adapted from [miqdadbadjuber/anti-slop](https://github.com/miqdadbadjuber/anti-slop) — MIT License, Copyright (c) 2026 Miqdad Badjuber.

Apply this skill whenever building, editing, reviewing, or testing **user interfaces, frontend components, web pages, product/marketing copy, or code comments**.

---

## 1. Core Principle & Craftsmanship Standard (`C-1` to `C-5`)

The filter rejects **technique without purpose**, not technique itself. Before using any visual pattern, copy structure, or comment, answer: **what does this serve?**
- **Swap-the-logo test:** *If the logo and product name were swapped out, would this design still feel unique and have its own character?* If **no**, it is too generic.
- **C-1 Intentionality:** Every visual and copy decision has a one-line reason you can articulate (`R-31`). "It's the AI default" is an automatic fail.
- **C-2 Functional Completeness:** Every interactive element works (`R-26`), or it does not exist. Dead buttons and links to nowhere are defects.
- **C-3 Content-Driven Composition:** Every section exists because the product's content needs it (`R-05`), not to fill a landing-page template.
- **C-4 Resilience:** The UI holds up in every state (`empty`, `loading`, `error`), every shipped theme, every breakpoint (`R-03`), and keyboard-only navigation (`R-32`).
- **C-5 Evidence Over Claims:** Every statistic, testimonial, or compliance/performance claim is real and verifiable (`R-17`, `R-18`, `R-36`, `R-38`), or omitted.

---

## 2. Liveliness Toolkit (Design Read, Dials & Levers)

Removing slop without direction leaves a sterile default. Before generating or overhauling a UI:

1. **Load Direction (`R-37`):** Read `DESIGN.md`, `.ai-team/constitution.md`, or `spec.md` / `design.md`. If no brand/style direction exists and you cannot ask, label the output *"draft without direction"* and use honest default dials `ENERGY 1 / RHYTHM 1 / MOTION 1`.
2. **Declare the Design Read:**
   > `Reading this as: <page/view kind> for <audience>, in a <visual language> style, dial ENERGY <1-3> / RHYTHM <1-3> / MOTION <1-3>.`
   - **ENERGY** (`1` Calm · `2` Balanced · `3` Bold): How strongly the visual hierarchy greets the user.
   - **RHYTHM** (`1` Uniform grid · `2` Consistent with breaks · `3` Asymmetric/mixed): How much sections vary in composition.
   - **MOTION** (`1` Hover states only · `2` Subtle transitions · `3` Choreographed motion): Amount and purpose of animation.
3. **Apply the Five Levers:**
   - **One focal point per screen** (everything else defers to it).
   - **Hierarchical contrast** (size, weight, and color differentiated on purpose).
   - **Whitespace as structure** (sets rhythm and grouping, not leftover space).
   - **One deliberate accent** (used sparingly at key moments; never zero, never everywhere).
   - **Identity motif** (one consistent typographic voice, border treatment, or layout signature).

---

## 3. Mandatory UI, Copy & Accessibility Rules (`R-01` to `R-40`)

### Group 1 — Hard Gate (Absolute, zero exceptions)
Breaking any Hard Gate rule is a **Blocking** failure:

- **`R-02` No Em Dashes in Generated Copy:** Never write the em dash character (`—`) in UI text, prose, or microcopy. Use a comma (`,`), period (`.`), colon (`:`), or parentheses `()` instead.
- **`R-03` Mobile Responsiveness:** No horizontal overflow, no text escaping containers, no colliding/clipped cards, comfortable mobile navigation, and minimum `44px` tap targets on interactive controls.
- **`R-17`, `R-18`, `R-36`, `R-38` No Fabricated Content or Claims:** Never invent statistics (`10K+ Users`, `99.9% Uptime`), testimonials (AI avatars, fictional names/titles), security/compliance badges (`SOC 2`, `ISO 27001`), or unmeasured performance claims (`300% faster`). Use real data or explicit placeholders (`[REAL DATA]`, `[LOGO]`, `Coming soon`).
- **`R-23` Honest Visual Assets:** Do not invent final logos, team photos, or avatars without instructions; ask first or use explicit placeholders (`[LOGO]`, initial avatars).
- **`R-24` & `R-26` Working Navigation & Controls:** Every nav link must point to a real destination (`R-24`). Every button, form, modal, tab, or toggle must have real behavior (`R-26`). Remove dead controls.
- **`R-25` WCAG AA Color Contrast:** Minimum `4.5:1` for normal text and `3:1` for large text (`18px+`). Never put light grey text on grey backgrounds or white text over light gradient regions.
- **`R-27` Complete Data States:** Every data-driven view must implement **Empty**, **Loading**, and **Error** states—not just the happy path.
- **`R-28` Product-Specific FAQ Only:** Never ship generic template FAQs ("Can I cancel anytime?", "Is my data secure?") unrelated to real product mechanics.
- **`R-32` & `R-39` Keyboard & Semantic Accessibility:**
  - All interactive controls reachable via `Tab`/`Shift+Tab` in visual order, operable via `Enter`/`Space`, modals closable via `Escape`.
  - Visible focus ring on every interactive element (never `outline: none` without a clear custom focus indicator).
  - Native semantics: `<button>` for actions, `<a href>` for navigation (no clickable `<div>`/`<span>`).
  - Enabled interactive controls use `cursor: pointer`; disabled controls use `cursor: not-allowed`.
  - Accessible names (`aria-label` on icon-only buttons, `aria-hidden="true"` on decorative icons, `alt` on every `<img>`, visible `<label>` on every form input).
  - Distinct hover, active, and disabled states (not color alone).
  - Respect `prefers-reduced-motion: reduce` for non-essential motion.
  - Full HTML documents must include `<html lang>`, `<title>`, semantic landmarks (`header`, `nav`, `main`, `footer`), a single `<h1>` with no skipped heading levels, and must never disable zoom (`user-scalable=no` / `maximum-scale=1` forbidden).
- **`R-33` No File/CSS Patch Scripts:** Never mutate source or CSS via throwaway string-replacement scripts; edit source files directly.
- **`R-34` Theme Completeness:** If a light/dark toggle is shipped, both themes must have verified contrast, tokens, and unbroken layouts.
- **`R-35` Verify Before Delivery:** Build/run the UI, check for console errors, exercise interactive controls across breakpoints/themes, and record evidence.
- **`R-40` Web Performance Hygiene:** Set `width` and `height` (or `aspect-ratio`) on `<img>`, `<video>`, and `<iframe>` to prevent layout shift; never `loading="lazy"` on the hero image (use `fetchpriority="high"`); no render-blocking third-party scripts in `<head>`.

### Group 2 — Purpose-Gate (Allowed only with a written 1-line reason & dose cap)
- **`R-01` Color & Gradients:** No default blue-to-purple, purple-to-pink, neon, or full-page radial glow backgrounds unless required by brand/hierarchy (reason documented).
- **`R-04` Icons:** No filler AI icons (Sparkle, Star, Magic, Lightning, Robot, Orb) or unconsidered default icon packs unless directly relevant to the content.
- **`R-06` Typography:** No default terminal monospace headings or wide-tracked uppercase eyebrow labels without a documented brand reason.
- **`R-07` Background Patterns:** No default grid squares, dot matrices, or blueprint lines without a documented identity reason.
- **`R-08` Button Arrows:** Do not append `→` or `↗` to every button by default.
- **`R-09` Badges:** No decorative capsule pills (`AI Powered`, `Beta`, `New`) or redundant eyebrow badges above `<h1>` repeating the headline.
- **`R-10` Glassmorphism Dose Cap:** `backdrop-filter` blur on at most 1–2 elements (never navbar + cards + modals + sidebar simultaneously).
- **`R-12` Shadows:** Use elevation shadows selectively for hierarchy, not floating every card and control.
- **`R-13` Glow Dose Cap:** Glow accent on at most 1–2 focal elements.
- **`R-14` Feature Cards:** Avoid uniform copy-paste card grids when content has varied importance; not every point needs a card.
- **`R-19` Animations:** Every animation needs a UX purpose and must match the `MOTION` dial (no blanket Fade-Up + Bounce + Float on everything).
- **`R-22` Illustrations:** No generic Undraw/Storyset/3D blobs disconnected from the product.

### Group 3 — Quality Locks (Consistency, Copy & Identity)
- **`R-05` Content-Driven Layout:** Avoid cookie-cutter AI page templates (Hero + 3 identical cards + 3-step "How It Works" + "Trusted By" logo bar + default bento grid + fake terminal window + 3-column pricing with "Most Popular" badge + 4-column boilerplate footer).
- **`R-11` Border Radius Hierarchy:** Match radius to component hierarchy; never make every button, card, input, and container pill-shaped (`9999px`).
- **`R-15` Specific CTAs:** Replace generic CTAs (`Get Started`, `Learn More`, `Try Now`, `Explore`, `Discover`) with concrete actions (`Create Workspace`, `Run Live Query`, `Download CLI`).
- **`R-16` Ban AI Buzzwords:** Never write `AI Powered`, `Revolutionary`, `Next Generation`, `Seamless`, `Cutting Edge`, `Effortless`, `Unleash`, `Elevate`, or `Game-changing`. State concrete capabilities instead.
- **`R-20` & `R-30` Original Visual Identity:** Do not clone Linear, Vercel, Stripe, or Notion unless explicitly instructed by the user.
- **`R-21` Intentional Theme:** Choose light/dark default for a stated product/audience reason, or implement a working toggle.
- **`R-29` Focused Palette:** Limit active palette to 2–3 core colors + 1 accent color (excluding neutrals).
- **`R-31` One-Line Decision Log:** Document a one-line reason for palette, typography, layout rhythm, spacing, and card/icon usage in `design.md` or `implementation-notes.md`.

---

## 4. Code Comment Hygiene (`antislop-code`)

Apply these rules whenever writing, editing, or reviewing code comments:

### Remove / Never Write AI-Slop Comments
1. **Decorative Separators:** Remove banner comments, ASCII boxes, and ALL-CAPS section dividers (`// ======= AUTH =======`, `/* --- HELPERS --- */`).
2. **Restating the Obvious:** Remove comments that repeat the code (`let count = 0; // initialize count`, `// Validate user` above ` validateUser()`).
3. **Workflow Narration:** Remove step-by-step narration (`// Step 1: Validate input`, `// Step 2: Fetch user`, `// First... Next... Finally...`).
4. **Empty Category Labels:** Remove content-free labels (`// Main logic`, `// Business logic`, `// Helper function`, `// Note: this is important`).
5. **Vague Placeholders:** Remove unactionable TODOs (`// TODO: improve this`, `// Future optimization`). Keep a `TODO` only when it names the concrete task and reason.
6. **Signature Echo Docstrings:** Do not write JSDoc/docstrings that merely repeat parameter and function names (`@param id The id`) without adding contract, unit, error, or domain information.
7. **Decorative Emojis & End Markers:** Never put emojis in code comments (`// 🚀 Fast path`, `// ✅ Done`) or closing-brace markers (`} // end if`).
8. **Over-Explained Paragraphs:** Keep comments to **1 line** (or 2 lines maximum when stating two distinct facts). State the constraint directly without multi-sentence essays.

### Preserve Valuable Comments
- **Never delete** comments that explain **why**: business rules, architectural constraints, security invariants, concurrency hazards, protocol edge cases, third-party quirks/workarounds (e.g., *`// Stripe retries webhooks for 72h; deduplicate by event.id`*), or license headers.
- **Scope Guardrail:** When cleaning comments, never alter executable code or strip pre-existing valuable documentation in untouched files.

---

## 5. Anti-Slop Delivery Gate Checklist

Before completing implementation (`implementer`), issuing `APPROVED` (`reviewer`), or issuing `PASS` (`qa`):

- [ ] **Hard Gate (`R-02`..`R-40`):** Zero em dashes (`—`) in UI copy; mobile layout has no overflow and `>= 44px` tap targets; zero fabricated stats/testimonials/claims; all links/buttons perform real actions; WCAG AA contrast (`4.5:1` / `3:1`) met; `empty`, `loading`, and `error` states implemented; keyboard navigation, visible focus rings, native `<button>`/`<a href>`, `cursor: pointer`, labels/alt text, and `prefers-reduced-motion` verified.
- [ ] **Purpose-Gate & Quality Locks (`R-01`..`R-31`):** No unmotivated blue-purple gradients, glow/glassmorphism stacking, filler icons, generic CTAs (`Get Started`, `Learn More`), or AI buzzwords (`Seamless`, `Revolutionary`, `Next Generation`); one-line design rationale recorded.
- [ ] **Liveliness:** Design Read (`ENERGY / RHYTHM / MOTION` dials) declared for UI tasks, with one clear focal point per view and deliberate hierarchy.
- [ ] **Code Comments:** Zero decorative banners, obvious restatements, workflow narration (`// Step 1`), or emoji comments in the diff; remaining comments concisely explain **why**.
