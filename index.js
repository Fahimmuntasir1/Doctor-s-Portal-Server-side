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
    app.get('/slot', async(req,res)=>{
        const query ={}
        const cursor = collection.find(query)
        const result = await cursor.toArray()
        res.send(result)
    })
  } finally {
    // await client.close();
  }
}

console.log(uri);

// client.connect(err => {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctor's portal is running");
});

app.listen(port, () => {
  console.log(`doctor's portal app listening on port ${port}`);
});
