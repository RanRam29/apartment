# React Native Styling Guide (Design System v3.0)

> This guide provides concrete React Native styling structures to recreate the Stitch design look. Use this when implementing your screens in `mobile/src/screens/`.

---

## 🎨 Color Palette Constants

Since we cannot modify `dirAppTokens.ts` directly due to task restrictions, you should define or use this local color structure inside your screen component files:

```typescript
const colorsV3 = {
  primary: '#00091b',            // Deep Navy (base text, headings)
  primaryContainer: '#002045',   // Deep Blue Container
  onPrimaryContainer: '#7089b3', // Muted Blue text inside dark panels
  secondary: '#006b5f',          // Brand Teal (borders, accents)
  secondaryContainer: '#9cefdf', // Active Tab / Highlight background
  onSecondaryContainer: '#0b6f63', // Dark Teal text on pastel background
  background: '#f8f9ff',         // Soft icy white/blue background
  surface: '#f8f9ff',
  surfaceContainerLowest: '#ffffff', // Card/Input backgrounds
  surfaceContainerLow: '#f2f3f9',
  surfaceContainer: '#eceef3',       // Input borders/divider lines
  surfaceContainerHigh: '#e7e8ee',
  surfaceContainerHighest: '#e1e2e8',
  onSurface: '#191c20',          // Body text
  onSurfaceVariant: '#44474e',   // Secondary body/captions
  outline: '#74777f',
  outlineVariant: '#c4c6cf',
  actionCta: '#00cba9',          // Bright Emerald/Mint (Primary CTAs)
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
};
```

---

## 🏗️ Common UI Patterns

### 1. Primary Action CTA Button (Emerald Pill)
For main submittal buttons (Login, Continue, Onboarding next, Verification, etc.):

```typescript
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

// In JSX:
<TouchableOpacity 
  style={styles.primaryCta} 
  activeOpacity={0.85}
  onPress={handlePress}
>
  <Text style={styles.primaryCtaText}>המשך</Text>
</TouchableOpacity>

// Styles:
const styles = StyleSheet.create({
  primaryCta: {
    backgroundColor: '#00cba9', // Action CTA Emerald
    height: 48,
    borderRadius: 24, // Pill shape
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00cba9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  primaryCtaText: {
    color: '#ffffff',
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 2. Form Input Field
For inputs (e.g. Email, Password, Search):

```typescript
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// In JSX:
<View style={styles.inputContainer}>
  <Text style={styles.inputLabel}>אימייל</Text>
  <View style={styles.inputWrapper}>
    <TextInput
      style={styles.input}
      placeholder="הזן אימייל"
      placeholderTextColor="#74777f"
      keyboardType="email-address"
      autoCapitalize="none"
      textAlign="right"
    />
    <Ionicons name="mail-outline" size={20} color="#74777f" style={styles.inputIcon} />
  </View>
</View>

// Styles:
const styles = StyleSheet.create({
  inputContainer: {
    width: '100%',
    marginBottom: 16,
    gap: 4,
  },
  inputLabel: {
    fontSize: 14,
    color: '#44474e', // onSurfaceVariant
    fontFamily: 'Rubik-Medium',
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  inputWrapper: {
    position: 'relative',
    height: 48,
    width: '100%',
  },
  input: {
    backgroundColor: '#f8f9ff', // surface/background
    borderColor: '#74777f',     // outline
    borderWidth: 1,
    borderRadius: 8,            // rounded-lg radius
    height: '100%',
    width: '100%',
    paddingRight: 16,
    paddingLeft: 44, // Space for left icon (since RTL has input right-aligned, icon left-aligned)
    textAlign: 'right',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    color: '#191c20',           // onSurface
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
  },
});
```

### 3. Glassmorphic / Elevated Card Container
For lists or detail summary boxes:

```typescript
import { View, StyleSheet } from 'react-native';

// In JSX:
<View style={styles.card}>
  {/* Content */}
</View>

// Styles:
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff', // surfaceContainerLowest
    borderRadius: 16,           // rounded-2xl
    borderWidth: 1,
    borderColor: 'rgba(196, 201, 207, 0.3)', // outlineVariant/30
    padding: 20,
    shadowColor: '#002045',      // primaryContainer
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
});
```

### 4. Interactive Micro-Indicators / Progress Pills
Used in onboarding carousels and multi-photo indicators:

```typescript
import { View, StyleSheet } from 'react-native';

// In JSX:
<View style={styles.indicatorRow}>
  <View style={[styles.dot, styles.dotInactive]} />
  <View style={[styles.dot, styles.dotInactive]} />
  <View style={[styles.dot, styles.dotActive]} />
</View>

// Styles:
const styles = StyleSheet.create({
  indicatorRow: {
    flexDirection: 'row-reverse', // RTL alignment
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#c4c6cf', // outlineVariant
  },
  dotActive: {
    width: 32, // Stretched active dot
    backgroundColor: '#006b5f', // secondary (Teal brand color)
  },
});
```

---

## ⚡ Interactive States & Micro-animations

1. **Active Scale Feedback:** When a button is pressed, animate its scale down to `0.97`–`0.98` using `useNativeDriver` or standard `activeOpacity={0.85}` on standard Touchables.
2. **Text Shadow / Glow:** For cards showing trust scores, add a subtle glow:
   - `shadowColor: '#00cba9'`
   - `shadowOpacity: 0.4`
   - `shadowRadius: 15`
3. **Smooth Slide Transitions:** For carousel flows (like Onboarding), use React Native's `FlatList` with `pagingEnabled` or standard Animated values to transition the `translateX` offset smoothly.
