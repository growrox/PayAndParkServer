import Otp from "../models/otp.model.js";
import { fileURLToPath } from 'url';
import path from 'path';
import axios from "axios"
import moment from "moment-timezone";
import ParkingTicket from "../models/parkingTicket.model.js";

export const isEmpty = (value) => {
  if (value === null || value === undefined) {
    return true;
  } else if (typeof value === "object") {
    return Object.keys(value).length === 0;
  } else if (Array.isArray(value)) {
    return value.length === 0;
  } else if (typeof value === "string") {
    return value.trim() === "";
  } else {
    return false;
  }
};

export const generateCode = (length = 6) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const generateOTP = async (userID, phoneNumber) => {
  try {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to MongoDB
    const otpRecord = await Otp.updateOne(
      { userID, phoneNumber }, // Filter criteria to find the OTP record
      {
        $set: {
          userID,
          phoneNumber,
          OTP: otp,
          expires_on: new Date(Date.now() + (5 * 60000)) // Set expiry time in minutes
        }
      },
      { upsert: true } // Options to upsert if record doesn't exist
    );

    console.log(`Generated OTP ${otp} for userID ${userID} and phone number ${phoneNumber}`);

    const sendSMSResponse = await sendOTP(phoneNumber, otp);
    console.log("sendSMSResponse ", sendSMSResponse);

    return { status: "success", OTP: otp };
  } catch (error) {
    console.error('Error generating OTP:', error);
    // throw error; // Propagate the error back to the caller
    return { status: "error", OTP: "" };

  }
};

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);


async function sendOTP(toNumber, otp) {
  console.log("new DAte ", new Date().toTimeString());

  // Prepare parameters
  const data = {
    username: process.env.SMSGW_USER_NAME,
    password: process.env.SMSGW_USER_PSSWORD,
    "from": process.env.SMSGW_SENDER_NAME,
    "pe_id": process.env.SMS_PE_ID,
    "template_id": process.env.SMS_TEMPLATE_ID,
    "to": [toNumber],
    "text": `${otp} is the OTP for Authentication on Traffic Rewards. Please do not share this with anyone. Thank You, Team Traffic Rewards. TRWARD`,
    "scheduletime": formatTime()
  };

  console.log("Data ", data);

  let config = {
    method: 'post',
    // maxBodyLength: Infinity,
    url: process.env.SMSGW_BASE_URL,
    headers: {
      // 'x-client-source': 'app',
      'Content-Type': 'application/json'
    },
    data: data
  };

  // Encode text parameter
  try {
    // Make GET request using Axios
    const response = await axios.request(config);

    // Check if request was successful
    if (response.status === 200) {
      console.log("SMS sent successfully.");
      // console.log("");
      console.log("Response:", response.data);
      return response.data;
    } else {
      console.error(`Failed to send SMS. Status code: ${response.status}`);
      console.log("Error Response:");
      console.log(response.data);
    }
  } catch (error) {
    console.error("Error sending SMS:", error);

  }
}

export async function sendTicketConfirmation(ticketDetails) {
  const { Name, toNumber, TicketNumber, VehicalNumber, ParkingAssistant, Duration, Amount, PaymentMode, DateTime } = ticketDetails;
  const ninePercent = +(Amount * 0.09).toFixed(2);
  const GrandTotal = Math.ceil(Amount + (ninePercent * 2))
  const transactionDetails = findTransactionByAmount(Amount)

  console.log("new Date ", new Date());
  console.log("Client Date ", DateTime);
  console.log("new Date ", new Date(DateTime));
  console.log("Formated Date ", getDateTime(DateTime));

  // Prepare parameters
  const data = {
    username: process.env.SMSGW_USER_NAME,
    password: process.env.SMSGW_USER_PSSWORD,
    "from": process.env.SMSGW_SENDER_NAME,
    "pe_id": process.env.TICKET_CONFIRMATION_PE_ID,
    "template_id": process.env.TICKET_CONFIRMATION_TEMPLATE_ID,
    "to": [toNumber],
    "text":
      `M.B.M.C Pay&Park,Bhalavi Grp \n DATE:- ${getDateTime(DateTime).date} \n TIME :- ${getDateTime(DateTime).time} \n Dear ${Name} Your parking ticket has been successfully generated. \n Ticket Number: ${TicketNumber} \n Vehicle Number: ${VehicalNumber} \n Parking Assistant: ${ParkingAssistant} \n Duration: ${Duration + "hrs"} \n Base Amount : ${transactionDetails.amount} \n CGST 9% : ${transactionDetails.ninePercent} \n SGST 9% : ${transactionDetails.ninePercent} \n RND OFF : ${transactionDetails.rnd} \n GRAND TOTAL : ${transactionDetails.GrandTotal} \n Payment Mode: ${PaymentMode}. MBMC`,
    // "text": "M.B.M.C Pay&Park 3, Bhalavi Grp \n DATE:- 07.07.24,\n TIME :- 2: 00pm \n Dear Hitesh Pal Your parking ticket has been successfully generated. Ticket Number: AB1235 Vehicle Number: MH04 GK 3445 Parking Assistant: Aditya Singh Duration: 2hrs Base Amount : 30 CGST 9%  : 9 SGST 9%   : 9 RND OFF : 38 GRAND TOTAL : 38Payment Mode: Online. MBMC",
    "scheduletime": formatTime()
  };

  console.log("Data ", data);

  let config = {
    method: 'post',
    url: process.env.SMSGW_BASE_URL,
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  };


  // Encode text parameter
  try {
    // Make GET request using Axios
    const response = await axios.request(config);
    // Check if request was successful
    if (response.status == 200) {
      console.log("SMS sent successfully.");
      console.log("Response:", response.data);
      return response.data;
    } else {
      console.error(`Failed to send SMS. Status code: ${response.status}`);
      console.log("Error Response:");
      console.log(response.data);
    }
  }
  catch (error) {
    console.error("Error sending SMS:", error);

  }
}

