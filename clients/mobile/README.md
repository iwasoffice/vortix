# Vortix mobile
Expo/React Native source for Android and iOS. Credentials are stored with Expo SecureStore. Configure final bundle identifiers, icons, privacy text, EAS project IDs and store metadata before production submission.

```bash
npm install
npx expo start
# signed builds
npx eas build --platform all --profile production
```
