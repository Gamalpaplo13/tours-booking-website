import axios from 'axios';
import { showAlert } from './alert';
const stripe = stripe(
  'pk_test_51OTRqiDhjBWwkrQdEOUL5mR0aGbwP2CBeDDzksBAqI7KwrbqfFTwWJeheum3bVJvvDGlpOGffvaD4xZMbUCIv2WA00cmUKb5kB',
); // public key in stripe

export const bookTour = async (tourId) => {
  try {
    // 1) get checkout session from api
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/users/bookings/checkout-session/${tourId}`,
    );

    // 2) create checkout form + charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (error) {
    console.log(err);
    showAlert('error', err);
  }
};
