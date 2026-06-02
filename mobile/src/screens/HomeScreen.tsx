import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  Image,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { usePersonaIsLandlord } from '../navigation/AdminAppModeContext';
import { C } from '../theme';
import { dirType } from '../theme/textStyles';
import { fontFamily } from '../theme/fonts';
import { useDirection } from '../hooks/useDirection';
import { dirApp } from '../theme/dirAppTokens';
import SwipeHouseLogo from '../components/SwipeHouseLogo';
import { useColors } from '../context/ThemeContext';
import { fontFamily } from '../theme/fonts';

const { width: W } = Dimensions.get('window');
const PAD = 16;
const GAP = 16;
const INNER_W = W - PAD * 2;
const HALF_TILE = (INNER_W - GAP) / 2;

const TILE_SIZE = (W - 48 - 16) / 2;

const LANDLORD_SERVICES = [
  { id: 'Dashboard', label: 'Dashboard', subLabel: 'Stats & overview', icon: 'stats-chart-outline' as const, color: dirApp.primary, glow: `${dirApp.primary}33` },
  { id: 'Matches', label: 'Chats', subLabel: 'Tenant messages', icon: 'chatbubbles-outline' as const, color: C.accent.violet, glow: C.violetAlpha(0.22) },
  { id: 'Leads', label: 'Leads', subLabel: 'Interested tenants', icon: 'people-outline' as const, color: C.coral, glow: C.coralAlpha(0.25) },
  { id: 'Listings', label: 'Listings', subLabel: 'Your properties', icon: 'list-outline' as const, color: C.cyan, glow: C.cyanAlpha(0.25) },
  { id: 'Profile', label: 'Profile', subLabel: 'Account settings', icon: 'person-outline' as const, color: C.success, glow: C.successAlpha(0.2) },
] as const;

type LandlordService = (typeof LANDLORD_SERVICES)[number];

