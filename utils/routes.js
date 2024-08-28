export const ROUTES = {
  USER: {
    SIGN_UP: "/sign-up",
    LOGIN: "/login",
    VERIFY_OTP: "/verify-otp",
    GET_USER: "/users",
    GET_USER_STATUS: "/users/status",
    UPDATE_USER: "/user/:id"
  },
  VEHICLE_TYPE: {
    CREATE: "/create-vehicle-type/:folderName",
    GET_DETAIL: "/get-vehicle-type/:id",
    GET_ALL: "/get-all-vehicle-type",
    UPDATE: "/update-vehicle-type/:id/:folderName",
    DELETE: "/delete-vehicle-type/:id",
  },
  ASSISTANT: {
    STATS: "/parking-assistant/stats",
    GET_TICKETS: "/parking-assistant/tickets"
  },
  SHIFT: {
    CREATE_SHIFTS: '/shifts/create',
    UPDATE_SHIFT: '/shifts/:id',
    GET_SHIFT: '/shifts/list'
  },
  ATTENDENCE: {
    CLOCK_IN: '/attendance/clock-in/:userId',
    CLOCK_OUT: '/attendance/clock-out/:userId',
    UPDATE_ATTENDANCE: '/attendance/update/:attendanceId',
    GET_ATTENDANCE: '/get-monthly-attendance',
  },
  IMAGE: {
    GET: "/images/:folderName/:imageName"
  },
  VEHICAL_PASS: {
    GET_PASS: "/vehicle-passes",
    CREATE_PASS: "/vehicle-passes",
    UPDATE_PASS: "/vehicle-passes/:passId",
    GET_PASS_BY_FILTER: "/vehicle-passes/:filter",
    DELETE_PASS: "/vehicle-passes/:passId"
  },
  ACCOUNTANT: {
    SETTLE_SUPERVISOR_TICKET: "/accountant/settle-tickets/:supervisorID",
    GET_SUPERVISOR: "/accountant/supervisors",
    GET_ALL_SETTLE_TICKETS: "/accountant/tickets/settled/:accountantID",
    GET_SUPERVISOR_SETTLE_TICKETS: "/accountant/tickets/supervisor/:supervisorID",
    GET_STATS: "/accountant/stats/:accountantID",
    GET_STATS_BY_DATE: "/accountant/stats-by-date/:accountantID"
  },
  SUPERVISOR: {
    SETTLE_TICKETS: "/supervisor/settle-tickets/:parkingAssistantID",
    GET_ASSISTANTS: "/supervisor/parkings-assistants/:supervisorID",
    GET_ALL_SETTLE_TICKETS: "/supervisor/tickets/all/:supervisorID",
    GET_STATS: "/supervisor/stats/:supervisorID",
    GET_ALL_SUPERVISOR: "/supervisor/all",
    GET_CASH_DENOMINATIONS: "/supervisor/cash-denomination/:supervisorID"
  },
  PARKING_TICKETS: {
    UPLOAD_VEHICAL_IMAGE: "/parking-tickets/uploadParkingTicket",
    CREATE_TICKET: "/parking-tickets/:folderName",
    GENERATE_ORDER: "/ticket/generate-order",
    GET_ALL_TICKETS: "/admin/parking-tickets",
    PAYMENT_STATUS: "/ticket/payment-status",
    GET_TOCKET: "/parking-tickets",
    GET_LOCATION: "/parking-ticket/location",
    GET_QUERY_TICKET: "/parking-tickets/:query",
    GET_TICKET_FOR_ASSISTANT: "/parking-tickets/unsettled/:assistantId",
    DELETE_PAYMENT_ORDER: "/ticket/order/:id",
    GET_VEHICAL_TYPE_DETAILS: "/ticket/detail/:id",
    DELETE_TICEKT_IMAGE: "/parking-tickets/:filename",
    UPDATE_TICKET_BY_ID: "/parking-tickets/:id",
    DELTE_TICEKT_BY_ID: "/parking-tickets/:id",
    GET_PREVIOUS_TICKET_DETAILS: "/ticket/previous"
  }
};
