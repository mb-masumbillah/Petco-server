const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.USER_NAME_DB}:${process.env.USER_PASS_DB}@cluster0.3187xgx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db('assignment12DB').collection('users')
    const petlistngCollection = client.db('assignment12DB').collection('petListing')
    const adoptInfoCollection = client.db('assignment12DB').collection('adoptInfo')
    const petDonationCollection = client.db('assignment12DB').collection('petDonation')
    const paymentCollection = client.db('assignment12DB').collection('payment')

    // middleware
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" })
      res.send({ token })
    })

    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded
        next()
      })
    }

    // users verify admin after verifyToken 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }

      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === 'admin';
      
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" })
      }
      next()
    }




    // user related 

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user.role === 'admin'
      }
      res.send({ admin })
    })


    app.post('/users', async (req, res) => {
      const user = req.body;

      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)

      if (existingUser) {
        return res.send({ message: 'user already exists', insertId: null })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })


    // Pet Listing 
    app.get("/petListing", async (req, res) => {
      const result = await petlistngCollection.find().sort({ date: -1 }).toArray()
      res.send(result)
    })
    app.get("/petListing/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await petlistngCollection.findOne(query)
      res.send(result)
    })
    app.get("/petListing/pet/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email }
      const result = await petlistngCollection.find(query).toArray();
      res.send(result)
    })
    app.post("/petListing", async (req, res) => {
      const query = req.body;
      const result = await petlistngCollection.insertOne(query)
      res.send(result)
    })
    app.patch('/petListing/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          adopted: 'Adopted'
        }
      }
      const result = await petlistngCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    app.put('/petListing/:id', async (req, res) => {
      const id = req.params.id
      const data = req.body
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: data,
      }
      const result = await petlistngCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    app.delete("/petListing/:id", verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await petlistngCollection.deleteOne(query)
      res.send(result)
    })

    // adopt related

    app.get("/adoptInfo", verifyToken, async (req, res) => {
      const result = await adoptInfoCollection.find().toArray()
      res.send(result)
    })

    app.get("/adoptInfo/pet/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { pet_owner: email }
      const result = await adoptInfoCollection.find(query).toArray();
      res.send(result)
    })

    app.post("/adoptInfo", async (req, res) => {
      const query = req.body;
      const result = await adoptInfoCollection.insertOne(query)
      res.send(result)
    })
    app.delete("/adoptInfo/:id", verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await adoptInfoCollection.deleteOne(query)
      res.send(result)
    })


    // pet Donation

    app.get('/petDonation', async (req, res) => {
      const result = await petDonationCollection.find().toArray()
      res.send(result)
    })
    app.get('/petDonation/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petDonationCollection.findOne(query)
      res.send(result)
    })
    app.get("/petDonation/pet/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email }
      const result = await petDonationCollection.find(query).toArray();
      res.send(result)
    })
    app.delete('/petDonation/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await petDonationCollection.deleteOne(query)
      res.send(result)
    })

    app.put('/petDonation/:id', async (req, res) => {
      const id = req.params.id
      const donatedAmount = req.body
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: donatedAmount,
      }
      const result = await petDonationCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    app.post("/petDonation", async (req, res) => {
      const query = req.body;
      const result = await petDonationCollection.insertOne(query)
      res.send(result)
    })


    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100)
      console.log(amount, "ammount inside the intend")
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        "payment_method_types": [
          "card",
          "link"
        ],
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.get('/payment', async (req, res) => {
      const result = await paymentCollection.find().toArray()
      res.send(result)
    })

    app.get("/payment/pet/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { donator_email: email }
      const result = await paymentCollection.find(query).toArray();
      res.send(result)
    })

    app.patch('/payment/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          remove: 'remove'
        }
      }
      const result = await paymentCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.post('/payment', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      console.log('payment info', payment)
      res.send({ paymentResult })

    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Assignment 12 server')
})
app.listen(port, () => {
  console.log(`your assignment server port is running ${port}`)
})