function ServiceTile({ service, onPress, colors }: { service: LandlordService; onPress: () => void; colors: import('../context/ThemeContext').AppColors }) {
  const scale = useRef(new Animated.Value(1)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;
  const floatLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startFloat = useCallback(() => {
    floatLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, { toValue: -5, duration: 600, useNativeDriver: true }),
        Animated.timing(iconFloat, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    );
    floatLoop.current.start();
  }, [iconFloat]);

  const stopFloat = useCallback(() => {
    floatLoop.current?.stop();
    Animated.spring(iconFloat, { toValue: 0, useNativeDriver: true, ...C.duration.spring }).start();
  }, [iconFloat]);

  const handlePressIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, tension: 200, friction: 10 }).start();
    startFloat();
  }, [scale, startFloat]);

  const handlePressOut = useCallback(() => {
    stopFloat();
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...C.duration.spring }).start();
  }, [scale, stopFloat]);

  return (
    <Animated.View style={[landlordStyles.tileWrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[landlordStyles.tile, { backgroundColor: colors.bgCard }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={service.label}
        accessibilityHint={service.subLabel}
      >
        <Animated.View
          style={[
            landlordStyles.iconContainer,
            { backgroundColor: service.color, transform: [{ translateY: iconFloat }] },
          ]}
        >
          <View style={[landlordStyles.iconGlow, { backgroundColor: service.glow }]} />
          <Ionicons name={service.icon} size={28} color={C.onInverse.primary} />
        </Animated.View>
        <Text style={[landlordStyles.tileLabel, { color: colors.text }]}>{service.label}</Text>
        <Text style={[landlordStyles.tileSubLabel, { color: colors.textMut }]}>{service.subLabel}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const DEMO_SAVED = [
  {
    id: '1',
    title: 'דופלקס רוטשילד',
    price: '₪8,500',
    area: 'תל אביב, מרכז',
    tags: ['3 חדרים', 'מעלית'],
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBVbV2vmWqS9tOO5s3lm5ckxvFOqcrBqsVJgXm_autcKjrvL3tPfdz-Qh3I-qO2bstzwO4JtrTcpmkxOd20__ZhPON6Eeyxs-SxZnUxhyfQa2We00kSnptNFc439DKmoKc4LWCE53667sKuqAfyiUu1-EbmNyzCnJANLZnXyLQ3kNKnG_Egk_DT38iQj8X6V9dtEsLIYBytPv_JLqi6usGbf4_RFxpXXeRYkr7T5gUZBZZldffaalKVScX2SvKdLLBcixHmbx8EWvrN',
  },
  {
    id: '2',
    title: 'לופט פלורנטין',
    price: '₪6,200',
    area: 'תל אביב, דרום',
    tags: ['סטודיו', 'משופץ'],
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDrz2t56IlAhhripzF7qlUKrzOYvoPBsVNqHuI0v0tUfmsgSv9hsM0AA7PH_Ye_UPI07Em-tU1_bKzRLsq8yVWSSt4QHKmEMFDl0qIJoil6VUOrH5ggbhav4nQm922YTXYmf2DdD7faFkuOfsYEF0sCl0E6GQ_6noCyF9CUnaTAxCA2nsehBEj_1M9Xdd5GcqvI4TK-NUU0-lYBVTMBM7SOoDONeuPTP6dgLJQiR0sgKiVUoZwcN7vJtctjx3_GpV7M5uuG_YWCSSzt',
  },
] as const;

function TenantHome() {
  const colors = useColors();
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const { flexRow, textAlign } = useDirection();
  const firstName = user?.firstName ?? 'שם';

  const go = (route: string) => {
    Haptics.selectionAsync();
    navigation.navigate(route);
  };

  return (
    <ScrollView
      contentContainerStyle={[tenantStyles.scrollContent, { backgroundColor: colors.bg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar — סטיקי מובנה דרך SafeArea; צל קל */}
      <View style={[tenantStyles.topBar, { flexDirection: flexRow }]}>
        <TouchableOpacity
          style={tenantStyles.iconBtn}
          onPress={() => go('Profile')}
          accessibilityRole="button"
          accessibilityLabel="תפריט פרופיל"
        >
          <Ionicons name="menu-outline" size={24} color={dirApp.primary} />
        </TouchableOpacity>
        <Text style={[tenantStyles.brandWordmark, dirType.heading, { color: dirApp.primary }]}>DirApp</Text>
        <TouchableOpacity
          style={tenantStyles.avatarRing}
          onPress={() => go('Profile')}
          accessibilityRole="button"
          accessibilityLabel="פרופיל"
        >
          <Text style={[tenantStyles.avatarLetter, dirType.label]}>{firstName.charAt(0)}</Text>
        </TouchableOpacity>
      </View>

      {/* Welcome */}
      <View style={tenantStyles.welcomeBlock}>
        <Text style={[tenantStyles.welcomeTitle, dirType.hero, { color: dirApp.primary, textAlign }]}>
          ברוך שובך, {firstName}
        </Text>
        <Text style={[tenantStyles.welcomeSub, dirType.body, { color: dirApp.outline, textAlign }]}>
          החיפוש שלך הושלם בכ־65%. יש לך 4 התאמות חדשות היום!
        </Text>
      </View>

      {/* Renter Journal Card */}
      <Pressable
        style={[tenantStyles.journalHero, { width: INNER_W }]}
        onPress={() => go('RenterJournal')}
        accessibilityRole="button"
        accessibilityLabel="יומן השכירות שלי"
      >
        <View style={tenantStyles.journalHeroContent}>
          <View style={{ flexDirection: flexRow, alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="calendar-outline" size={24} color={C.onInverse.primary} />
            <Text style={[tenantStyles.journalHeroTitle, dirType.subhead, { color: C.onInverse.primary }]}>
              יומן השכירות שלי
            </Text>
          </View>
          <Text style={[tenantStyles.journalHeroSub, dirType.caption, { color: C.onInverse.secondary }]}>
            ציר זמן של הדירה שלך: חוזה, תשלומים, צ'ק-אין, תקלות וצ'ק-אאוט.
          </Text>
          <View style={[tenantStyles.ctaSecondary, { flexDirection: flexRow }]}>
            <Text style={[tenantStyles.ctaSecondaryText, dirType.label, { color: dirApp.primary }]}>
              לצפייה בציר הזמן
            </Text>
            <Ionicons name="chevron-back-outline" size={16} color={dirApp.primary} />
          </View>
        </View>
        <View style={tenantStyles.decorJournal} pointerEvents="none">
          <Ionicons name="journal-outline" size={120} color={C.onInverse.faint} />
        </View>
      </Pressable>


      {/* Bento — חיפוש רחב */}
      <Pressable
        style={[tenantStyles.searchHero, { width: INNER_W }]}
        onPress={() => go('Search')}
        accessibilityRole="button"
        accessibilityLabel="חיפוש דירות"
      >
        <View style={tenantStyles.searchHeroContent}>
          <Ionicons name="search-outline" size={48} color={C.onInverse.primary} />
          <Text style={[tenantStyles.searchHeroTitle, dirType.subhead, { color: C.onInverse.primary }]}>
            חיפוש
          </Text>
          <Text style={[tenantStyles.searchHeroSub, dirType.caption, { color: C.onInverse.muted }]}>
            מצא את הבית הבא בשכונות המובילות בתל אביב.
          </Text>
          <View style={tenantStyles.ctaMint}>
            <Text style={[tenantStyles.ctaMintText, dirType.label, { color: dirApp.onSecondaryContainer }]}>
              גלו מודעות
            </Text>
          </View>
        </View>
        <View style={tenantStyles.decorApartment} pointerEvents="none">
          <Ionicons name="business-outline" size={160} color={C.onInverse.faint} />
        </View>
      </Pressable>

      {/* שורת סוויפ + מפה */}
      <View style={[tenantStyles.rowPair, { flexDirection: flexRow }]}>
        <Pressable
          style={[tenantStyles.smallTile, { width: HALF_TILE }]}
          onPress={() => go('Swipe')}
        >
          <View style={[tenantStyles.smallIconCircle, { backgroundColor: `${dirApp.secondaryContainer}4D` }]}>
            <Ionicons name="albums-outline" size={22} color={dirApp.onSecondaryContainer} />
          </View>
          <Text style={[tenantStyles.smallTileTitle, dirType.label, { color: dirApp.primary }]}>סוויפ</Text>
          <Text style={[tenantStyles.smallTileSub, dirType.micro, { color: dirApp.outline }]}>התאמה מהירה</Text>
        </Pressable>
        <Pressable
          style={[tenantStyles.smallTile, { width: HALF_TILE }]}
          onPress={() => go('Map')}
        >
          <View style={[tenantStyles.smallIconCircle, { backgroundColor: 'rgba(255, 221, 186, 0.35)' }]}>
            <Ionicons name="map-outline" size={22} color="#633F0F" />
          </View>
          <Text style={[tenantStyles.smallTileTitle, dirType.label, { color: dirApp.primary }]}>מפת אזורים</Text>
          <Text style={[tenantStyles.smallTileSub, dirType.micro, { color: dirApp.outline }]}>לפי שכונה</Text>
        </Pressable>
      </View>

      {/* שותפים */}
      <Pressable style={[tenantStyles.roommateBand, { width: INNER_W }]} onPress={() => navigation.navigate('Roommate')}>
        <View style={{ flex: 1 }}>
          <Text style={[tenantStyles.roommateTitle, dirType.subhead, { color: C.onInverse.primary }]}>
            חיפוש שותפים
          </Text>
          <Text style={[tenantStyles.roommateSub, dirType.caption, { color: C.onInverse.secondary }]}>
            התחברו לאנשים בסגנון חיים ותקציב דומים.
          </Text>
        </View>
        <View style={[tenantStyles.avatarStack, { flexDirection: flexRow }]}>
          <View style={[tenantStyles.miniAv, { borderColor: dirApp.secondary }]}>
            <Ionicons name="person" size={20} color={C.onInverse.primary} />
          </View>
          <View style={[tenantStyles.miniAv, tenantStyles.miniAvOverlap, { borderColor: dirApp.secondary }]}>
            <Ionicons name="person" size={20} color={C.onInverse.primary} />
          </View>
        </View>
        <View style={tenantStyles.decorGroups} pointerEvents="none">
          <Ionicons name="people-outline" size={88} color={C.onInverse.faint} />
        </View>
      </Pressable>

      {/* שמורים */}
      <View style={tenantStyles.savedHeader}>
        <Text style={[tenantStyles.savedHeading, dirType.heading, { color: dirApp.primary }]}>שמורים למועד פנוי</Text>
        <TouchableOpacity style={[tenantStyles.viewAllRow, { flexDirection: flexRow }]} onPress={() => go('Matches')}>
          <Text style={[tenantStyles.viewAll, dirType.label, { color: dirApp.secondary }]}>הכל</Text>
          <Ionicons name="chevron-back" size={16} color={dirApp.secondary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[tenantStyles.savedScroll, { flexDirection: flexRow }]}
      >
        {DEMO_SAVED.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[tenantStyles.savedCard, { width: 280, backgroundColor: colors.bgCard, borderColor: colors.border }]}
            activeOpacity={0.9}
            onPress={() => go('Search')}
          >
            <View style={tenantStyles.savedImageWrap}>
              <Image source={{ uri: item.image }} style={tenantStyles.savedImage} resizeMode="cover" />
              <View style={tenantStyles.favBadge}>
                <Ionicons name="heart" size={18} color={C.danger} />
              </View>
            </View>
            <View style={tenantStyles.savedBody}>
              <View style={[tenantStyles.savedRow, { flexDirection: flexRow }]}>
                <Text style={[tenantStyles.savedTitle, dirType.label, { color: dirApp.primary }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[tenantStyles.savedPrice, dirType.label, { color: dirApp.secondary }]}>{item.price}</Text>
              </View>
              <View style={[tenantStyles.locRow, { flexDirection: flexRow }]}>
                <Ionicons name="location-outline" size={14} color={dirApp.outline} />
                <Text style={[tenantStyles.locText, dirType.caption, { color: dirApp.outline }]}>{item.area}</Text>
              </View>
              <View style={[tenantStyles.tagRow, { flexDirection: flexRow }]}>
                {item.tags.map((t) => (
                  <View key={t} style={tenantStyles.tag}>
                    <Text style={[tenantStyles.tagText, dirType.micro, { color: dirApp.onSecondaryContainer }]}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* תובנות שוק */}
      <View style={[tenantStyles.insightCard, { width: INNER_W }]}>
        <View style={{ flex: 1 }}>
          <Text style={[tenantStyles.insightTitle, dirType.subhead, { color: dirApp.primary, textAlign }]}>
            תובנות שוק
          </Text>
          <Text style={[tenantStyles.insightBody, dirType.body, { color: dirApp.outline, textAlign }]}>
            המחירים במרכז תל אביב עלו בכ־4% החודש. ייתכן שזה זמן טוב לסגור עסקה.
          </Text>
        </View>
        <View style={tenantStyles.insightStat}>
          <Text style={[tenantStyles.statBig, dirType.display, { color: dirApp.secondary }]}>₪45k</Text>
          <Text style={[tenantStyles.statCap, dirType.micro, { color: dirApp.outline }]}>מחיר ממוצע למ״ר</Text>
        </View>
      </View>
    </ScrollView>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const isLandlord = usePersonaIsLandlord();
  const greeting = getGreeting();

  function handleServicePress(id: string) {
    Haptics.selectionAsync();
    navigation.navigate(id);
  }

  if (!isLandlord) {
    return (
      <SafeAreaView style={[tenantStyles.safe, { backgroundColor: colors.bg }]}>
        <TenantHome />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[landlordStyles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={landlordStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={landlordStyles.header}>
          <SwipeHouseLogo size="sm" />
          <View style={landlordStyles.headerTextBlock}>
            <Text style={[landlordStyles.greeting, { color: colors.textMut }]}>{greeting}</Text>
            <Text style={landlordStyles.username}>{user?.firstName ?? 'Landlord'} 👋</Text>
          </View>
          <View style={landlordStyles.headerBadge}>
            <Ionicons name="notifications-outline" size={22} color={dirApp.primary} />
          </View>
        </View>

        <View style={[landlordStyles.heroCard, { backgroundColor: colors.bgCard }]}>
          <Text style={landlordStyles.heroTitle}>Manage your properties</Text>
          <Text style={[landlordStyles.heroSub, { color: colors.textSub }]}>Track leads, manage listings, and connect with tenants.</Text>
          <View style={landlordStyles.heroPill}>
            <View style={[landlordStyles.heroDot, { backgroundColor: C.cyan }]} />
            <Text style={landlordStyles.heroPillText}>Landlord Dashboard</Text>
          </View>
        </View>

        <Text style={[landlordStyles.sectionLabel, { color: colors.textMut }]}>Services</Text>

        <View style={landlordStyles.grid}>
          {LANDLORD_SERVICES.map((service) => (
            <ServiceTile key={service.id} service={service} onPress={() => handleServicePress(service.id)} colors={colors} />
          ))}
        </View>

        <View style={landlordStyles.tipCard}>
          <Ionicons name="information-circle-outline" size={18} color={C.cyan} />
          <Text style={[landlordStyles.tipText, { color: colors.textSub }]}>Tip: Verified listings get 3× more views.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

const tenantStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dirApp.background },
  scrollContent: {
    paddingHorizontal: PAD,
    paddingBottom: 110,
    paddingTop: 8,
    backgroundColor: dirApp.background,
  },
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 4,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 999,
  },
  brandWordmark: {},
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: `${dirApp.primary}1A`,
    backgroundColor: dirApp.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: dirApp.primary },
  welcomeBlock: { marginBottom: 24 },
  welcomeTitle: { fontFamily: fontFamily.bold, marginBottom: 6 },
  welcomeSub: { fontFamily: fontFamily.regular },
  journalHero: {
    alignSelf: 'center',
    backgroundColor: dirApp.primaryContainer,
    borderRadius: 12,
    marginBottom: GAP,
    minHeight: 140,
    overflow: 'hidden',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  journalHeroContent: { zIndex: 2, flex: 1, justifyContent: 'center' },
  journalHeroTitle: { fontFamily: fontFamily.bold, fontWeight: 'bold' },
  journalHeroSub: { fontFamily: fontFamily.regular, marginBottom: 12, maxWidth: 280, lineHeight: 18 },
  ctaSecondary: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  ctaSecondaryText: { fontWeight: '600' },
  decorJournal: {
    position: 'absolute',
    left: -20,
    bottom: -20,
    opacity: 0.15,
    transform: [{ rotate: '-15deg' }],
    zIndex: 1,
  },
  searchHero: {
    alignSelf: 'center',
    backgroundColor: dirApp.primary,
    borderRadius: 12,
    marginBottom: GAP,
    minHeight: INNER_W * 0.92,
    overflow: 'hidden',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  searchHeroContent: { zIndex: 2, flex: 1, justifyContent: 'flex-start' },
  searchHeroTitle: { marginTop: 12, marginBottom: 4 },
  searchHeroSub: { marginBottom: 20, maxWidth: 260 },
  ctaMint: {
    alignSelf: 'flex-start',
    backgroundColor: dirApp.secondaryContainer,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  ctaMintText: {},
  decorApartment: {
    position: 'absolute',
    right: -28,
    bottom: -28,
    opacity: 0.2,
    transform: [{ rotate: '12deg' }],
    zIndex: 1,
  },
  rowPair: {
    gap: GAP,
    marginBottom: GAP,
    justifyContent: 'space-between',
  },
  smallTile: {
    backgroundColor: dirApp.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${C.border}55`,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  smallIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  smallTileTitle: { marginBottom: 4 },
  smallTileSub: {},
  roommateBand: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dirApp.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  roommateTitle: { marginBottom: 6 },
  roommateSub: { maxWidth: 200 },
  avatarStack: { gap: 0 },
  miniAv: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  miniAvOverlap: { marginStart: -16 },
  decorGroups: {
    position: 'absolute',
    right: -12,
    top: -12,
    opacity: 0.12,
    zIndex: 0,
  },
  savedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedHeading: {},
  viewAllRow: { alignItems: 'center', gap: 2 },
  viewAll: {},
  savedScroll: { gap: GAP, paddingBottom: 8 },
  savedCard: {
    backgroundColor: dirApp.surfaceContainerLowest,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${C.border}44`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  savedImageWrap: { height: 140, position: 'relative' },
  savedImage: { width: '100%', height: '100%' },
  favBadge: {
    position: 'absolute',
    top: 8,
    end: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    padding: 6,
  },
  savedBody: { padding: 16 },
  savedRow: { justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  savedTitle: { flex: 1 },
  savedPrice: {},
  locRow: { alignItems: 'center', gap: 4, marginBottom: 10 },
  locText: {},
  tagRow: { flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: `${dirApp.secondaryContainer}33`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {},
  insightCard: {
    alignSelf: 'center',
    flexDirection: 'column',
    backgroundColor: dirApp.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${C.border}44`,
    padding: 20,
    gap: 16,
  },
  insightTitle: { marginBottom: 6 },
  insightBody: {},
  insightStat: { alignItems: 'center' },
  statBig: {},
  statCap: { marginTop: 4, letterSpacing: 0.5 },
});

const landlordStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dirApp.background },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    marginBottom: 24,
    gap: 12,
  },
  headerTextBlock: { flex: 1, alignItems: 'flex-end' },
  greeting: { fontSize: 14, color: C.textMut, fontWeight: '400', marginBottom: 2, fontFamily: fontFamily.regular },
  username: { fontSize: 26, color: dirApp.primary, fontWeight: '700', letterSpacing: -0.5, fontFamily: fontFamily.bold },
  headerBadge: {
    width: 44,
    height: 44,
    backgroundColor: C.glass.surfaceBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.glass.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.glass.shadowLight.shadowColor,
    shadowOffset: C.glass.shadowLight.shadowOffset,
    shadowOpacity: C.glass.shadowLight.shadowOpacity,
    shadowRadius: C.glass.shadowLight.shadowRadius,
    elevation: C.glass.shadowLight.elevation,
  },

  heroCard: {
    backgroundColor: C.glass.surfaceBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.glass.surfaceBorder,
    padding: 24,
    marginBottom: 32,
    shadowColor: C.glass.shadowLight.shadowColor,
    shadowOffset: C.glass.shadowLight.shadowOffset,
    shadowOpacity: C.glass.shadowLight.shadowOpacity,
    shadowRadius: C.glass.shadowLight.shadowRadius,
    elevation: C.glass.shadowLight.elevation,
  },
  heroTitle: { fontSize: 20, fontWeight: '700', color: dirApp.primary, marginBottom: 8, letterSpacing: -0.3, fontFamily: fontFamily.bold },
  heroSub: { fontSize: 14, color: C.textSub, lineHeight: 20, marginBottom: 16, fontFamily: fontFamily.regular },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${dirApp.primary}14`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroPillText: { fontSize: 12, fontWeight: '600', color: dirApp.primary, fontFamily: fontFamily.semibold },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.textMut,
    marginBottom: 14,
    fontFamily: fontFamily.bold,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },

  tileWrapper: { width: TILE_SIZE },
  tile: {
    backgroundColor: C.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.glass.surfaceBorder,
    padding: 20,
    alignItems: 'flex-start',
    shadowColor: C.glass.shadowLight.shadowColor,
    shadowOffset: C.glass.shadowLight.shadowOffset,
    shadowOpacity: C.glass.shadowLight.shadowOpacity,
    shadowRadius: C.glass.shadowLight.shadowRadius,
    elevation: C.glass.shadowLight.elevation,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: -20,
    right: -20,
    opacity: 0.6,
  },
  tileLabel: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4, fontFamily: fontFamily.bold },
  tileSubLabel: { fontSize: 12, color: C.textMut, lineHeight: 16, fontFamily: fontFamily.regular },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.cyanAlpha(0.07),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cyanAlpha(0.15),
    padding: 14,
  },
  tipText: { flex: 1, fontSize: 13, color: C.textSub, lineHeight: 18, fontFamily: fontFamily.regular },
});
