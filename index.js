const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pzwvi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const collection = client.db("doctor's-portal").collection("slots");
    const booksCollection = client.db("doctor's-portal").collection("bookings");
    app.get("/slot", async (req, res) => {
      const query = {};
      const cursor = collection.find(query);
      const result = await cursor.toArray();
      res.send(result);
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
