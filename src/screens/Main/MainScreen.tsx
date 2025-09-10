import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableHighlight, useColorScheme, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText, useTheme } from "../../theme/Theme";
import LINKS from '../../config/Links';
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

const MainScreen = () => {
  const navigation = useNavigation();
  const safeAreaInsets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isLargeScreen = useWindowDimensions().width > 600;

  const [source, setSource] = React.useState({
    uri: '', 
  })
  useEffect(() => {
    if (source.uri?.length > 0) {
      navigation.navigate('View', { source });
    }
  }, [source]);

  return (
    <View style={styles.appContainer}>
      <View
        style={{
          backgroundColor: colors.background,
          paddingTop: safeAreaInsets.top,
          paddingLeft: safeAreaInsets.left,
          paddingRight: safeAreaInsets.right,
          flex: 1,
        }}>
        <ScrollView style={{ paddingBottom: safeAreaInsets.bottom }}>
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image
                  style={styles.logo}
                  source={require('../../assets/img/logo.jpg')}
                />
              </View>
              <ThemedText style={styles.title}>
                Добро пожаловать в Интеграм!
              </ThemedText>
              {/* <ThemedText
                style={[
                  styles.callout,
                  { backgroundColor: colors.backgroundHighlight },
                ]}>
                💡&ensp;Open{' '}
                <Text style={styles.calloutEmphasis}>{templateFileName}</Text> to
                get started
              </ThemedText> */}
            </View>
            <View style={styles.linksContainer}>
              <ThemedText style={styles.linksTitle}>Выберите домен вашего приложения:</ThemedText>
              {LINKS.map(({ title, description, url }, i) => (
                <TouchableHighlight
                  key={i}
                  activeOpacity={0.6}
                  underlayColor={colors.background}
                  onPress={() => setSource({ uri: url })}
                  style={[
                    styles.link,
                    // eslint-disable-next-line react-native/no-inline-styles
                    {
                      maxWidth: isLargeScreen ? 240 : 360,
                      borderColor: colors.cardOutline,
                      backgroundColor: colors.cardBackground,
                    },
                  ]}>
                  <View>
                    <ThemedText style={styles.linkText}>{title}</ThemedText>
                    {/* <ThemedText style={{ color: colors.textSecondary }}>
                      {description}
                    </ThemedText> */}
                  </View>
                </TouchableHighlight>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: 64,
    marginBottom: 48,
  },
  logoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  logo: {
    height: 80,
    aspectRatio: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  callout: {
    width: '100%',
    maxWidth: 320,
    marginTop: 36,
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingLeft: 16,
    borderRadius: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  calloutEmphasis: {
    fontWeight: 'bold',
  },
  linksContainer: {
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 12,
    rowGap: 12,
    maxWidth: 800,
    marginBottom: 48,
  },
  linksTitle: {
    width: '100%',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  link: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    boxShadow: '0 4px 8px rgba(0, 0, 0, .03)',
  },
  linkText: {
    marginBottom: 4,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MainScreen;