import 'package:local_auth/local_auth.dart';

class BiometricHelper {
  static final LocalAuthentication _auth = LocalAuthentication();

  static Future<bool> canAuthenticate() async {
    final isSupported = await _auth.isDeviceSupported();
    final canCheck = await _auth.canCheckBiometrics;
    return isSupported && canCheck;
  }

  static Future<bool> authenticate() async {
    try {
      if (!await canAuthenticate()) return false;

      return await _auth.authenticate(
        localizedReason: 'Autentiquese para acceder a su cuenta',
        biometricOnly: true,
        persistAcrossBackgrounding: true,
      );
    } catch (_) {
      return false;
    }
  }
}
