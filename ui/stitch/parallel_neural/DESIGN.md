# High-Tech Editorial Design System

## 1. Overview & Creative North Star

This design system is anchored by the Creative North Star: **"The Precision Lab."** 

Unlike generic "dark mode" templates, this system seeks to emulate the high-fidelity feel of a technical instrument—clean, authoritative, and obsessively organized. We achieve a premium, custom feel by moving away from standard structural borders and instead leaning into **Tonal Layering** and **Intentional Asymmetry**. 

The aesthetic is built on the tension between a rigid, data-driven grid and fluid, ethereal glass elements. We use massive typography scales to create an editorial hierarchy, making complex AI data feel accessible yet formidable. Backgrounds are not just flat colors; they are textured with subtle dot patterns that act as a visual "blueprint" for the content resting above.

---

## 2. Colors

The palette is a sophisticated range of deep obsidian tones, punctuated by high-contrast whites and a vibrant "Action Orange" (#FF590A) that commands attention.

### Surface Hierarchy & Nesting
To create a "High-End" feel, we treat the UI as a series of physical layers. We avoid flat layouts by nesting containers of different tonal values:
- **Base Level:** `surface` (#131313) – The fundamental canvas.
- **Sectioning:** `surface_container_low` (#1B1B1B) – Used for large logical blocks.
- **Component Level:** `surface_container` (#1F1F1F) – Used for primary cards and interaction areas.
- **Elevation Level:** `surface_container_highest` (#353535) – Used for items that need to "pop" or hover.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to separate sections. Structure must be defined through background color shifts. For instance, a `surface_container_low` sidebar should sit directly against a `surface` main content area. The transition in hex value is the boundary.

### The "Glass & Gradient" Rule
For floating modals or sticky navigation, use **Glassmorphism**. Apply `surface_container` with a 70% opacity and a `backdrop-filter: blur(20px)`. This integrates the UI components into the environment rather than making them feel like stickers. 

For the primary CTA (#FF590A), use a subtle linear gradient from `primary` to `primary_container` (top-to-bottom) to give the button a slight convex "lens" feel.

---

## 3. Typography

The system utilizes two distinct typefaces to balance modern editorial with technical precision.

*   **Primary (Inter):** Used for all Display, Headline, and Title levels. It is clean, neutral, and highly legible.
*   **Technical (Space Grotesk / ftSystemMono):** Used for Labels and small UI metadata. It provides that "developer/AI" aesthetic.

### Type Scale Philosophy
- **Display-LG (3.5rem):** Set with tight tracking (-0.02em) to create a bold, "poster" look for hero sections.
- **Headline-MD (1.75rem):** Used for section titles, providing a clear entry point for the user's eye.
- **Label-SM (0.6875rem):** All-caps with increased letter-spacing (0.05em) for technical metadata, referencing the `ftSystemMono` influence.

The contrast between a massive `Display-LG` headline and a tiny, spaced-out `Label-SM` creates the "high-end editorial" feel typical of premium tech brands.

---

## 4. Elevation & Depth

We avoid the "card-on-gray" look of the early 2010s. Depth is achieved through light and transparency.

- **Tonal Layering:** Use the `surface_container` tiers to stack elements. A `surface_container_lowest` card placed on a `surface_container_high` background creates a "sunken" or "carved" effect, while the reverse creates a "lifted" effect.
- **Ambient Shadows:** Standard shadows are prohibited. Use a "Glow" approach: Shadows should have a blur of `32px` or `64px`, with an opacity of `4%–8%`. The shadow color should be a tinted version of `on_surface` to mimic real-world light bounce.
- **The "Ghost Border":** If a boundary is required for accessibility, use a 1px border with `outline_variant` (#5B4037) at **15% opacity**. It should be felt, not seen.
- **Signature Texture:** Every `surface` level should have a background-image of a 1px dot grid (spaced at 24px intervals) using `on_surface_variant` at 5% opacity. This reinforces the "Precision Lab" theme.

---

## 5. Components

### Buttons
- **Primary:** Background `primary_container` (#FF590A), text `on_primary_fixed` (#380C00). Corner radius: `sm` (0.125rem) for a sharp, technical look.
- **Secondary:** Transparent background with a `Ghost Border`. On hover, shift background to `surface_bright` (#393939).
- **States:** Hovering over any button should trigger a subtle `0.5s` transition of the background color or an increase in the "Ghost Border" opacity to 40%.

### Cards & Lists
- **No Dividers:** Explicitly forbid horizontal rules `<hr>`. Use a `2.5rem` (Spacing-10) gap to separate list items.
- **Selection:** Active list items should use `surface_container_highest` with a 2px vertical accent bar of `primary` on the left edge.

### Input Fields
- **Styling:** Inputs are "Underlined" style or "Ghost Border" boxes. Avoid fully filled gray boxes.
- **Focus State:** The border opacity should jump from 15% to 80% using the `primary` color token.

### Additional Signature Component: The "Data Pulse"
For AI-related status indicators, use a `4px` circle of `primary` with a concentric, animating ripple effect (20% opacity) to signify active processing.

---

## 6. Do's and Don'ts

### Do
- **Do** use intentional asymmetry. Align text to the left but place supporting data/visuals slightly off-center to create visual interest.
- **Do** use `Spacing-16` (4rem) or higher for section breathing room. High-end design requires "wasted" space.
- **Do** use `on_surface_variant` for secondary text to maintain a soft hierarchy against the deep black background.

### Don't
- **Don't** use standard #000000 black for everything. Stick to the `surface` tokens (#131313) to ensure gradients and shadows remain visible.
- **Don't** use rounded corners larger than `md` (0.375rem). Soft, bubbly corners contradict the "High-Tech" precision of the brand.
- **Don't** use icons with varying stroke weights. All icons must be "Linear" and match the `outline` weight.

---
*End of Design System Document*