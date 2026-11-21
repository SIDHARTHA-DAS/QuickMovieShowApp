# QuickShow — Movie Ticket Booking Mobile App

A modern, dark-themed movie booking mobile application built with **React Native** and **Expo**, designed for smooth navigation, resilient data handling, an interactive seat selection and checkout experience, and instant ticket management in **My Bookings**.

---

## Highlights & Engineering Focus

- **Resilient Data Layer:** Combines dynamic TMDB-backed movie data with reliable fallback datasets (`MOVIES` and `INITIAL_BOOKINGS`) so core screens remain functional and crash-free even under network hiccups or incomplete API responses.
- **Interactive Checkout & Dual Payment Simulation:** Includes both **UPI** and **Stripe-style Card** payment flows with input validation, simulated gateway processing stages, success confirmation state, tactile **vibration feedback**, and automatic navigation to **My Bookings**.
- **Clean Mobile UX & Navigation:** Built with React Navigation (`Bottom Tabs` + `Native Stack`), `SafeAreaView` inset handling, dark cinema styling (`expo-linear-gradient` and `@expo/vector-icons`), and `react-native-webview` support.

---

## Core Features

### 1. Movie Discovery & Show Details
- Browse **Now Showing** movies and inspect movie metadata, show dates, and showtimes.
- **Favorites / Watchlist Support:** Toggle favorite movies smoothly across the app state.
- **Resilient Fallbacks:** Graceful fallback handling when live API data is unavailable.

### 2. Interactive Seat Selection
- Pick show date and time slot and select seats interactively.
- Real-time calculation of selected seats and total ticket fare before moving to checkout.

### 3. Simulated Payment Gateway (UPI & Stripe-Style Card)
- **UPI Flow:**
  - Quick UPI app handle helpers (`GPay`, `PhonePe`, `Paytm`) and manual UPI ID entry.
  - Validation for UPI handle format before initiating payment.
- **Card (Stripe-Style Checkout) Flow:**
  - Fields for **Email**, **Cardholder Name**, **Card Number** (auto-spaced formatting), **Expiry Date (`MM/YY`)**, and **CVV**.
  - Validation across required card and contact fields.
- **Processing, Feedback & Redirect:**
  - Multi-step simulated processing modal followed by a **Payment Successful** confirmation screen with a generated transaction ID (`TXN ID`).
  - Triggers a crisp confirmation **vibration pattern** on payment success.
  - Automatically records the new booking and redirects to the **My Bookings** screen.

### 4. My Bookings & Ticket View
- Displays confirmed bookings (both initial sample bookings and newly booked tickets created during the session).
- Shows movie title, show date & time, selected seats, total amount paid, and payment method.

---

## Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Core Framework** | React Native (`0.88.1`), React (`19.3.0`), Expo (`~58.0.26`) |
| **Navigation** | `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack` |
| **UI, Icons & Media** | `expo-linear-gradient`, `@expo/vector-icons` (`Ionicons`), `react-native-webview` |
| **Safe Area & Network** | `react-native-safe-area-context`, `axios` |

---

## Project Structure

```text
quickshowapp/
├── App.jsx                     # Root app setup, theme, bookings & favorites state
├── index.js                    # Expo root component registration
├── package.json                # Dependencies and Expo scripts
└── src/
    ├── context/
    │   └── AuthContext.jsx     # User/session context state
    ├── data/
    │   └── mockMovies.js       # Fallback movies (MOVIES) & initial bookings (INITIAL_BOOKINGS)
    ├── navigation/
    │   └── MainTabs.jsx        # Bottom tab & stack navigation flow
    ├── screens/
    │   └── BookingConfirmScreen.jsx  # UPI & Stripe-style card checkout, simulation & redirect
    ├── services/
    │   └── api.js              # API client & booking creation helpers
    └── theme/
        └── colors.js           # Dark cinema color palette & tokens