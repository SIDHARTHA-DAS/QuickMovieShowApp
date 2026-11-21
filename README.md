# QuickShow — Movie Ticket Booking Mobile App

A modern, dark-themed movie booking mobile application built with **React Native** and **Expo**, featuring dynamic show listings with resilient fallbacks, click-to-play trailer previews, interactive seat selection, a simulated UPI & Stripe-style card checkout flow with vibration feedback, and instant ticket tracking in **My Bookings**.

---

## Highlights & Engineering Focus

- **Resilient Data Layer:** Combines live show data (`fetchAllShows`) with reliable fallback datasets (`MOVIES`, `TRAILERS`, and `INITIAL_BOOKINGS`) so core screens stay functional and crash-free even under network issues or empty API responses.
- **Interactive Checkout & Dual Payment Simulation:** Supports both **UPI** and **Stripe-style Card** flows with input validation, simulated gateway processing, success confirmation with generated transaction IDs, **vibration feedback**, and automatic redirect to **My Bookings**.
- **Polished Cinema UI & Navigation:** Built with React Navigation (`Bottom Tabs` with a custom sliding pill tab bar + `Native Stack`), `SafeAreaProvider` / `SafeAreaView` inset handling, `expo-linear-gradient`, `@expo/vector-icons`, `react-native-webview` trailer embedding, and a quick-action `CinemaFooter` on the home screen.

---

## Core Features

### 1. Home Screen, Trailers & Cinema Footer
- **Hero Showcase & Now Showing Grid:** Highlights the featured film and displays current shows with pull-to-refresh support.
- **Click-to-Play Trailer Player:** Embeds trailers via `WebView` (`youtube-nocookie.com`), supports switching trailer thumbnails, and offers a direct external YouTube option.
- **Upgraded `CinemaFooter`:** Provides a clean dark-rose summary card with one-tap shortcuts to **Browse Movies**, **Bookings** (`MyBookings`), and **Theaters**.

### 2. Movie Discovery, Seat Selection & Checkout
- Inspect show details, select show date/time and seats, and proceed to checkout.
- **UPI Flow:** Quick app handle helpers (`GPay`, `PhonePe`, `Paytm`), manual UPI ID input, and format validation.
- **Card (Stripe-Style) Flow:** Email, cardholder name, formatted card number, expiry (`MM/YY`), and CVV validation.
- **Confirmation & Redirect:** Shows simulated processing and payment success states, triggers vibration feedback, appends the ticket to bookings state, and navigates to **My Bookings**.

### 3. My Bookings & Favorites
- View confirmed bookings (including newly booked session tickets) alongside favorite/saved movies.

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
├── App.jsx                         # Root app setup, QuickShowTheme, bookings & favorites state
├── index.js                        # Expo root component entry
├── package.json                    # Dependencies and Expo scripts
└── src/
    ├── components/
    │   ├── CinemaFooter.jsx        # Quick-action cinema footer for HomeScreen
    │   ├── MovieCard.jsx           # Movie grid card component
    │   └── SectionHeader.jsx       # Section title & action header
    ├── context/
    │   └── AuthContext.jsx         # User/guest session context
    ├── data/
    │   └── mockMovies.js           # Fallback MOVIES, TRAILERS & INITIAL_BOOKINGS
    ├── navigation/
    │   ├── MainTabs.jsx            # Custom sliding pill bottom tab bar & tab scenes
    │   └── MoviesStack.jsx         # Movies stack navigation flow
    ├── screens/
    │   ├── HomeScreen.jsx          # Hero, Now Showing, WebView trailers & CinemaFooter
    │   ├── TheatersScreen.jsx      # Theaters listing screen
    │   └── MyBookingsScreen.jsx    # Booked tickets & favorites screen
    ├── services/
    │   └── api.js                  # Show fetching & booking helpers
    ├── theme/
    │   └── colors.js               # Dark cinema theme palette
    └── utils/
        └── movieAdapter.js         # Movie data normalization helper