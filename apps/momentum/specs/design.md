Here’s a practical design system for **Momentum** based on the light and dark mocks.

## Typography

Use **Manrope** throughout.

It is free, available through Google Fonts, modern without feeling corporate, and has enough warmth for the product.

```css
font-family: "Manrope", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

Recommended weights:

| Use            |     Weight |
| -------------- | ---------: |
| Page titles    |        700 |
| Card titles    | 650 or 700 |
| Buttons        |        650 |
| Body           |        400 |
| Labels         |        500 |
| Small metadata |        400 |

Suggested sizes:

```css
--font-display: 2rem;      /* 32px */
--font-page-title: 1.5rem; /* 24px */
--font-heading: 1.125rem;  /* 18px */
--font-body: 0.9375rem;    /* 15px */
--font-small: 0.8125rem;   /* 13px */
--font-caption: 0.75rem;   /* 12px */
```

Use approximately `1.4` line-height for body text and `1.15` for headings.

---

# Light mode

## Foundations

| Token               | Hex       | Use                                     |
| ------------------- | --------- | --------------------------------------- |
| `background`        | `#F8F5EF` | Main warm page background               |
| `background-subtle` | `#F2EEE6` | Secondary page areas                    |
| `surface`           | `#FFFDFA` | Cards and dialogs                       |
| `surface-raised`    | `#FFFFFF` | Important cards and overlays            |
| `surface-muted`     | `#F1EFE9` | Input backgrounds and inactive controls |
| `border`            | `#E5E0D7` | Default borders                         |
| `border-strong`     | `#D5CEC2` | Stronger dividers                       |
| `text-primary`      | `#17211D` | Main text                               |
| `text-secondary`    | `#59635E` | Supporting text                         |
| `text-muted`        | `#858C87` | Metadata and placeholders               |
| `text-disabled`     | `#ADB2AE` | Disabled elements                       |

## Brand green

| Token           | Hex       | Use                                |
| --------------- | --------- | ---------------------------------- |
| `primary`       | `#17613F` | Main buttons and active navigation |
| `primary-hover` | `#104F33` | Hover/pressed state                |
| `primary-soft`  | `#E4EDDF` | Insight and icon backgrounds       |
| `primary-muted` | `#A8BE91` | Charts and decorative detail       |
| `primary-light` | `#D4E3C9` | Soft selected states               |

## Supporting colours

| Token         | Hex       | Use                                  |
| ------------- | --------- | ------------------------------------ |
| `amber`       | `#F0A13A` | Energy, warmth, low-energy selection |
| `amber-soft`  | `#FFF0D7` | Amber card background                |
| `blue`        | `#4D86A8` | Progress and secondary data          |
| `blue-soft`   | `#E3F0F6` | Blue icon background                 |
| `purple`      | `#7864B8` | Consistency and calendar insights    |
| `purple-soft` | `#EEE9FA` | Purple icon background               |
| `success`     | `#378354` | Positive movement                    |
| `danger`      | `#B95B53` | Pain or destructive actions only     |

## Gradients

Hero image overlay:

```css
background:
  linear-gradient(
    180deg,
    rgba(255, 253, 250, 0) 40%,
    rgba(255, 253, 250, 0.9) 100%
  );
```

Primary button:

```css
background: linear-gradient(135deg, #17613F 0%, #24764E 100%);
```

Soft insight card:

```css
background: linear-gradient(135deg, #EEF4E9 0%, #FAF5E8 100%);
```

---

# Dark mode

Avoid pure black. The mock works because it has a deep green-charcoal base.

## Foundations

| Token               | Hex       | Use                          |
| ------------------- | --------- | ---------------------------- |
| `background`        | `#091417` | Main background              |
| `background-subtle` | `#0D1A1D` | Secondary areas              |
| `surface`           | `#111F21` | Cards                        |
| `surface-raised`    | `#172729` | Raised cards and dialogs     |
| `surface-muted`     | `#1B292A` | Inputs and inactive controls |
| `border`            | `#2A3939` | Default borders              |
| `border-strong`     | `#3B4B48` | Stronger dividers            |
| `text-primary`      | `#F3F2EB` | Main text                    |
| `text-secondary`    | `#BEC7C2` | Supporting text              |
| `text-muted`        | `#899590` | Metadata                     |
| `text-disabled`     | `#606D69` | Disabled elements            |

## Brand green

| Token            | Hex       | Use                               |
| ---------------- | --------- | --------------------------------- |
| `primary`        | `#92B967` | Primary actions and active states |
| `primary-hover`  | `#A5C979` | Hover state                       |
| `primary-strong` | `#70984C` | Button gradient endpoint          |
| `primary-soft`   | `#253622` | Green-tinted card background      |
| `primary-muted`  | `#657F50` | Charts and secondary accents      |

## Supporting colours

| Token         | Hex       | Use                          |
| ------------- | --------- | ---------------------------- |
| `amber`       | `#F2AD45` | Energy and warmth            |
| `amber-soft`  | `#3C2D19` | Amber card background        |
| `blue`        | `#6DA5C5` | Progress                     |
| `blue-soft`   | `#172C38` | Blue-tinted background       |
| `purple`      | `#A18ADB` | Consistency insights         |
| `purple-soft` | `#29243E` | Purple-tinted background     |
| `success`     | `#91C86A` | Positive change              |
| `danger`      | `#E08378` | Pain and destructive actions |

## Dark gradients

Primary button:

