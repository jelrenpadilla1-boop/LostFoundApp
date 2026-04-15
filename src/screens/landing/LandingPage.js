import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext'; // ← ADD THIS

const FEATURES = [
  {
    icon: 'brain',
    title: 'AI Smart Matching',
    body: 'Advanced algorithms match lost and found items with 95% accuracy',
    accent: '#e50914',
  },
  {
    icon: 'bell',
    title: 'Instant Alerts',
    body: 'Get notified immediately when potential matches are found',
    accent: '#e50914',
  },
  {
    icon: 'map-pin',
    title: 'Interactive Map',
    body: 'Visualize lost and found hotspots in your area',
    accent: '#e50914',
  },
  {
    icon: 'shield',
    title: 'Privacy First',
    body: 'Your contact info stays hidden until you confirm a match',
    accent: '#e50914',
  },
];

const STATS = [
  { value: '12K+', label: 'Items Reunited' },
  { value: '~19h', label: 'Avg. Response' },
  { value: '99%', label: 'Satisfaction' },
  { value: '800+', label: 'Cities' },
];

const TESTIMONIALS = [
  {
    quote: '"I left my backpack at a coffee shop in Austin. Within 6 hours Foundify matched me with someone who found it. Incredibly smooth and fast!"',
    author: 'Samira K.',
    location: 'Austin, TX',
    initial: 'SK',
  },
  {
    quote: '"Found a wallet with no ID, posted it on Foundify. The owner messaged me the same day — she was so thankful. This platform is truly magical."',
    author: 'Marcus L.',
    location: 'Brooklyn, NY',
    initial: 'ML',
  },
];

export default function LandingPage({ navigation }) {
  const { isDark, toggleTheme } = useTheme(); // ← USE THIS INSTEAD

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Nav ── */}
        <View style={[styles.nav, { paddingTop: Platform.OS === 'ios' ? 56 : 44 }]}>
          <TouchableOpacity style={styles.navBrand} activeOpacity={0.7} onPress={() => {}}>
            <Feather name="compass" size={24} color="#e50914" />
            <Text style={[styles.navLogo, { color: theme.text }]}>
              Found<Text style={styles.navLogoAccent}>ify</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.navActions}>
            <TouchableOpacity
              style={styles.themeToggle}
              activeOpacity={0.8}
              onPress={toggleTheme} // ← USE TOGGLE FROM CONTEXT
            >
              <Feather name={isDark ? 'sun' : 'moon'} size={18} color="#e50914" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navSignIn, { borderColor: theme.border }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={[styles.navSignInText, { color: theme.textSecondary }]}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navJoin}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.navJoinText}>Join Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Hero Section ── */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={isDark ? ['rgba(229,9,20,0.3)', 'transparent'] : ['rgba(229,9,20,0.08)', 'transparent']}
            style={styles.heroGradientTop}
          />
          <LinearGradient
            colors={isDark ? ['transparent', theme.background] : ['transparent', theme.background]}
            style={styles.heroGradientBottom}
          />

          <View style={styles.heroBlob} />

          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Feather name="star" size={11} color="#e50914" />
              <Text style={styles.heroBadgeText}>LIMITED TIME</Text>
            </View>

            <Text style={[styles.heroHeadline, { color: theme.text }]}>
              Lost something? <Text style={styles.heroHeadlineAccent}>Find it fast</Text> with Foundify
            </Text>
            <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
              Join thousands of users who have reunited with their lost items. Smart matching, real-time alerts, and a community that cares.
            </Text>

            <TouchableOpacity
              style={styles.heroCta}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.heroCtaText}>Get Started Free</Text>
              <Feather name="chevron-right" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.heroSecondary, { color: theme.textMuted }]}>
                Already have an account?{' '}
                <Text style={styles.heroSecondaryLink}>Sign In →</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stats Section ── */}
        <View style={[styles.statsSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.statsRow}>
            {STATS.map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Features Section ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>Why Choose Foundify</Text>
        </View>

        <View style={styles.featuresGrid}>
          {FEATURES.map((feature, index) => (
            <FeatureCard key={index} feature={feature} theme={theme} />
          ))}
        </View>

        {/* ── Testimonials Section ── */}
        <View style={styles.section}>
          <View style={styles.testimonialsHeader}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Success Stories</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={[styles.sectionLink, { color: theme.textMuted }]}>
                Read More <Feather name="chevron-right" size={14} color={theme.textMuted} />
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.testimonialsGrid}>
          {TESTIMONIALS.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} theme={theme} />
          ))}
        </View>

        {/* ── CTA Banner ── */}
        <LinearGradient
          colors={['#e50914', '#b20710']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaBanner}
        >
          <Text style={styles.ctaTitle}>Start Your Journey Today</Text>
          <Text style={styles.ctaSubtitle}>Join over 12,000 users who have already reunited with their lost items</Text>
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.ctaButtonText}>Get Started Free</Text>
            <Feather name="chevron-right" size={18} color="#e50914" />
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Footer ── */}
        <View style={[styles.footer, { backgroundColor: theme.footer, borderColor: theme.border }]}>
          <View style={styles.footerGrid}>
            <View style={styles.footerCol}>
              <View style={styles.footerBrand}>
                <Feather name="compass" size={18} color="#e50914" />
                <Text style={[styles.footerLogo, { color: theme.text }]}>Foundify</Text>
              </View>
            </View>
            <View style={styles.footerCol}>
              <Text style={[styles.footerTitle, { color: theme.text }]}>Navigate</Text>
              <TouchableOpacity><Text style={[styles.footerLink, { color: theme.textMuted }]}>Home</Text></TouchableOpacity>
              <TouchableOpacity><Text style={[styles.footerLink, { color: theme.textMuted }]}>Browse</Text></TouchableOpacity>
              <TouchableOpacity><Text style={[styles.footerLink, { color: theme.textMuted }]}>Map</Text></TouchableOpacity>
            </View>
            <View style={styles.footerCol}>
              <Text style={[styles.footerTitle, { color: theme.text }]}>Support</Text>
              <TouchableOpacity><Text style={[styles.footerLink, { color: theme.textMuted }]}>Help Center</Text></TouchableOpacity>
              <TouchableOpacity><Text style={[styles.footerLink, { color: theme.textMuted }]}>Contact</Text></TouchableOpacity>
              <TouchableOpacity><Text style={[styles.footerLink, { color: theme.textMuted }]}>Privacy</Text></TouchableOpacity>
            </View>
            <View style={styles.footerCol}>
              <Text style={[styles.footerTitle, { color: theme.text }]}>Connect</Text>
              <View style={styles.socialIcons}>
                <TouchableOpacity style={styles.socialIcon}><Feather name="facebook" size={18} color={theme.textMuted} /></TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon}><Feather name="twitter" size={18} color={theme.textMuted} /></TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon}><Feather name="instagram" size={18} color={theme.textMuted} /></TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon}><Feather name="linkedin" size={18} color={theme.textMuted} /></TouchableOpacity>
              </View>
            </View>
          </View>
          <Text style={[styles.copyright, { color: theme.textMuted }]}>
            © 2024 Foundify. All rights reserved. Making reunions happen.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Components
