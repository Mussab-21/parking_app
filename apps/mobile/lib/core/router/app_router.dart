import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/auth_provider.dart';
import '../../features/auth/splash_screen.dart';
import '../../features/auth/welcome_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/signup_screen.dart';
import '../../features/auth/verify_otp_screen.dart';
import '../../features/discovery/home_screen.dart';
import '../../features/discovery/search_screen.dart';
import '../../features/discovery/facility_details_screen.dart';
import '../../features/booking/time_selection_screen.dart';
import '../../features/booking/slot_selection_screen.dart';
import '../../features/booking/booking_summary_screen.dart';
import '../../features/booking/payment_screen.dart';
import '../../features/booking/qr_ticket_screen.dart';
import '../../features/account/my_bookings_screen.dart';
import '../../features/account/profile_screen.dart';
import '../../features/attendant/attendant_home_screen.dart';
import '../../features/attendant/qr_scanner_screen.dart';

class RouterNotifier extends ChangeNotifier {
  final Ref _ref;

  RouterNotifier(this._ref) {
    _ref.listen<AuthState>(
      authProvider,
      (_, __) => notifyListeners(),
    );
  }

  String? redirect(BuildContext context, GoRouterState state) {
    final authState = _ref.read(authProvider);
    final isAuth = authState.status != AuthStatus.unauthenticated;
    final isAttendant = authState.status == AuthStatus.attendant;

    final publicRoutes = [
      '/splash',
      '/welcome',
      '/login',
      '/signup',
      '/verify-otp',
      '/home',
      '/search',
    ];
    final isPublic = publicRoutes.contains(state.matchedLocation) ||
        state.matchedLocation.startsWith('/facility');

    // If user is unauthenticated and tries to access a protected route, send to welcome
    if (!isAuth && !isPublic) {
      return '/welcome';
    }

    // If user is already authenticated and visits login/signup/welcome/splash, send to app home
    final isAuthEntryScreen = state.matchedLocation == '/login' ||
        state.matchedLocation == '/welcome' ||
        state.matchedLocation == '/signup' ||
        state.matchedLocation == '/splash';

    if (isAuth && isAuthEntryScreen) {
      return isAttendant ? '/staff/home' : '/home';
    }

    return null;
  }
}

final routerNotifierProvider = Provider<RouterNotifier>((ref) {
  return RouterNotifier(ref);
});

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = ref.read(routerNotifierProvider);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: notifier,
    redirect: notifier.redirect,
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/welcome', builder: (context, state) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (context, state) => const SignupScreen()),
      GoRoute(path: '/verify-otp', builder: (context, state) => const VerifyOtpScreen()),
      GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
      GoRoute(path: '/search', builder: (context, state) => const SearchScreen()),
      GoRoute(
        path: '/facility/:id',
        builder: (context, state) => FacilityDetailsScreen(facilityId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/book/schedule/:facilityId',
        builder: (context, state) => TimeSelectionScreen(facilityId: state.pathParameters['facilityId']!),
      ),
      GoRoute(
        path: '/book/slots/:facilityId',
        builder: (context, state) => SlotSelectionScreen(
          facilityId: state.pathParameters['facilityId']!,
          bookingParams: state.extra as Map<String, dynamic>?,
        ),
      ),
      GoRoute(
        path: '/book/summary',
        builder: (context, state) => BookingSummaryScreen(data: state.extra as Map<String, dynamic>),
      ),
      GoRoute(
        path: '/pay/:bookingId',
        builder: (context, state) => PaymentScreen(bookingId: state.pathParameters['bookingId']!),
      ),
      GoRoute(
        path: '/ticket/:bookingId',
        builder: (context, state) => QrTicketScreen(bookingId: state.pathParameters['bookingId']!),
      ),
      GoRoute(path: '/bookings', builder: (context, state) => const MyBookingsScreen()),
      GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),

      // Attendant Routes
      GoRoute(path: '/staff/home', builder: (context, state) => const AttendantHomeScreen()),
      GoRoute(path: '/staff/scan', builder: (context, state) => const QrScannerScreen()),
    ],
  );
});
