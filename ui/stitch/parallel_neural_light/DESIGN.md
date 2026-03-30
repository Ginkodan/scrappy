# Design System Strategy: The Clinical Lab (Light Variant)

## 1. Overview & Creative North Star
**Creative North Star: "The Clinical Lab"**

This design system is a study in technical precision and high-output clarity. Moving away from the dense, heavy aesthetics of traditional "high-tech" dashboards, this variant adopts the persona of a high-end research facility: sterilized, methodical, and hyper-legible. 

We break the "template" look through **Rigid Asymmetry**. By utilizing a modular, block-based layout that prioritizes content density without sacrificing white space, the UI feels like a technical schematic rather than a generic website. The signature high-contrast typography and the strategic use of High-Voltage Orange create an "editorial-technical" hybrid that feels premium and authoritative.

---

## 2. Colors & Surface Architecture

The palette is rooted in a spectrum of surgical whites and cool greys, punctuated by a singular, aggressive accent.

### Surface Hierarchy & The "No-Shadow" Rule
We do not use drop shadows to define depth. Instead, we use **Tonal Layering** and the **Ghost Border**.
- **Surface (Background):** `#f8f9fa` — The base sterile environment.
- **Surface-Container-Lowest:** `#ffffff` — Reserved for primary content "cards" to create a subtle lift.
- **Surface-Container-High:** `#e7e8e9` — Used for "inset" areas like sidebars or utility panels.

### The "No-Line" Sectioning
Prohibit 1px solid black borders for sectioning. Boundaries are defined by:
1. **The Dot Grid:** A subtle `bg-dot-pattern` using `outline-variant` at 15% opacity to provide a technical "floor."
2. **Background Shifts:** Placing a `surface-container-lowest` card against the `surface` background.
3. **Ghost Borders:** If a boundary is required for accessibility, use `outline-variant` (#e4beb2) at 20% opacity.

### Glass & Soul
- **Signature Accent:** `primary_container` (#ff590a) is used sparingly for critical data points and primary CTAs.
- **Technical Polish:** For primary action states, use a linear gradient transitioning from `primary` (#aa3700) to `primary_container` (#ff590a) at a 135-degree angle to give the element a "functional glow."

---

## 3. Typography: Sharpness as a Feature

The type system is a dialogue between **Space Grotesk** (Geometric, technical) and **Inter** (Functional, neutral).

| Role | Token | Font | Size | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | display-lg | Space Grotesk | 3.5rem | "The Statement." Tight tracking (-0.02em), bold weight. |
| **Headline**| headline-md | Space Grotesk | 1.75rem | "The Subject." High-contrast black on white. |
| **Title**   | title-md | Inter | 1.125rem | "The Label." Semi-bold for navigational anchors. |
| **Body**    | body-md | Inter | 0.875rem | "The Data." Deep charcoal for sustained reading. |
| **Label**   | label-sm | Inter | 0.6875rem | "The Metadata." All-caps, tracked out (+0.05em). |

---

## 4. Elevation & Depth: Tonal Stacking

Traditional depth (Z-axis) is replaced by **Structural Insetting**.

*   **The Layering Principle:** To create a "floating" header, do not use a shadow. Use `surface-container-lowest` with a `backdrop-blur` of 12px. This creates a "frosted glass" effect that allows the high-voltage orange accents to bleed through softly as the user scrolls.
*   **Ambient Light:** When a floating modal is unavoidable, use a 32px blur shadow with 4% opacity of the `on-surface` color. It should feel like a whisper, not a structural element.
*   **The Zero-Radius Rule:** All components use `0px` border-radius. In a clinical lab, precision is found in hard edges and mathematical certainty.

---

## 5. Components

### Buttons & Interaction
*   **Primary:** High-Voltage Orange (`primary_container`). Solid fill, black text (`on_primary_container`). 0px radius. Hover state: `primary` (#aa3700) with a 2px offset "Ghost Border."
*   **Secondary:** Ghost style. `outline-variant` border (20% opacity) with `on_surface` text.
*   **Tertiary:** All-caps `label-md` text with a 4px `primary_container` square prefix icon.

### Technical Inputs
*   **Text Fields:** `surface-container-low` fill. No bottom border. Focus state triggers a 1px `primary_container` left-accent bar.
*   **Checkboxes:** Square (`0px`). Unchecked: `outline-variant`. Checked: `primary_container` fill with a white "X" rather than a checkmark for a more technical feel.

### Lists & Data
*   **Dividers:** Forbidden. Use `spacing-6` (1.3rem) of vertical white space or a change in background tone (`surface` to `surface-container-high`).
*   **Data Chips:** Small, rectangular modules using `surface-container-highest` with `label-sm` text.

### Additional Signature Components
*   **The "Status Monolith":** A large, vertical bar on the far left of a card using `primary_container` to indicate "Active" or "Critical" status.
*   **The Breadcrumb Schematic:** Using `>` separators and `label-sm` typography to mimic file paths in a terminal.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Align text to the left but allow data visualizations to "break" the container width.
*   **Use the Dot Grid:** Apply the `bg-dot-pattern` to large empty states to maintain the "in-progress" lab feel.
*   **Prioritize Information Density:** Keep margins tight (using `spacing-4` or `spacing-5`) to allow more data on screen.

### Don't:
*   **No Rounded Corners:** Never use `border-radius`. It softens the "Clinical" intent.
*   **No Generic Shadows:** Shadows should never be used to define a card's boundary; use color shifts.
*   **No "Soft" Colors:** Avoid pastels. Use only the defined neutrals and the signature orange. If you need a "Success" state, use the `tertiary` (#0061a4) blue, never a soft green.

---
*Document Version: 1.0.2 | Internal Design System Directive*