function FeatureCard({ feature, theme }) {
  return (
    <View style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.featureIconBlock, { backgroundColor: feature.accent + '15' }]}>
        <View style={[styles.featureIconInner, { backgroundColor: feature.accent + '25' }]}>
          <Feather name={feature.icon} size={28} color={feature.accent} />
        </View>
      </View>
      <View style={styles.featureBody}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{feature.title}</Text>
        <Text style={[styles.featureText, { color: theme.textMuted }]}>{feature.body}</Text>
      </View>
    </View>
  );
}

function TestimonialCard({ testimonial, theme }) {
  return (
    <View style={[styles.testimonialCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.stars}>
        {[...Array(5)].map((_, i) => (
          <Feather key={i} name="star" size={14} color="#ffd700" fill="#ffd700" />
        ))}
      </View>
      <Text style={[styles.testimonialQuote, { color: theme.textSecondary }]}>{testimonial.quote}</Text>
      <View style={styles.testimonialAuthor}>
        <View style={styles.authorAvatar}>
          <Text style={styles.authorInitial}>{testimonial.initial}</Text>
        </View>
        <View>
          <Text style={[styles.authorName, { color: theme.text }]}>{testimonial.author}</Text>
          <Text style={[styles.authorLocation, { color: theme.textMuted }]}>{testimonial.location}</Text>
        </View>
      </View>
    </View>
  );
}

// Themes
const darkTheme = {
  background: '#141414',
  card: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#e5e5e5',
  textMuted: '#b3b3b3',
  border: '#333333',
  footer: '#0a0a0a',
};

const lightTheme = {
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#333333',
  textMuted: '#666666',
  border: '#e0e0e0',
  footer: '#f8f8f8',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  /* ── Nav ── */
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navLogo: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  navLogoAccent: {
    color: '#e50914',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(229,9,20,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSignIn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  navSignInText: {
    fontSize: 13,
    fontWeight: '600',
  },
  navJoin: {
    backgroundColor: '#e50914',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 4,
  },
  navJoinText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* ── Hero ── */
  heroWrap: {
    minHeight: 520,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 60,
    overflow: 'hidden',
  },
  heroGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  heroGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  heroBlob: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(229,9,20,0.08)',
    top: -40,
    alignSelf: 'center',
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(229,9,20,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.4)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 24,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e50914',
    letterSpacing: 1,
  },
  heroHeadline: {
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 46,
    marginBottom: 18,
  },
  heroHeadlineAccent: {
    color: '#e50914',
  },
  heroSub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 300,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e50914',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 4,
    marginBottom: 20,
  },
  heroCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  heroSecondary: {
    fontSize: 13,
  },
  heroSecondaryLink: {
    color: '#e50914',
    fontWeight: '600',
  },

  /* ── Stats Section ── */
  statsSection: {
    marginVertical: 16,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#e50914',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Sections ── */
  section: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  sectionHeading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  testimonialsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* ── Features Grid ── */
  featuresGrid: {
    paddingHorizontal: 24,
    gap: 16,
  },
  featureCard: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 0,
  },
  featureIconBlock: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBody: {
    padding: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 18,
  },

  /* ── Testimonials ── */
  testimonialsGrid: {
    paddingHorizontal: 24,
    gap: 16,
  },
  testimonialCard: {
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 12,
  },
  testimonialQuote: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  testimonialAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
  },
  authorLocation: {
    fontSize: 11,
  },

  /* ── CTA Banner ── */
  ctaBanner: {
    marginHorizontal: 24,
    marginVertical: 32,
    padding: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  ctaButtonText: {
    color: '#e50914',
    fontSize: 14,
    fontWeight: '700',
  },

  /* ── Footer ── */
  footer: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderTopWidth: 1,
  },
  footerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    marginBottom: 24,
  },
  footerCol: {
    flex: 1,
    minWidth: 120,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLogo: {
    fontSize: 16,
    fontWeight: '700',
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerLink: {
    fontSize: 12,
    marginBottom: 8,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyright: {
    fontSize: 11,
    textAlign: 'center',
  },
});