function formatTime(timeZone = 'Asia/Kolkata') {
  // Get the current date and time in the specified time zone
  const date = moment().tz(timeZone);

  // Format the date and time
  const formattedDateTime = date.format('YYYY-MM-DD HH:mm');

  return formattedDateTime;
}

function getDateTime(dateTime, timeZone = 'Asia/Kolkata') {
  // Convert the input dateTime to a moment object with the specified time zone
  const date = moment.tz(dateTime, timeZone); // 'true' preserves the local time

  // Get date components
  const day = date.date().toString().padStart(2, '0');
  const month = (date.month() + 1).toString().padStart(2, '0'); // Month is zero-indexed
  const year = date.year().toString().slice(-2); // Last two digits of the year

  // Get time components
  let hours = date.hours();
  const minutes = date.minutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';

  hours = hours % 12 || 12; // Convert hour to 12-hour format
  const time = `${hours.toString().padStart(2, '0')}:${minutes}${ampm}`;

  // Format date and time strings
  const formattedDate = `${day}-${month}-${year}`;
  const formattedTime = `${time}`;

  // Return date and time object
  return { date: formattedDate, time: formattedTime };
}


export function scheduleCronAfterMinutes(endTime, minutesToAdd) {
  // Parse endTime using moment.js to ensure correct time parsing
  const endTimeMoment = moment(endTime, 'hh:mm A');

  // Calculate the target time by adding minutes
  const targetTimeMoment = endTimeMoment.clone().add(minutesToAdd, 'minutes');

  // Construct the cron schedule string
  const cronSchedule = `${targetTimeMoment.minutes()} ${targetTimeMoment.hours()} * * *`;

  // Schedule the cron job
  return cronSchedule
}

export function getLanguage(req, responses) {
  const lang = req.headers['client-language'] || 'en';
  return responses.messages[lang] ? lang : 'en';
};

// const text = "M.B.M.C Pay&Park 3, Bhalavi Grp \n DATE:- 07.07.24,\n TIME :- 2: 00pm \n Dear Hitesh Pal Your parking ticket has been successfully generated. Ticket Number: AB1235 Vehicle Number: MH04 GK 3445 Parking Assistant: Aditya Singh Duration: 2hrs Base Amount : 30 CGST 9%  : 9 SGST 9%   : 9 RND OFF : 38 GRAND TOTAL : 38Payment Mode: Online. MBMC"
// console.log("MEssage ", text);

const transactions = [
  { amount: 15, ninePercent: 1.35, rnd: '0.30', GrandTotal: 18 },
  { amount: 20, ninePercent: 1.8, rnd: '0.40', GrandTotal: 24 },
  { amount: 25, ninePercent: 2.25, rnd: '0.50', GrandTotal: 30 },
  { amount: 50, ninePercent: 4.5, rnd: '0.00', GrandTotal: 59 },
  { amount: 70, ninePercent: 6.3, rnd: '0.40', GrandTotal: 83 },
  { amount: 60, ninePercent: 5.4, rnd: '0.20', GrandTotal: 71 },
  { amount: 75, ninePercent: 6.75, rnd: '0.50', GrandTotal: 89 },
  { amount: 100, ninePercent: 9, rnd: '0.00', GrandTotal: 118 },
  { amount: 125, ninePercent: 11.25, rnd: '0.50', GrandTotal: 148 },
  { amount: 175, ninePercent: 15.75, rnd: '0.50', GrandTotal: 207 },
  { amount: 150, ninePercent: 13.5, rnd: '0.00', GrandTotal: 177 },
  { amount: 350, ninePercent: 31.5, rnd: '0.00', GrandTotal: 413 },
  { amount: 1000, ninePercent: 90, rnd: '0.00', GrandTotal: 1180 },
  { amount: 2000, ninePercent: 180, rnd: '0.00', GrandTotal: 2360 },
  { amount: 4000, ninePercent: 360, rnd: '0.00', GrandTotal: 4720 }
];

// Function to find the corresponding object by amount
function findTransactionByAmount(GrandTotal) {
  return transactions.find(transaction => transaction.GrandTotal === GrandTotal);
}

export async function createRefId(date) {
  try {
    // Convert date to Asia/Kolkata timezone and format it
    const kolkataTime = moment.tz(new Date(date), 'Asia/Kolkata').startOf('day')
    const year = kolkataTime.format('YY'); // Last two digits of the year
    const month = kolkataTime.format('MM'); // Two-digit month
    const day = kolkataTime.format('DD');   // Two-digit day
    const todayKey = `${year}${month}-${day}`;

    // Find the last ticket created today
    const lastTicket = await ParkingTicket.findOne({ ticketRefId: new RegExp(`^PNP${todayKey}`) })
      .sort({ createdAt: -1 })
      .exec();

    let nextSequenceNumber = 1;

    console.log({ lastTicket });

    if (lastTicket) {
      // Extract the current sequence number from the last ticket's refId
      const lastSequenceStr = lastTicket.refId.slice(-4);
      nextSequenceNumber = parseInt(lastSequenceStr, 10) + 1;
    }

    // Ensure the sequence number is zero-padded to 4 digits
    const sequenceStr = String(nextSequenceNumber).padStart(4, '0');

    // Format the reference ID
    const refId = `PNP${todayKey}${sequenceStr}`;

    return refId;
  } catch (err) {
    console.error('Error creating reference ID:', err);
    throw err;
  }
}
