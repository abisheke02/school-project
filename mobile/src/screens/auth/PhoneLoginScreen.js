import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';

const PhoneLoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    const cleaned = phone.trim().replace(/\s/g, '');

    // Indian phone number validation (+91 followed by 10 digits)
    if (!/^\+91[6-9]\d{9}$/.test(cleaned)) {
      Alert.alert('Invalid number', 'Enter a valid Indian mobile number (+91XXXXXXXXXX)');
      return;
    }

    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(cleaned);
      navigation.navigate('OTPVerify', { phone: cleaned, confirmation });
    } catch (err) {
      console.error('OTP send error:', err);
      Alert.alert('Error', 'Could not send OTP. Check your number and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>LD Support</Text>
        <Text style={styles.tagline}>Learning made easier for every child</Text>

        <Text style={styles.label}>Enter your mobile number</Text>
        <View style={styles.phoneRow}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+91</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="9876543210"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone.replace('+91', '')}
            onChangeText={(t) => setPhone('+91' + t.replace(/\D/g, ''))}
            accessibilityLabel="Mobile number input"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendOTP}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Send OTP"
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.buttonText}>Send OTP</Text>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          We'll send a one-time password to verify your number. No email needed.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 32, fontWeight: '800', color: '#1565C0', textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 15, color: '#546E7A', textAlign: 'center', marginBottom: 48 },
  label: { fontSize: 16, color: '#263238', fontWeight: '600', marginBottom: 12 },
  phoneRow: { flexDirection: 'row', marginBottom: 24 },
  countryCode: {
    backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#90CAF9',
    borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center',
    marginRight: 8, minWidth: 64,
  },
  countryCodeText: { fontSize: 16, color: '#1565C0', fontWeight: '700' },
  input: {
    flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#90CAF9',
    borderRadius: 10, paddingHorizontal: 16, fontSize: 18, color: '#263238',
    minHeight: 52,
  },
  button: {
    backgroundColor: '#1976D2', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', minHeight: 54,
  },
  buttonDisabled: { backgroundColor: '#90CAF9' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  disclaimer: { marginTop: 24, fontSize: 13, color: '#78909C', textAlign: 'center', lineHeight: 20 },
});

export default PhoneLoginScreen;
