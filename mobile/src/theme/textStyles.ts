import type { TextStyle } from 'react-native';
import { fontFamily } from './fonts';
import { typography } from '../theme';

/**
 * DirApp / Stitch — Rubik text presets (plan §1.2). Combine with local colors.
 */
export const dirType = {
  display: {
    fontFamily: fontFamily.extrabold,
    fontSize: typography.size.display,
    lineHeight: 32,
  } as TextStyle,
  hero: {
    fontFamily: fontFamily.bold,
    fontSize: typography.size.hero,
    lineHeight: 28,
  } as TextStyle,
  title: {
    fontFamily: fontFamily.bold,
    fontSize: typography.size.title,
    lineHeight: 26,
  } as TextStyle,
  heading: {
    fontFamily: fontFamily.semibold,
    fontSize: typography.size['3xl'],
    lineHeight: 24,
  } as TextStyle,
  subhead: {
    fontFamily: fontFamily.semibold,
    fontSize: typography.size.xl,
    lineHeight: 22,
  } as TextStyle,
  body: {
    fontFamily: fontFamily.regular,
    fontSize: typography.size.body,
    lineHeight: 20,
  } as TextStyle,
  label: {
    fontFamily: fontFamily.medium,
    fontSize: typography.size.md,
    lineHeight: 16,
  } as TextStyle,
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 14,
  } as TextStyle,
  micro: {
    fontFamily: fontFamily.medium,
    fontSize: typography.size.xs,
    lineHeight: 12,
  } as TextStyle,
} as const;
