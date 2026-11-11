---
name: (Nama APlikasi) Design System
colors:
  surface: '#f6fbf5'
  surface-dim: '#d7dbd6'
  surface-bright: '#f6fbf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f5ef'
  surface-container: '#ebefea'
  surface-container-high: '#e5e9e4'
  surface-container-highest: '#dfe4de'
  on-surface: '#181d1a'
  on-surface-variant: '#404942'
  inverse-surface: '#2c322e'
  inverse-on-surface: '#edf2ed'
  outline: '#707971'
  outline-variant: '#c0c9bf'
  surface-tint: '#2e6a46'
  primary: '#004425'
  on-primary: '#ffffff'
  primary-container: '#1f5c3a'
  on-primary-container: '#94d2a7'
  inverse-primary: '#96d4a9'
  secondary: '#325f99'
  on-secondary: '#ffffff'
  secondary-container: '#93bdfd'
  on-secondary-container: '#194c84'
  tertiary: '#593000'
  on-tertiary: '#ffffff'
  tertiary-container: '#744615'
  on-tertiary-container: '#f8b77b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b1f1c4'
  primary-fixed-dim: '#96d4a9'
  on-primary-fixed: '#00210f'
  on-primary-fixed-variant: '#115130'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#a5c8ff'
  on-secondary-fixed: '#001c3a'
  on-secondary-fixed-variant: '#124780'
  tertiary-fixed: '#ffdcc0'
  tertiary-fixed-dim: '#fab97e'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#683c0a'
  background: '#f6fbf5'
  on-background: '#181d1a'
  surface-variant: '#dfe4de'
typography:
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.3'
  h3:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.4'
  h4:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-reg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  gutter: 16px
  margin: 20px
---

## Brand & Style

The design system is engineered for **(Nama APlikasi)**, a civic technology platform bridging the gap between environmental responsibility and economic opportunity. The brand personality is rooted in being **professional, trusted, and functional**, mirroring the reliability of essential public infrastructure while maintaining an **empowering** tone for individual users and collectors.

Influenced by the high-density, high-efficiency UI patterns of Gojek, the visual style is **Corporate / Modern**. It prioritizes information density and clear action paths over excessive whitespace, ensuring that users can navigate complex waste management workflows (sorting, selling, and reporting) with minimal friction. The interface uses a systematic approach to color coding and iconography to provide immediate visual cues in a fast-paced, real-world utility context.

## Colors

The palette is strategically divided into functional tiers to guide user decision-making:

- **Primary Action (Jalur Olah Sendiri):** Forest Green (#1F5C3A) represents sustainability and growth. It is the lead color for the primary brand identity and self-processing actions.
- **Secondary Action (Jalur Jual/Setor):** Blue (#0C447C) signifies commerce and reliability, used for transactions and deposit-based workflows.
- **Tertiary Action (Jalur Buang Aman):** Brown (#633806) indicates hazardous (B3) or final disposal routes, emphasizing caution and proper handling.
- **Surface & Neutrals:** A light-mode default using cool grays for borders and muted backgrounds to maintain a "clean" civic feel.

**Category Coding:** Waste types must strictly follow the defined badge colors (Organik, Anorganik, B3) to build muscle memory for waste separation.

## Typography

This design system utilizes **Plus Jakarta Sans** for all typographic layers. This font was selected for its modern, geometric structure which remains highly legible even in the dense information layouts required for logistics and financial tracking.

- **Headings:** Use bold weights (700) for H1 and H2 to establish clear section hierarchy. H3 and H4 use semi-bold (600) for sub-sections.
- **Body:** The standard reading size is 14px (Body Regular). Use 16px (Body Large) for introductory text and 12px (Body Small) for secondary metadata or dense list items.
- **Captions:** Always rendered in 11px uppercase with 0.5px tracking to distinguish instructional labels from content.
- **Localization:** All placeholder text and system labels must be in **Bahasa Indonesia** to ensure accessibility for the local target audience.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for mobile-first usage. 

- **Grid:** A 4-column grid for mobile and 12-column grid for desktop.
- **Margins:** 20px side margins on mobile to provide breathing room against the device edge.
- **Gutters:** A consistent 16px gutter between cards and interactive elements.
- **Density:** Components use a tight vertical rhythm (8px or 12px gaps) to ensure maximum information is visible on a single screen without excessive scrolling, reflecting the efficient nature of "Super App" interfaces.

## Elevation & Depth

This design system uses **Tonal Layers** combined with **Ambient Shadows** to create a structured hierarchy:

- **Base Layer:** The surface uses a subtle off-white (#F7F8F9) to reduce eye strain.
- **Interactive Layer:** Cards and containers are pure white (#FFFFFF) to pop against the surface.
- **Shadows:** 
  - Standard cards utilize a very soft shadow: `0 1px 3px rgba(0,0,0,0.08)`.
  - Hover states or active elements elevate using a more pronounced shadow: `0 4px 12px rgba(0,0,0,0.12)`.
- **Outlines:** A thin 0.5px border (#E2E8F0) is applied to all cards and input fields to maintain definition in high-brightness outdoor environments where waste management tasks often occur.

## Shapes

The shape language is **Rounded**, balancing professional structure with an approachable, modern feel.

- **Cards:** 16px radius for a soft, friendly container.
- **Buttons:** 12px radius, providing a distinct "touchable" area that feels substantial.
- **Badges:** 20px (Pill-shaped) to clearly differentiate categories (Organik, etc.) from other interactive rectangular elements.
- **Inputs:** 10px radius, slightly sharper than buttons to suggest a formal utility for data entry.

## Components

### Buttons
- **Primary:** Forest Green background with white text. High emphasis.
- **Secondary (Jual):** Blue background with white text.
- **Tertiary:** Subtle primary green background (#EAF3DE) with dark green text (#27500A). Used for secondary actions.

### Cards
- Always use white backgrounds with the 0.5px border.
- Include a 16px padding internally. 
- Shadow shifts from "Standard" to "Hover" on interaction.

### Badges (Pills)
- Use the 20px radius.
- Always include the category-specific background, border, and text color (e.g., Organik uses green tints).

### Input Fields
- 10px radius with the #E2E8F0 border.
- Focused state: Border changes to Primary Forest Green (#1F5C3A).
- Text Muted (#94A3B8) is used for placeholder text.

### Lists
- High-density lists with 12px vertical padding.
- Use dividers (0.5px #E2E8F0) between items.
- Incorporate iconography on the left for quick visual scanning of waste types.

### Bottom Sheets
- Used for selection of waste categories or location picking.
- Top corners must have a 20px radius.
- Include a drag handle (32x4px, centered, #E2E8F0).