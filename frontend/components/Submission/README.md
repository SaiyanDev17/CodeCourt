# Submission Components

This directory contains reusable components for displaying submission-related information.

## Components

### VerdictBadge

A color-coded badge component for displaying submission verdicts with appropriate icons.

**Features:**
- ✅ Color-coded badges for each verdict type (AC, WA, TLE, MLE, RE, CE, PENDING)
- ✅ Appropriate icons for each verdict (checkmark, X, clock, memory, warning, error, spinner)
- ✅ Three size variants: small, medium (default), large
- ✅ Animated spinner for PENDING state
- ✅ Fully accessible with ARIA labels
- ✅ Responsive and mobile-friendly

**Usage:**

```tsx
import { VerdictBadge } from '@/components/Submission'

// Default medium size
<VerdictBadge verdict="AC" />

// Small size for compact lists
<VerdictBadge verdict="WA" size="small" />

// Large size for headers
<VerdictBadge verdict="TLE" size="large" />
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `verdict` | `SubmissionVerdict` | required | The submission verdict to display |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Badge size variant |

**Verdict Types:**

| Verdict | Color | Icon | Text |
|---------|-------|------|------|
| AC | Green | Checkmark | Accepted |
| WA | Red | X | Wrong Answer |
| TLE | Yellow | Clock | Time Limit Exceeded |
| MLE | Yellow | Memory | Memory Limit Exceeded |
| RE | Orange | Warning | Runtime Error |
| CE | Red | Error | Compilation Error |
| PENDING | Gray | Spinner | Judging... |

**Accessibility:**
- All badges have `role="status"` for screen readers
- Each badge includes descriptive `aria-label`
- Icons have `aria-hidden="true"` to prevent duplication
- Color is not the only indicator (icons + text provide redundancy)

**Testing:**
- ✅ 17 unit tests covering all verdict types, sizes, and accessibility features
- ✅ All tests passing
- ✅ No TypeScript errors

**Files:**
- `VerdictBadge.tsx` - Main component implementation
- `VerdictBadge.test.tsx` - Unit tests
- `VerdictBadge.demo.tsx` - Visual demo/showcase
- `index.ts` - Barrel export

**Requirements Validated:**
- ✅ Requirement 9.1: AC verdict with green checkmark
- ✅ Requirement 9.2: WA verdict with red X
- ✅ Requirement 9.3: TLE verdict with yellow clock
- ✅ Requirement 9.4: MLE verdict with yellow memory icon
- ✅ Requirement 9.5: RE verdict with orange warning
- ✅ Requirement 9.6: CE verdict with red error icon
- ✅ Requirement 9.6: PENDING verdict with animated spinner

## Development

### Running Tests

```bash
# Run all Submission component tests
npm test -- components/Submission

# Run tests in watch mode
npm run test:watch -- components/Submission
```

### Viewing Demo

To view the visual demo, import and render the `VerdictBadgeDemo` component in any page:

```tsx
import { VerdictBadgeDemo } from '@/components/Submission/VerdictBadge.demo'

export default function DemoPage() {
  return <VerdictBadgeDemo />
}
```

## Design Principles

1. **Tailwind JIT Compatibility**: Uses complete class names (not dynamic) for proper JIT compilation
2. **Consistent Styling**: Follows existing component patterns from `SubmissionResult`
3. **Accessibility First**: Proper semantic HTML and ARIA attributes
4. **Reusability**: Single component handles all verdict types and sizes
5. **Type Safety**: Full TypeScript support with proper type definitions

## Future Enhancements

Potential improvements for future iterations:
- [ ] Add tooltip with detailed verdict explanation on hover
- [ ] Add animation transitions when verdict changes
- [ ] Add support for custom colors/themes
- [ ] Add support for additional verdict types if needed
- [ ] Add internationalization (i18n) support for verdict text
