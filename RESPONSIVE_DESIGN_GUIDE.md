# Responsive Design Guide - FinSense AI

This guide documents responsive design practices for the FinSense AI mobile app to ensure consistent, usable experiences across all Android device sizes.

## Device Categories

We target three main device categories for responsive testing:

| Category | Screen Width | Example Devices | Priority |
|----------|-------------|-----------------|----------|
| **Small Phone** | < 4.5" (~350px width) | Pixel 3a, Moto G6 | HIGH |
| **Standard Phone** | 4.5" - 6.5" (~375-412px width) | Pixel 4, OnePlus 8 | HIGH |
| **Large Phone/Tablet** | > 6.5" (~600px+ width) | Pixel Tablet, Samsung Tab | MEDIUM |

## Design Tokens & Responsive Scaling

All sizing should use the theme's responsive scaling function:

```javascript
// From theme.js
const scale = (size) => Math.round((width / 375) * size);
```

This ensures consistent relative sizing across all screen widths where:
- Reference width: 375px (standard phone)
- Scale factor: calculated from actual device width

**Implementation:**
- All spacing values defined in `theme.js` use this scale
- Direct pixel values should be avoided outside `theme.js`
- Use `spacing.xs`, `spacing.sm`, `spacing.md`, etc. instead of hardcoded values

## Critical Responsive Guidelines

### 1. Button Sizing (RecordScreen)

**Problem:** Large buttons overflow on small screens.

**Solution:** Use min/max width constraints:
```javascript
buttonArea: {
  width: '60%',
  minWidth: 160,    // Minimum for small phones
  maxWidth: 240,    // Maximum for large devices
  aspectRatio: 1,
  alignSelf: 'center',
}
```

**Testing:**
- Verify button stays centered on < 4.5" phones
- Verify button doesn't exceed 240px on large screens
- Touch target remains ≥ 44x44px (iOS/Android standard)

### 2. Text Wrapping

**Problem:** Long text (reminders, summaries, titles) gets clipped on small screens.

**Solution:**
- Always use `numberOfLines={n}` or `numberOfLines={undefined}` for wrapping
- Use `flex: 1` with `minWidth` constraints for text in rows
- Apply `flexWrap: 'wrap'` to parent containers with multiple text elements
- Use `lineHeight: 26` for better readability on small screens

**Example - Reminder Header:**
```javascript
reminderHeader: {
  flexDirection: 'row',
  flexWrap: 'wrap',      // Allow wrapping
  alignItems: 'flex-start',
  gap: spacing.xs,       // Smaller gap on wrap
}
reminderTitle: {
  flex: 1,
  minWidth: 150,         // Minimum width before wrapping
}
```

### 3. Container Padding

**Problem:** Content too tight on small screens, too loose on large screens.

**Solution:** Use theme spacing with responsive scaling:
```javascript
// For screen edges
paddingHorizontal: spacing.lg,  // Automatically scales: 16px @ 375px width

// For very small screens, use smaller padding
list: {
  paddingHorizontal: spacing.md,  // Could switch to this for < 4" screens
}
```

**Breakpoints (approximate):**
- Small phones (< 360px): Use `spacing.md` (6-8px scaled)
- Standard phones (360-412px): Use `spacing.lg` (16px scaled)
- Large devices (> 412px): Use `spacing.xl` (24px scaled)

### 4. Card & Section Layouts

**Problem:** Cards overflow or look cramped.

**Solution:** Add overflow containment:
```javascript
card: {
  overflow: 'hidden',    // Clip content that exceeds border radius
  borderRadius: radius.lg,
  padding: spacing.md,
}
```

**Flexbox Row Handling:**
```javascript
cardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  flexWrap: 'wrap',      // Allow wrapping if items too wide
  gap: spacing.xs,       // Smaller gap
}
dateGroup: {
  flex: 1,
  minWidth: 140,         // Prevent date from shrinking too much
}
```

### 5. Entity & Tag Layouts

**Problem:** Multiple tags/entities overflow container.

