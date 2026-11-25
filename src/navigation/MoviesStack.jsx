import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../theme/colors';
import MoviesScreen from '../screens/MoviesScreen';
import MovieDetailsScreen from '../screens/MovieDetailsScreen';
import SeatSelectionScreen from '../screens/SeatSelectionScreen';
import BookingConfirmScreen from '../screens/BookingConfirmScreen';

const Stack = createNativeStackNavigator();

export default function MoviesStack({
  bookings = [],
  cancelledMap = {},
  onAddBooking,
  favorites = [],
  onToggleFavorite,
}) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="MoviesList">
        {(props) => (
          <MoviesScreen
            {...props}
            bookings={bookings}
            cancelledMap={cancelledMap}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="MovieDetails">
        {(props) => (
          <MovieDetailsScreen
            {...props}
            bookings={bookings}
            cancelledMap={cancelledMap}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="SeatSelection">
        {(props) => (
          <SeatSelectionScreen
            {...props}
            bookings={bookings}
            cancelledMap={cancelledMap}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="BookingConfirm">
        {(props) => (
          <BookingConfirmScreen
            {...props}
            bookings={bookings}
            cancelledMap={cancelledMap}
            onAddBooking={onAddBooking}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}