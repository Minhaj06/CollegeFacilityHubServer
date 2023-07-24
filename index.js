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
    const classesCollection = client.db("CollegeFacilityHub").collection("classes");
    const instructorsCollection = client.db("CollegeFacilityHub").collection("instructors");
    const selectedClassesCollection = client
      .db("CollegeFacilityHub")
      .collection("selectedClasses");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "7d" });

      res.send({ token });
    });

    // Verify Student
    const verifyStudent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "student") {
        return res.status(403).send({ error: true, message: "Forbidden message" });
      }
      next();
    };
    // Check Student
    app.get("/student-check", verifyJWT, verifyStudent, async (req, res) => {
      res.json({ ok: true });
    });

    // Verify Instructor
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "instructor") {
        return res.status(403).send({ error: true, message: "Forbidden message" });
      }
      next();
    };
    // Check Instructor
    app.get("/instructor-check", verifyJWT, verifyInstructor, async (req, res) => {
      res.json({ ok: true });
    });

    // Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ error: true, message: "Forbidden message" });
      }
      next();
    };

    // Check Admin
    app.get("/admin-check", verifyJWT, verifyAdmin, async (req, res) => {
      res.json({ ok: true });
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

    // Update User Role By Admin
    app.patch("/users/role/:id", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const { id } = req.params;
        const { role } = req.body;
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              role: role,
            },
          }
        );
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // User List
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const users = await usersCollection.find({}).limit(20).toArray();

      res.send(users);
    });

    // Classes API'S
    app.get("/classes", async (req, res) => {
      const classes = await classesCollection.find({}).limit(20).toArray();
      res.send(classes);
    });

    app.post("/classes", verifyJWT, verifyInstructor, async (req, res) => {
      const classItem = req.body;
      const result = await classesCollection.insertOne(classItem);
      res.send(result);
    });

    // Class By Id
    app.get("/classes/:id", async (req, res) => {
      const { id } = req.params;
      const classes = await classesCollection.findOne({ _id: new ObjectId(id) });
      res.send(classes);
    });

    // Update
    app.put("/classes/:id", verifyJWT, verifyInstructor, async (req, res) => {
      try {
        const { id } = req.params;
        const classItem = req.body;
        const result = await classesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: classItem },
          { upsert: true }
        );
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // Class Status Update By Admin
    app.patch("/classes/status/:id", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await classesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: status,
            },
          }
        );
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // Send feedback for denying class by admin
    app.post("/classes/feedback/:id", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const { id } = req.params;
        const { feedback } = req.body;
        const result = await classesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              feedback: feedback,
            },
          },
          { upsert: true }
        );
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // Delete
    app.delete("/classes/:id", verifyJWT, verifyInstructor, async (req, res) => {
      try {
        const { id } = req.params;
        const result = await classesCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // Class By Instructor Email
    app.get("/instructors/classes/:email", async (req, res) => {
      const { email } = req.params;
      const classes = await classesCollection
        .find({ instructorEmail: email })
        .limit(20)
        .toArray();
      res.send(classes);
    });

    app.get("/instructors", async (req, res) => {
      const instructors = await instructorsCollection.find({}).limit(12).toArray();
      res.send(instructors);
    });

    // Selected Class API
    app.post("/selected-classes", verifyJWT, async (req, res) => {
      try {
        const selectedClass = req.body;

        const result = await selectedClassesCollection.insertOne(selectedClass);

        res.send(result);
      } catch (error) {
        console.log(error);
        res.send({ error: true });
      }
    });

    // Seleted Classes List
    app.get("/selected-classes", verifyJWT, async (req, res) => {
      try {
        const studentEmail = req.decoded.email;
        const selectedClasses = await selectedClassesCollection
          .find({ studentEmail })
          .limit(20)
          .toArray();
        res.send(selectedClasses);
      } catch (error) {
        console.log(error);
        res.send({ error: true });
      }
    });

    // Seleted Classes List
    app.delete("/selected-classes/:id", verifyJWT, async (req, res) => {
      try {
        const { id } = req.params;

        const result = await selectedClassesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        console.log(error);
        res.send({ error: true });
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