**Solution:** Use flexWrap:
```javascript
entityRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',      // Wrap to next line if needed
  gap: spacing.md,
  alignItems: 'flex-start',
}
entityValue: {
  flex: 1,
  minWidth: 140,         // Responsive minimum
}
```

### 6. Input Fields & Forms

**Problem:** TextInput doesn't scale properly.

**Solution:**
```javascript
input: {
  height: 46,            // Touch target at least 44px
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: radius.md,
}
searchInput: {
  flex: 1,
  height: 46,
  minHeight: 44,         // Ensure touchable
}
```

## Testing Checklist

### Before each phase completion, test on:

**Small Phone (< 4.5"):**
- [ ] No text clipping or overflow
- [ ] Buttons are centered and not oversized
- [ ] Cards don't extend beyond screen width
- [ ] Text wraps naturally for long summaries/reminders
- [ ] Navigation bar isn't cramped
- [ ] Keyboard doesn't hide critical buttons
- [ ] Touch targets are all ≥ 44x44px

**Standard Phone (4.5" - 6.5"):**
- [ ] All content displays correctly
- [ ] Spacing looks balanced
- [ ] Scrolling is smooth (no jank)
- [ ] Transitions are clean

**Tablet (> 6.5"):**
- [ ] Content doesn't spread too thin
- [ ] Cards are sized appropriately
- [ ] Padding provides good whitespace (not excessive)
- [ ] List columns are readable width

### Manual Testing Commands

```bash
# On macOS (Android Emulator)
adb shell am display-density 540    # Simulate 4" small phone
adb shell am display-density 420    # Simulate 6.7" large phone
adb shell am display-density 360    # Reset

# On physical device, use Developer Settings → Display Size
```

## Responsive Design Patterns

### Pattern 1: Percentage + Constraints

Best for buttons and visual elements:
```javascript
component: {
  width: '60%',          // Flexible width
  minWidth: 160,         // Don't get too small
  maxWidth: 240,         // Don't get too large
}
```

### Pattern 2: Flex + minWidth

Best for text and content rows:
```javascript
row: {
  flexDirection: 'row',
  flexWrap: 'wrap',
}
item: {
  flex: 1,
  minWidth: 140,         // Minimum before wrapping
}
```

### Pattern 3: Theme Tokens with Scaling

Best practice - use design tokens everywhere:
```javascript
import { spacing, typography, colors, radius } from './theme';

// Instead of hardcoding values
padding: spacing.md,       // Automatically scales
fontSize: typography.body.fontSize,
```

## Common Pitfalls

❌ **Don't:**
- Hardcode pixel values (e.g., `width: 300`)
- Use `aspectRatio` without width constraints
- Forget `numberOfLines` for long text
- Use `width: '100%'` without `overflow: 'hidden'`
- Assume all phones are >= 375px width

✅ **Do:**
- Use `spacing.*` and `typography.*` tokens
- Combine percentage width with min/max constraints
- Test on actual small devices
- Use `flexWrap: 'wrap'` for multi-item rows
- Set reasonable minWidth values (140-160px for text)

## Integration with Theme

The responsive scaling is defined in `mobile/src/components/theme.js`:

```javascript
const screenWidth = Dimensions.get('window').width;
const scale = (size) => Math.round((screenWidth / 375) * size);

export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(24),
  xxl: scale(32),
};
```

Every app layout automatically benefits from this scaling - no additional responsive code needed if using theme tokens.

## Future Improvements

- [ ] Add dynamic padding adjustment for very small screens (< 320px)
- [ ] Consider landscape orientation handling
- [ ] Add tablet-specific layout optimization
- [ ] Create E2E tests for responsive layout validation
- [ ] Document RTL (right-to-left) layout considerations

## References

- [React Native Dimensions API](https://reactnative.dev/docs/dimensions)
- [React Native StyleSheet Documentation](https://reactnative.dev/docs/stylesheet)
- [Material Design - Responsive Design](https://material.io/design/layout/responsive-layout-grid.html)
