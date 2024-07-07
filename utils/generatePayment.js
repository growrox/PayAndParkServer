import { instance } from "../server.js";
import crypto from "crypto"
import Transaction from "../models/onlineTransaction.model.js";

export default async function GeneratePayment(amount) {
     try {
          console.log("Instance ", Object.keys(instance).length);
          console.log("Amount ", amount);

          const paymentDetails = await instance.orders.create({
               "amount": +amount * 100,
               "currency": "INR",
               receipt: crypto.randomBytes(10).toString('hex')
               // "callback_url":"http:google.com" // This route will be called after payment update.
          })

          // const qrcodeDEtails = await instance.qrCode.create({
          //      type: "upi_qr",
          //      name: "Store Front Display",
          //      usage: "single_use",
          //      fixed_amount: true,
          //      payment_amount: +amount * 100,
          //      description: "This payment is for your parking ticket.",
          //      // customer_id: "cust_HKsR5se84c5LTO",
          //      close_by: Math.floor(Date.now() / 1000) + (15 * 60),
          //      notes: {
          //           purpose: "Test UPI QR Code notes"
          //      }
          // })

          // console.log("qrcodeDEtails ", qrcodeDEtails);
          const saveTransaction = new Transaction({
               amount: paymentDetails.amount,
               order_id: paymentDetails.id
          })

          await saveTransaction.save()
          console.log("saveTransaction ", saveTransaction);
          console.log("paymentDetails  ", paymentDetails);

          return ({ success: true, message: "Payment generated.", reference_id: saveTransaction._id, result: paymentDetails })

     } catch (error) {
          console.error("Error generating the payment.", error);
          return ({ success: false, message: "Payment not generated." })
     }
}