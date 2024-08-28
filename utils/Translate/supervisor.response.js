export const responses = {
     messages: {
          en: {
               ticketsAlreadySettled: "Tickets already settled for today.",
               ticketsSettledSuccessfully: "Tickets settled successfully.",
               noAssistantsFound: "No assistants found",
               assistantsFetchedSuccessfully: "Here is all your parking assistant list",
               noSettlementTicketsFound: "No settlement tickets found for this supervisor.",
               settlementTicketsFetchedSuccessfully: "Here is the settlement ticket list.",
               noUnsettledTicketsFound: "No unsettled tickets found for the supervisor.",
               supervisorStatsFetchedSuccessfully: "Here is the supervisor stats.",
               allSupervisorsListFetchedSuccessfully: "All supervisors list fetched successfully.",
               unsettledTicketsFetchedSuccessfully: "All ticket denominations",
               nothingToCollect: "Nothing To Collect for now."

          },
          hi: {
               ticketsAlreadySettled: "आज के लिए टिकट पहले ही निपटाए जा चुके हैं।",
               ticketsSettledSuccessfully: "टिकट सफलतापूर्वक निपटाए गए।",
               noAssistantsFound: "कोई सहायक नहीं मिला",
               assistantsFetchedSuccessfully: "यहाँ आपकी सभी पार्किंग सहायक सूची है",
               noSettlementTicketsFound: "इस सुपरवाइजर के लिए कोई निपटान टिकट नहीं मिला।",
               settlementTicketsFetchedSuccessfully: "यहाँ निपटान टिकट की सूची है।",
               noUnsettledTicketsFound: "सुपरवाइजर के लिए कोई निपटाए गए टिकट नहीं मिले।",
               supervisorStatsFetchedSuccessfully: "यहाँ सुपरवाइजर के आँकड़े हैं।",
               allSupervisorsListFetchedSuccessfully: "सभी सुपरवाइज़रों की सूची सफलतापूर्वक प्राप्त की गई।",
               unsettledTicketsFetchedSuccessfully: "All ticket denominations",
               nothingToCollect: "Nothing To Collect for now."

          },
          mr: {
               ticketsAlreadySettled: "आजसाठी तिकीट आधीच निपटले आहेत.",
               ticketsSettledSuccessfully: "तिकीट यशस्वीरित्या निपटले.",
               noAssistantsFound: "कोणतेही सहाय्यक सापडले नाहीत",
               assistantsFetchedSuccessfully: "इथे आपली सर्व पार्किंग सहाय्यक यादी आहे",
               noSettlementTicketsFound: "या पर्यवेक्षकासाठी कोणतीही निपटान तिकीट सापडली नाही.",
               settlementTicketsFetchedSuccessfully: "येथे निपटान तिकीट यादी आहे.",
               noUnsettledTicketsFound: "सुपरवाइझर साठी कोणतीही निपटलेली तिकीटे सापडली नाहीत.",
               supervisorStatsFetchedSuccessfully: "येथे सुपरवाइझरचे सांख्यिकीय माहिती आहे.",
               allSupervisorsListFetchedSuccessfully: "सर्व सुपरवायझर यादी यशस्वीरित्या प्राप्त झाली.",
               unsettledTicketsFetchedSuccessfully: "All ticket denominations",
               nothingToCollect: "Nothing To Collect for now."

          }
     },
     errors: {
          en: {
               cashComponentsRequired: 'Cash components are required.',
               cashAmountMismatch: "Please check cash amount and its total.",
               notEligibleForRewards: 'Not eligible for rewards.',
               incorrectRewardAmount: 'Please check reward amount.',
               assistantNotFound: 'Assistant not found. Please check the ID.',
               collectedAmountMismatch: 'Collected amount is not the same as cash amount after giving reward and fine.',
               cashCollectionLessThanExpected: "Please check cash collection amount, it's less than expected.",
               cashCollectionMoreThanExpected: "Please check cash collection amount, it's greater than expected.",
               internalServerError: 'Internal server error.',
               supervisorNotFound: 'Supervisor not found',
               supervisorIdNotFound: 'No supervisor ID provided. Please check again.',
          },
          hi: {
               cashComponentsRequired: 'कैश घटक आवश्यक हैं।',
               cashAmountMismatch: "कृपया नकद राशि और इसके कुल की जांच करें।",
               notEligibleForRewards: 'इनाम के लिए पात्र नहीं हैं।',
               incorrectRewardAmount: 'इनाम राशि की जांच करें।',
               assistantNotFound: 'सहायक नहीं मिला। कृपया ID जांचें।',
               collectedAmountMismatch: 'संग्रहित राशि पुरस्कार और जुर्माना देने के बाद नकद राशि के समान नहीं है।',
               cashCollectionLessThanExpected: "कृपया नकद संग्रह राशि की जांच करें, यह अपेक्षित से कम है।",
               cashCollectionMoreThanExpected: "कृपया नकद संग्रह राशि की जांच करें, यह अपेक्षित से अधिक है।",
               internalServerError: 'आंतरिक सर्वर त्रुटि।',
               supervisorNotFound: 'सुपरवायझर सापडला नाही',
               supervisorIdNotFound: 'कोणतेही सुपरवाइझर ID प्रदान केलेले नाही. कृपया पुन्हा तपासा.',
          },
          mr: {
               cashComponentsRequired: 'कॅश घटक आवश्यक आहेत.',
               cashAmountMismatch: "कृपया कॅश रक्कम आणि त्याचा एकूण तपासा.",
               notEligibleForRewards: 'बक्षीसासाठी पात्र नाही.',
               incorrectRewardAmount: 'बक्षीसाची रक्कम तपासा.',
               assistantNotFound: 'सहायक सापडला नाही. कृपया ID तपासा.',
               collectedAmountMismatch: 'एकत्रित रक्कम बक्षीस आणि दंड देण्यापूर्वी कॅश रकमेशी समान नाही.',
               cashCollectionLessThanExpected: "कृपया कॅश संग्रह रक्कम तपासा, ती अपेक्षितपेक्षा कमी आहे.",
               cashCollectionMoreThanExpected: "कृपया कॅश संग्रह रक्कम तपासा, ती अपेक्षितपेक्षा जास्त आहे.",
               internalServerError: 'आतील सर्व्हर त्रुटी.',
               supervisorNotFound: 'सुपरवायझर सापडला नाही',
               supervisorIdNotFound: 'कोणतेही सुपरवाइझर ID प्रदान केलेले नाही. कृपया पुन्हा तपासा.',
          }
     }
};
