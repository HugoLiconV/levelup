---
name: Level Up
colors:
  surface: '#fffdf9'
  surface-soft: '#f1f5f1'
  background: '#f7f5f0'
  on-surface: '#20322f'
  on-surface-variant: '#536461'
  outline: '#e4e8e2'
  primary: '#34796f'
  primary-dark: '#245b54'
  primary-container: '#dceee5'
  secondary: '#e78a72'
  secondary-container: '#fbe5dc'
  tertiary: '#c99743'
  tertiary-container: '#f8edcf'
  error: '#b6605b'
  on-primary: '#ffffff'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 38px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: '-0.055em'
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 23px
    letterSpacing: '-0.04em'
  body-base:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: '0'
  label-caps:
    fontFamily: Geist
    fontSize: 10px
    fontWeight: '760'
    lineHeight: 14px
    letterSpacing: '0.13em'
rounded:
  sm: 0.5625rem
  DEFAULT: 0.8125rem
  md: 1rem
  lg: 1.1875rem
  xl: 1.4375rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin-mobile: 20px
  max-content: 590px
---

# Design System: Level Up

## 1. Visual Theme & Atmosphere

Level Up is a calm, optimistic habit and nutrition checkpoint companion. The interface uses a warm paper-like canvas with botanical teal surfaces, soft mint support colors, and small coral or gold moments for energy and reward. It feels personal and encouraging rather than clinical or gamified-heavy.

The layout is mobile-first and intentionally compact: a single narrow reading column, generous vertical rhythm, rounded containers, and lightweight borders create a quiet, focused experience for daily check-ins.

## 2. Color Palette & Roles

### Primary Foundation

- Warm Paper `#f7f5f0` is the page background.
- Cream Surface `#fffdf9` is used for cards, forms, and elevated content.
- Soft Sage `#f1f5f1` and Line `#e4e8e2` separate adjacent content without harsh contrast.

### Accent & Interactive

- Botanical Teal `#34796f` is the primary action, progress fill, active state, and brand mark.
- Deep Teal `#245b54` is the pressed/hover state and high-emphasis text on mint surfaces.
- Soft Mint `#dceee5` supports pills, progress context, and completed states.
- Gentle Coral `#e78a72` marks rewards, progress points, and small moments of emphasis.
- Warm Gold `#c99743` is reserved for optional guidance and nutrition insights.

### Typography & Text Hierarchy

- Ink `#20322f` is primary text.
- Muted Ink `#536461` is supporting copy.
- Faint Ink `#84928e` is metadata and low-priority labels.

### Functional States

- Error `#b6605b` is used for authentication and destructive feedback.
- Completed surfaces use pale green backgrounds with teal text.

## 3. Typography Rules

### Hierarchy & Weights

Geist is used throughout. Display headings are heavy with tight tracking; body text is 15px with a relaxed 1.45 line-height. Uppercase labels use 10px text with wide tracking. Numeric stats and checkpoint values use bold, compact type.

### Spacing Principles

The system follows a 4px base rhythm, with most layout gaps at 8, 12, 16, 20, or 27px. Touch targets are at least 44px tall. Text and controls remain left-aligned except for centered authentication content.

## 4. Component Stylings

### Buttons

Primary buttons are teal, white, 44px tall, 13px rounded, and subtly shadowed. Secondary buttons use a cream surface with a thin stronger line. Buttons compress slightly on press and darken on hover.

### Cards & Containers

Cards use cream surfaces, 1px sage borders, and 16–23px rounded corners. Shadows are soft and ambient, reserved for focused teal cards, login surfaces, and floating actions.

### Navigation

The app is a single centered mobile column capped at 590px. The header uses a compact brand lockup, a teal rounded-square mark, and icon buttons with 44px targets. Bottom navigation is fixed with safe-area-aware padding.

### Inputs & Forms

Labels sit above fields. Inputs inherit the system font and ink color, use the same rounded language as buttons, and receive a teal focus ring. Authentication forms are centered in a narrow cream card.

