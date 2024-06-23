import ParkingAssistant from '../models/user.model.js'; // Adjust the path based on your project structure

const onlineStatusMiddleware = async (req, res, next) => {
     try {
          console.log("req.params.phoneNumber ", req.params);
          // Retrieve assistant based on phone number from request parameter
          const phoneNumber = req.params.phoneNumber || req.body.phoneNumber;
          const assistant = await ParkingAssistant.findOne({ phone: phoneNumber });

          // Check if assistant exists and is online
          if (!assistant || !assistant.isOnline) {
               return res.status(403).json({ message: 'Assistant is not available or not online.' });
          }

          // Assistant is online, proceed to next middleware or route handler
          next();
     } catch (error) {
          res.status(500).json({ message: error.message });
     }
};

export default onlineStatusMiddleware;