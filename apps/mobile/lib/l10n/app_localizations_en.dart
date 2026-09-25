// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'ParkSmart';

  @override
  String get welcomeTitle => 'Smart Parking in Pakistan';

  @override
  String get welcomeSubtitle =>
      'Reserve parking slots, get instant QR tickets, and park hassle-free.';

  @override
  String get login => 'Log In';

  @override
  String get signup => 'Sign Up';

  @override
  String get guestBrowse => 'Browse as Guest';

  @override
  String get phoneLabel => 'Phone Number (+92)';

  @override
  String get passwordLabel => 'Password';

  @override
  String get nameLabel => 'Full Name';

  @override
  String get emailLabel => 'Email (Optional)';

  @override
  String get verifyOtpTitle => 'Verify Phone Number';

  @override
  String get enterCodeMsg => 'Enter the 6-digit OTP code sent to your phone.';

  @override
  String get resendOtp => 'Resend OTP';

  @override
  String get confirm => 'Confirm';

  @override
  String get myBookings => 'My Bookings';

  @override
  String get activeTicket => 'Active QR Ticket';

  @override
  String get available => 'Available';

  @override
  String get reserved => 'Reserved';

  @override
  String get occupied => 'Occupied';

  @override
  String get unavailable => 'Unavailable';

  @override
  String get payNow => 'Pay Now';

  @override
  String get cancelBooking => 'Cancel Booking';

  @override
  String get scanQr => 'Scan QR Code';

  @override
  String get manualCode => 'Manual Code Lookup';
}