### Domain-Specific Components

Checkpoint strips use a horizontal teal progress track with a coral position dot. Focus cards use strong teal fills and a circular completion action. Quest rows, meal rows, week dots, and metric mini-cards create a compact daily dashboard vocabulary.

## 7. Shared React Component Inventory

The shared UI entry point is `app/components/ui`. Components keep the existing CSS class names as their styling contract so feature screens can migrate incrementally without changing the visual language.

### Core Primitives

- `Button` — `variant="primary" | "secondary" | "text"`; accepts native button props and `fullWidth`.
- `IconButton` — requires an accessible `label`, defaults to a non-submitting button, and accepts native button props.
- `Field` — renders a labeled field wrapper with optional `htmlFor`, hint, error, and required-state support.
- `Surface` / `Card` — rounded cream containers with `tone="default" | "soft"`.
- `Badge` — `mint`, `coral`, `gold`, or `neutral` status labels.
- `Banner` — `success`, `warning`, `error`, or `neutral` feedback surfaces.
- `Toast` — status feedback with an optional leading icon.

### Composed Primitives

- `Modal` — accessible dialog shell with Escape and backdrop dismissal, viewport-aware sizing, and the existing sheet animation.
- `BottomNav` — safe-area-aware five-item navigation surface with active state and `aria-current="page"`.

### Usage Rules

Use a core primitive when the behavior and visual role are reusable across two or more features. Keep domain-specific components such as `QuestRow`, `MealRow`, `MetricLine`, and `QuickAction` close to their feature until their data and interaction contracts are genuinely shared. Pass `className` for feature-specific layout adjustments; do not duplicate the base token, focus, radius, or state styles in feature CSS.

### Accessibility Requirements

Buttons must use an explicit `type` inside forms. Icon-only controls must use `IconButton` with a concise visible-to-assistive-technology label. Fields must associate labels with controls through `htmlFor`/`id`, expose validation through the existing `aria-invalid` and described-by attributes, and keep the teal focus ring visible. Dialogs must retain `role="dialog"`, `aria-modal="true"`, a descriptive label, Escape dismissal, and a keyboard-reachable close control.

## 5. Layout Principles

### Grid & Structure

Content is a centered single column with a 590px maximum width. Two-column metric cards are used only for compact paired stats. Sections stack vertically with approximately 27px gaps.

### Whitespace Strategy

The page uses 20px mobile edge padding and safe-area-aware top/bottom insets. Cards use 13–19px internal padding; major page sections use 27px spacing.

### Alignment & Visual Balance

Most content is left-aligned for fast scanning. Headings, cards, and progress elements carry the visual weight; coral and gold are small accents, never dominant backgrounds.

### Responsive Behavior & Touch

The layout is mobile-first with a 320px minimum width and a 590px content cap. Two-column cards collapse naturally via minmax tracks. Interactive controls maintain 34–47px visual targets and 44px button height.

## 6. Design System Notes for Stitch Generation

### Language to Use

Describe screens as warm, calm, mobile-first habit coaching with botanical teal, warm paper, cream cards, soft mint support surfaces, and coral reward accents.

### Color References

Use `#f7f5f0` for the canvas, `#fffdf9` for surfaces, `#34796f` for primary actions, `#245b54` for dark teal emphasis, `#dceee5` for mint support, `#e78a72` for rewards, and `#c99743` for optional guidance.

### Component Prompts

- “Create a narrow Level Up daily checkpoint screen with a teal focus card, progress strip, quest rows, and two compact metric cards on a warm paper background.”
- “Create a centered Level Up sign-in form with a cream rounded card, teal brand mark, Geist typography, visible labels, and a full-width teal Entrar button.”

### Incremental Iteration

Keep the 590px reading column, 4px spacing rhythm, 44px touch targets, and teal/mint/coral role separation. Add visual energy through small reward accents and progress states rather than gradients or large decorative imagery.