```css
background: linear-gradient(135deg, #70984C 0%, #98BB69 100%);
color: #08120D;
```

Cards:

```css
background: linear-gradient(145deg, #142326 0%, #101D1F 100%);
```

Hero overlay:

```css
background:
  linear-gradient(
    180deg,
    rgba(9, 20, 23, 0.05) 30%,
    rgba(9, 20, 23, 0.92) 100%
  );
```

---

# Shared shape and spacing

## Border radius

```css
--radius-small: 10px;
--radius-medium: 16px;
--radius-large: 22px;
--radius-hero: 28px;
--radius-pill: 999px;
```

Use:

* Buttons: `16px`
* Cards: `18–22px`
* Inputs: `12–16px`
* Filter chips: pill radius
* Hero artwork: `24–28px`

Avoid making every small element excessively rounded.

## Spacing

Use a 4px base grid:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

Typical mobile page padding: `20px`.

Card padding: `16px` or `20px`.

Gap between major sections: `24–32px`.

---

# Shadows

Keep them soft in light mode:

```css
box-shadow:
  0 1px 2px rgba(28, 38, 33, 0.04),
  0 8px 24px rgba(28, 38, 33, 0.07);
```

Dark mode should mostly use borders, not large shadows:

```css
box-shadow:
  0 1px 0 rgba(255, 255, 255, 0.025) inset,
  0 12px 32px rgba(0, 0, 0, 0.18);
```

---

# Icons

Use **Lucide React**.

It is free, consistent, understated and well suited to the line-art style.

Suggested stroke settings:

```tsx
<Icon size={20} strokeWidth={1.75} />
```

Use filled icons sparingly for active navigation and selected emotional states.

---

# Illustrations

The landscape illustrations are a core part of the visual identity.

Style:

* Soft gouache or watercolour texture
* Layered mountains
* Winding path or river
* Sunrise or sunset
* Muted green, cream and peach
* Low contrast
* No detailed faces
* Small human silhouettes only
* Wide compositions suitable for card cropping

Light illustration palette:

```text
Sky:       #F9E4C2
Sun:       #F5A35C
Mountain:  #9EAE92
Forest:    #4F715A
Path:      #F2D8A9
Shadow:    #536B62
```

Dark illustration palette:

```text
Sky:       #18262B
Sun:       #D89143
Mountain:  #394C4C
Forest:    #172D2C
Path:      #786447
Highlight: #B8A36F
```

Do not place illustrations in every card. Use them for:

* Home hero
* Workout summary header
* Empty states
* Occasional milestone or insight

---

# Emotional rating controls

Use five states, but avoid five completely different emoji styles.

Recommended pattern:

* Neutral outlined face
* Selected state receives filled background
* Number shown underneath
* One short label shown only for the selected value

Example labels:

| Score | Energy    |
| ----: | --------- |
|     1 | Exhausted |
|     2 | Tired     |
|     3 | Okay      |
|     4 | Good      |
|     5 | Great     |

For “Was it worth it?”:

| Score | Label      |
| ----: | ---------- |
|     1 | Not really |
|     2 | A little   |
|     3 | Mostly     |
|     4 | Definitely |
|     5 | Absolutely |

A star rating works visually, but labelled choices will provide cleaner and more useful data. You could retain stars while displaying the selected label below.

---

# Charts

Keep charts understated:

* No heavy axis lines
* No legends when one series is present
* Maximum of four horizontal grid lines
* Use a thin primary-colour line
* Add a very low-opacity area fill
* Highlight only the latest data point

Light:

```text
Line: #28714D
Fill: rgba(40, 113, 77, 0.10)
Grid: #E8E3DB
```

Dark:

```text
Line: #9AC66E
Fill: rgba(154, 198, 110, 0.10)
Grid: #283737
```

---

# CSS token starter

```css
:root {
  --background: #f8f5ef;
  --background-subtle: #f2eee6;
  --surface: #fffdfa;
  --surface-raised: #ffffff;
  --surface-muted: #f1efe9;

  --border: #e5e0d7;
  --border-strong: #d5cec2;

  --text-primary: #17211d;
  --text-secondary: #59635e;
  --text-muted: #858c87;

  --primary: #17613f;
  --primary-hover: #104f33;
  --primary-soft: #e4eddf;

  --amber: #f0a13a;
  --amber-soft: #fff0d7;
  --blue: #4d86a8;
  --blue-soft: #e3f0f6;
  --purple: #7864b8;
  --purple-soft: #eee9fa;

  --radius-card: 20px;
  --radius-control: 14px;
  --radius-pill: 999px;
}

[data-theme="dark"] {
  --background: #091417;
  --background-subtle: #0d1a1d;
  --surface: #111f21;
  --surface-raised: #172729;
  --surface-muted: #1b292a;

  --border: #2a3939;
  --border-strong: #3b4b48;

  --text-primary: #f3f2eb;
  --text-secondary: #bec7c2;
  --text-muted: #899590;

  --primary: #92b967;
  --primary-hover: #a5c979;
  --primary-soft: #253622;

  --amber: #f2ad45;
  --amber-soft: #3c2d19;
  --blue: #6da5c5;
  --blue-soft: #172c38;
  --purple: #a18adb;
  --purple-soft: #29243e;
}
```

The key design rule is: **the illustrations supply emotion; the interface itself stays restrained.** Too many gradients, icons or decorative cards would push it back toward a lifestyle brand rather than a useful journal.
