export const ROUTES = {
  USER: {
    SIGN_UP: "/sign-up",
    LOGIN: "/login",
    VERIFY_OTP: "/verify-otp",
    GET_USER: "/users"
  },
  VEHICLE_TYPE: {
    CREATE: "/create-vehicle-type",
    GET_DETAIL: "/get-vehicle-type/:id",
    GET_ALL: "/get-all-vehicle-type",
    UPDATE: "/update-vehicle-type/:id",
    DELETE: "/delete-vehicle-type/:id",
  },
  ASSISTANT: {
    STATS: "/parking-assistant/stats"
  },
  SHIFT: {
    CREATE_SHIFTS: '/shifts/create',
    UPDATE_SHIFT: '/shifts/:id',
  },
  ATTENDENCE: {
    CLOCK_IN: '/:userId/clock-in',
    CLOCK_OUT: '/:userId/clock-out'
  }
};
