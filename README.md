<div align="center">

# 🎬 QuickShow — Movie Ticket Booking Mobile App

**A modern, cinema-grade movie ticket booking mobile application built with React Native & Expo.**

[![React Native](https://img.shields.io/badge/React_Native-0.88.1-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~58.0.26-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React](https://img.shields.io/badge/React-19.3.0-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/)

*Discover movies • Watch trailers • Pick seats • Pay via UPI/Card • Manage E-Tickets, Cancellations & 5-Star Ratings*

</div>

---

## ✨ Overview

**QuickShow** brings a sleek, dark-mode multiplex booking experience right to mobile devices. Designed for speed, visual polish, and zero-crash reliability, it combines live backend show data with intelligent local fallbacks so users can browse movies, watch trailers, book seats, cancel tickets with refund tracking, and rate films effortlessly.

---

## 🚀 Key Highlights

| Feature Pillar | What Makes It Stand Out |
| :--- | :--- |
| **🛡️ Resilient Hybrid Data Layer** | Seamlessly merges live show APIs (`fetchAllShows`) with curated fallback datasets (`MOVIES`, `TRAILERS`, `THEATERS`, `INITIAL_BOOKINGS`) for a smooth, crash-free experience even offline. |
| **💳 Dual Checkout Simulation** | Supports **UPI** (one-tap `GPay`, `PhonePe`, `Paytm` handles + validation) and **Stripe-style Card** payments with processing states, transaction IDs, **haptic/vibration feedback**, and instant redirect to **My Bookings**. |
| **🎟️ Complete Post-Booking Suite** | View **Digital E-Ticket Passes**, cancel eligible upcoming tickets with **Refund Status Tracking**, and rate watched movies using an interactive **5-Star Rating & Review** modal. |
| **🎨 Cinema-First UI & Motion** | Custom sliding pill bottom tab bar, `expo-linear-gradient` hero banners, `WebView` trailer player, safe-area inset handling, and a quick-action `CinemaFooter`. |

---

## 📱 Core Features

### 1. 🏠 Home Experience, Trailers & Cinema Footer
- **Featured Hero Showcase:** Full-bleed gradient movie spotlight with quick booking and favorite actions.
- **Now Showing & Search Discovery:** Browse trending films with pull-to-refresh, genre/search filtering, and one-tap **Heart (Favorite)** toggles.
- **Embedded Trailer Player:** Click-to-play trailers powered by `react-native-webview` (`youtube-nocookie.com`) with thumbnail switching and external YouTube launch support.
- **Quick-Action `CinemaFooter`:** Dark-rose summary card offering instant shortcuts to **Browse Movies**, **My Bookings**, and **Theaters**.

### 2. 💺 Theaters, Seat Selection & Dual Checkout
- **Theaters & Format Discovery:** Explore nearby cinemas with format badges (`IMAX`, `Dolby Atmos`, `4DX`), amenities, and showtime pills.
- **Interactive Seat Map:** Choose preferred dates, showtimes, and seats with real-time price calculation.
- **UPI & Card Payment Flows:**
  - **UPI:** Quick handle chips (`@okaxis`, `@ybl`, `@paytm`) and UPI ID format validation.
  - **Card (Stripe-Style):** Formatted card number, expiry (`MM/YY`), CVV, and cardholder validation.
- **Instant Confirmation:** Generates a unique transaction/booking ID, triggers vibration feedback, updates booking state, and navigates straight to **My Bookings**.

### 3. 🎫 My Bookings, E-Ticket Pass, Cancellation & Ratings
- **Digital E-Ticket Pass:** Tap any confirmed booking to view a clean boarding/cinema pass with booking ID, theater info, seats, and showtime.
- **Ticket Cancellation & Refund Tracking:** Cancel upcoming bookings via a confirmation dialog—automatically updating status to **Cancelled** with refund initiation details.
- **5-Star Movie Ratings:** Rate movies (`1–5 Stars`) and leave quick feedback tags/reviews from movie details or completed bookings.
- **Saved Watchlist (`Favorites`):** Bookmark movies across screens and manage them anytime inside **Favorites**.

---

## 🛠️ Tech Stack

- **Framework:** React Native (`0.88.1`), React (`19.3.0`), Expo (`~58.0.26`)
- **Navigation:** `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`
- **UI & Graphics:** `expo-linear-gradient`, `@expo/vector-icons` (`Ionicons`), `react-native-safe-area-context`
- **Media & Networking:** `react-native-webview`, `axios`

---

## 📂 Project Structure

```text
quickshowapp/
├── App.jsx                         # Root theme, navigation container & global bookings/ratings/favorites state
├── index.js                        # Expo application entry point
├── package.json                    # Dependencies and Expo scripts
└── src/
    ├── components/
    │   ├── CinemaFooter.jsx        # Quick-action cinema footer on HomeScreen
    │   ├── MovieCard.jsx           # Movie card with poster, rating badge & favorite toggle
    │   └── SectionHeader.jsx       # Reusable section header component
    ├── context/
    │   └── AuthContext.jsx         # User/guest session, favorites, ratings & booking actions
    ├── data/
    │   └── mockMovies.js           # Fallback MOVIES, TRAILERS, THEATERS & INITIAL_BOOKINGS
    ├── navigation/
    │   ├── MainTabs.jsx            # Custom sliding pill bottom tab bar
    │   └── MoviesStack.jsx         # Stack flow (Movies → Details → Seats → Checkout)
    ├── screens/
    │   ├── HomeScreen.jsx          # Hero banner, Now Showing, WebView trailers & CinemaFooter
    │   ├── MoviesScreen.jsx        # Catalog with search, filters & favorites
    │   ├── MovieDetailsScreen.jsx  # Cast, synopsis, 5-star rating & showtime picker
    │   ├── SeatSelectionScreen.jsx # Interactive seat map & fare summary
    │   ├── CheckoutScreen.jsx      # UPI & Card payment simulation with vibration feedback
    │   ├── TheatersScreen.jsx      # Partner theaters with format tags & showtimes
    │   └── MyBookingsScreen.jsx    # E-Tickets, cancellations/refunds, ratings & favorites
    ├── services/
    │   └── api.js                  # Show fetching, booking, cancellation & rating helpers
    ├── theme/
    │   └── colors.js               # Dark cinema color palette
    └── utils/
        └── movieAdapter.js         # API-to-UI movie data normalization helper