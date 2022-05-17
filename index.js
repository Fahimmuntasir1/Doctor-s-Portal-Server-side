const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, Admin } = require("mongodb");

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pzwvi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
const verifyJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ messages: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ messages: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();
    const collection = client.db("doctor's-portal").collection("slots");
    const booksCollection = client.db("doctor's-portal").collection("bookings");
    const userCollection = client.db("doctor's-portal").collection("users");

    app.get("/slot", async (req, res) => {
      const query = {};
      const cursor = collection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/user", verifyJwt, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get("/available", async (req, res) => {
      const date = req.query.date;
      const services = await collection.find().toArray();
      const query = { date: date };
      const allBookings = await booksCollection.find(query).toArray();

      services.forEach((service) => {
        const serviceBookings = allBookings.filter(
          (b) => b.treatment === service.name
        );
        const booked = serviceBookings.map((s) => s.slot);
        const available = service.slots.filter((s) => !booked.includes(s));
        service.slots = available;
      });
      res.send(services);
    });

    app.get("/booking", verifyJwt, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (decodedEmail === patient) {
        const query = { patient: patient };
        const bookings = await booksCollection.find(query).toArray();
        res.send(bookings);
      } else {
        return res.status(403).send({ messages: "request Forbidden" });
      }
    });

    app.put("/user/admin/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "Admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ messages: "Forbidden access" });
      }
    });
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      console.log(bookings.date);
      const query = {
        treatment: bookings.treatment,
        date: bookings.date,
        patient: bookings.patient,
      };
      const exists = await booksCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, bookings: exists });
      }
      const result = await booksCollection.insertOne(bookings);
      return res.send({ success: true, result });
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctor's portal is running");
});

app.listen(port, () => {
  console.log(`doctor's portal app listening on port ${port}`);
});
