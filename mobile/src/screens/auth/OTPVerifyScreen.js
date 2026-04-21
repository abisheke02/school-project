import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import useAuthStore from '../../store/authStore';

const OTP_LENGTH = 6;

const OTPVerifyScreen = ({ route, navigation }) => {
  const { phone, confirmation } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const { login } = useAuthStore();

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) {
      Alert.alert('Enter OTP', `Please enter the ${OTP_LENGTH}-digit code sent to ${phone}`);
      return;
    }

    setLoading(true);
    try {
      // Confirm OTP with Firebase
      const userCredential = await confirmation.confirm(otp);
      const firebaseIdToken = await userCredential.user.getIdToken();

      // Get FCM token for push notifications
      let fcmToken = null;
      try {
        const permission = await messaging().requestPermission();
        if (permission) {
          fcmToken = await messaging().getToken();
        }
      } catch {}

      // Login with our backend
      await login(firebaseIdToken, fcmToken);
      // Navigation handled automatically by AppNavigator based on store state
    } catch (err) {
      console.error('OTP verify error:', err);
      Alert.alert('Wrong OTP', 'The code you entered is incorrect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    navigation.goBack();
  };

  // Render individual OTP boxes
  const renderOTPBoxes = () =>
    Array.from({ length: OTP_LENGTH }).map((_, i) => (
      <View key={i} style={[styles.otpBox, otp[i] ? styles.otpBoxFilled : null]}>
        <Text style={styles.otpChar}>{otp[i] || ''}</Text>
      </View>
    ));

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}<Text style={styles.phone}>{phone}</Text>
      </Text>

      {/* Hidden input captures keyboard input */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={otp}
        onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
        keyboardType="numeric"
        maxLength={OTP_LENGTH}
        autoFocus
        accessibilityLabel="OTP input"
      />

      {/* Visual OTP boxes */}
      <TouchableOpacity style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
        {renderOTPBoxes()}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, (loading || otp.length !== OTP_LENGTH) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading || otp.length !== OTP_LENGTH}
        accessibilityRole="button"
      >
        {loading
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.buttonText}>Verify & Continue</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendBtn} onPress={handleResend}>
        <Text style={styles.resendText}>Didn't receive it? Resend OTP</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF', paddingHorizontal: 28, paddingTop: 60 },
  backBtn: { marginBottom: 32 },
  backText: { fontSize: 16, color: '#1976D2' },
  title: { fontSize: 28, fontWeight: '800', color: '#1565C0', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#546E7A', marginBottom: 40, lineHeight: 24 },
  phone: { fontWeight: '700', color: '#263238' },
  hiddenInput: { position: 'absolute', width: 0, height: 0, opacity: 0 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  otpBox: {
    width: 48, height: 58, borderWidth: 2, borderColor: '#90CAF9',
    borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
  },
  otpBoxFilled: { borderColor: '#1976D2', backgroundColor: '#E3F2FD' },
  otpChar: { fontSize: 24, fontWeight: '700', color: '#1565C0' },
  button: {
    backgroundColor: '#1976D2', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#90CAF9' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  resendBtn: { marginTop: 24, alignItems: 'center' },
  resendText: { color: '#1976D2', fontSize: 15 },
});

export default OTPVerifyScreen;
