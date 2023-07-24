const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ error: true, message: "Unauthorized access" });
  }

  jwt.verify(authorization, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ error: true, message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qkmfuva.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    client.connect();

    // Collections
    const usersCollection = client.db("CollegeFacilityHub").collection("users");
    const collegesCollection = client.db("CollegeFacilityHub").collection("colleges");
    const admissionCollection = client.db("CollegeFacilityHub").collection("admission");
    const reviewsCollection = client.db("CollegeFacilityHub").collection("reviews");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "7d" });

      res.send({ token });
    });

    // Users API'S
    // Read
    app.get("/user/:email", async (req, res) => {
      const { email } = req.params;

      const user = await usersCollection.findOne({ email });

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      console.log("====>", user);
      res.send({ role: user.role });
    });

    // Create
    app.post("/users", async (req, res) => {
      const user = req.body;
      user.role = "student";
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Update
    app.patch("/users", verifyJWT, async (req, res) => {
      const user = req.body;
      const email = req.decoded.email;
      const query = { email: email };
      const update = { $set: { name: user.name, photoURL: user.photoURL } };

      try {
        const existingUser = await usersCollection.findOne(query);

        if (!existingUser) {
          return res.status(404).json({ message: "User not found" });
        }

        const result = await usersCollection.updateOne(query, update);
        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // User List
    app.get("/users", verifyJWT, async (req, res) => {
      const users = await usersCollection.find({}).limit(20).toArray();

      res.send(users);
    });

    /*==================Colleges API's====================*/
    app.get("/colleges", async (req, res) => {
      const colleges = await collegesCollection.find({}).limit(20).toArray();
      res.send(colleges);
    });

    app.get("/college/:id", async (req, res) => {
      const { id } = req.params;

      const college = await collegesCollection.findOne({ _id: new ObjectId(id) });

      if (!college) {
        return res.status(404).send({ message: "college not found" });
      }
      res.send(college);
    });

    app.get("/college/search/:keyword", async (req, res) => {
      const { keyword } = req.params;

      const result = await collegesCollection
        .find({ name: { $regex: keyword, $options: "i" } })
        .toArray();

      res.send(result);
    });

    // Assuming you have imported the necessary dependencies and set up the MongoDB connection

    app.post("/admission", async (req, res) => {
      const admissionData = req.body;

      try {
        const result = await admissionCollection.insertOne(admissionData);

        res.send(result);
      } catch (error) {
        console.error("Error inserting admission data:", error);
        return res.status(500).json({ error: "Error inserting admission data" });
      }
    });

    app.get("/admission/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const admission = await admissionCollection.findOne({ email });
        res.send(admission);
      } catch (error) {
        console.error("Error inserting admission data:", error);
        return res.status(500).json({ error: "Error inserting admission data" });
      }
    });

    /*============= Review ==============*/
    app.post("/review", async (req, res) => {
      const { review, rating } = req.body;

      try {
        const result = await admissionCollection.insertOne({ review, rating });

        res.send(result);
      } catch (error) {
        console.error("Error inserting review data:", error);
        return res.status(500).json({ error: "Error inserting review data" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("CollegeFacilityHub server is running.");
});

app.listen(port, () => {
  console.log(`CollegeFacilityHub server is running on port: ${port}`);
});
