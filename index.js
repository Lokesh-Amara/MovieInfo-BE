const Express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongodb = require("mongodb");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

const app = Express();
app.use(Express.json());
app.use(cors());
dotenv.config();

const port = process.env.PORT || 3001;
const mongoClient = mongodb.MongoClient;
const objectId = mongodb.ObjectID;
const DB_URL = process.env.DBURL || "mongodb://127.0.0.1:27017";

const EMAIL = process.env.EMAIL || "";
const PASSWORD = process.env.PASSWORD || "";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL,
    pass: PASSWORD,
  },
});

const mailData = {
  from: EMAIL,
  subject: "Secret code for getTickets.com",
};

const mailMessage = (rand) => {
  return `<p>Hi,<br /> You code for getTickets.com registration is ${rand}<br /> Thank you and don't share it to anyone!!! </p>`;
};

app.post("/sendcode", async (req, res) => {
  try {
    const rand = Math.random().toString(36).substring(5).toUpperCase();
    mailData.to = req.body.targetMail;
    mailData.html = mailMessage(rand);
    await transporter.sendMail(mailData);

    res.status(200).json({
      rand: rand,
    });
  } catch (err) {
    console.log(err);
    res.status(200).json({
      error: "invalid Email",
    });
  }
});

app.post("/register", async (req, res) => {
  try {
    const client = await mongoClient.connect(DB_URL);
    const db = client.db("UserDB");

    const password = await bcrypt.hash(req.body.password, 10);

    const data = {
      name: req.body.name,
      username: req.body.username,
      email: req.body.email,
      password: password,
    };

    const result = await db.collection("users").insertOne(data);
    res.send({
      status: "success",
    });
    client.close();
  } catch (err) {
    res.send({
      status: "failed",
    });
    client.close();
  }
});

app.post("/login", async (req, res) => {
  try {
    const client = await mongoClient.connect(DB_URL);
    const db = client.db("UserDB");

    const uname = req.body.username;
    const pass = req.body.password;

    const result = await db
      .collection("users")
      .find({ username: uname })
      .project({ _id: 0, name: 0, email: 0 })
      .toArray();

    if (result.length === 0) res.send({ status: "Username not found!" });

    const hashPass = result[0].password;
    const validPass = await bcrypt.compare(pass, hashPass);
    if (validPass) {
      res.send({ status: "success" });
    } else {
      res.send({ status: "Invalid password" });
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/movieslist", async (req, res) => {
  try {
    const client = await mongoClient.connect(DB_URL);
    const db = client.db("MovieDB");

    const result = await db.collection("Movies").find({}).toArray();

    res.send(result);
    client.close();
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/updatewatchlist", async (req, res) => {
  try {
    const client = await mongoClient.connect(DB_URL);
    const db = client.db("UserDB");

    const result = await db
      .collection("users")
      .update(
        { username: req.body.username },
        { $push: { watchlist: req.body.moviename } }
      );
    res.send({
      status: "Added to watchlist!",
    });
    client.close();
  } catch (err) {
    res.send({
      status: "Unable to add to watch list. Retry once.",
    });
    client.close();
  }
});

app.post("/updatelikedlist", async (req, res) => {
  try {
    const client = await mongoClient.connect(DB_URL);
    const db = client.db("UserDB");

    const result = await db
      .collection("users")
      .update(
        { username: req.body.username },
        { $push: { likedmovies: req.body.moviename } }
      );
    res.send({
      status: "Added to your list!",
    });
    client.close();
  } catch (err) {
    res.send({
      status: "Unable to add to your list. Retry once.",
    });
    client.close();
  }
});

app.post("/getwatchlist", async (req, res) => {
  try {
    const client = await mongoClient.connect(DB_URL);

    const db1 = client.db("UserDB");

    const watchList = await db1
      .collection("users")
      .find({ username: req.body.username })
      .project({ _id: 0, watchlist: 1 })
      .toArray();

    if (Object.keys(watchList[0]).length > 0) {
      const db2 = client.db("MovieDB");

      const result = await db2
        .collection("Movies")
        .find({ name: { $in: watchList[0].watchlist } })
        .toArray();

      res.send({ status: "success", data: result });
    } else {
      res.send({ status: "no data" });
    }
    client.close();
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/getlikedlist", async (req, res) => {
  try {
    const client = await mongoClient.connect(DB_URL);

    const db1 = client.db("UserDB");

    const likedList = await db1
      .collection("users")
      .find({ username: req.body.username })
      .project({ _id: 0, likedmovies: 1 })
      .toArray();

    if (Object.keys(likedList[0]).length > 0) {
      const db2 = client.db("MovieDB");

      const result = await db2
        .collection("Movies")
        .find({ name: { $in: likedList[0].likedmovies } })
        .toArray();

      res.send({ status: "success", data: result });
    } else {
      res.send({ status: "no data" });
    }
    client.close();
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.listen(port, () => {
  console.log(`::::  Server started and running on port ${port} ::::`);
});
