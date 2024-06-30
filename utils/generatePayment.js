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