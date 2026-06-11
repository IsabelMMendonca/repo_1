const express = require('express')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.json())

// verification (Meta requires this)
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = '12345'

  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge)
  } else {
    return res.sendStatus(403)
  }
})

// receive events
app.post('/webhook', (req, res) => {
  console.log('EVENT:', JSON.stringify(req.body, null, 2))
  res.sendStatus(200)
})

app.listen(3000, () => console.log('running on 3000'))

/*


curl -i -X POST \
  https://graph.facebook.com/v22.0/1077450028782374/messages \
  -H 'Authorization: Bearer EABAsTB9NYNQBRLpIZAk3NGMFhr06epLR3UtZBy1NlQeSDEmjBUBPaPQPVVNHqXBzHWEG0WuZCvhx8zux6aZBc44IoqbCDZAXi1oxVQ0ckPlzwoSHw51Fb5jZAZCCWocxZAXzTyVl26xvZBaf86syRYMKNcL6S5Nej2SWTZBI0MxbJLn3zin8849UQv8CGqTXh63EeZADQSLUlMv9gV2kBlHxBnn3mEZBblQmqfFy4zsCqgfXZAmwSdKuuldZCCdUJCtKOCR4KHZBlMUCCJG1wZBnacu4R2xh' \
  -H 'Content-Type: application/json' \
  -d '{ "messaging_product": "whatsapp", "to": "5521995425332", "type": "text", "text": { "body": "hello world" } }'

  EVENT: {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "2803726310019906",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5521987560440",
              "phone_number_id": "1077450028782374"
            },
            "statuses": [
              {
                "id": "wamid.HBgNNTUyMTk5NTQyNTMzMhUCABEYEkUxQzUwRUQ0OTIwNUEyMDMxRQA=",
                "status": "sent",
                "timestamp": "1775010254",
                "recipient_id": "5521995425332",
                "pricing": {
                  "billable": false,
                  "pricing_model": "PMP",
                  "category": "service",
                  "type": "free_customer_service"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
EVENT: {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "2803726310019906",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5521987560440",
              "phone_number_id": "1077450028782374"
            },
            "statuses": [
              {
                "id": "wamid.HBgNNTUyMTk5NTQyNTMzMhUCABEYEkUxQzUwRUQ0OTIwNUEyMDMxRQA=",
                "status": "read",
                "timestamp": "1775010255",
                "recipient_id": "5521995425332",
                "pricing": {
                  "billable": false,
                  "pricing_model": "PMP",
                  "category": "service",
                  "type": "free_customer_service"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
EVENT: {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "2803726310019906",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5521987560440",
              "phone_number_id": "1077450028782374"
            },
            "statuses": [
              {
                "id": "wamid.HBgNNTUyMTk5NTQyNTMzMhUCABEYEkUxQzUwRUQ0OTIwNUEyMDMxRQA=",
                "status": "delivered",
                "timestamp": "1775010255",
                "recipient_id": "5521995425332",
                "pricing": {
                  "billable": false,
                  "pricing_model": "PMP",
                  "category": "service",
                  "type": "free_customer_service"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
EVENT: {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "2803726310019906",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5521987560440",
              "phone_number_id": "1077450028782374"
            },
            "statuses": [
              {
                "id": "wamid.HBgNNTUyMTk5NTQyNTMzMhUCABEYEkUxQzUwRUQ0OTIwNUEyMDMxRQA=",
                "status": "delivered",
                "timestamp": "1775010255",
                "recipient_id": "5521995425332",
                "pricing": {
                  "billable": false,
                  "pricing_model": "PMP",
                  "category": "service",
                  "type": "free_customer_service"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}

  */