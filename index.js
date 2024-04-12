// Require necessary modules
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongodb = require("mongodb");

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB setup
const MongoClient = mongodb.MongoClient;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
let db;

client.connect((err) => {
  if (err) {
    console.error("Error connecting to MongoDB:", err);
    return;
  }
  console.log("Connected to MongoDB");
  db = client.db();
});

const productsCollection = client.db("mobileshop").collection("products");

// get all products
app.get("/api/v1/products", async (req, res) => {
  try {
    const { brand, minRating, maxPrice } = req.query;
    const filter = {};

    if (brand) {
      filter.brand = brand;
    }

    if (minRating) {
      filter.ratings = { $gte: parseFloat(minRating) };
    }

    if (maxPrice) {
      filter.price = { $lte: parseFloat(maxPrice) };
    }

    const result = await productsCollection.find(filter).toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/v1/products/:productid", async (req, res) => {
  const id = req.params.productid;
  try {
    if (!mongodb.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const query = { _id: new mongodb.ObjectId(id) };
    const result = await productsCollection.findOne(query);

    if (!result) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.send(result);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/v1/flashsale", async (req, res) => {
  const result = await productsCollection
    .find({ flashSale: true, discount: { $exists: true, $ne: null } })
    .toArray();
  res.send(result);
});

app.get("/api/v1/topRatedProducts", async (req, res) => {
  try {
    const topRatedProducts = await productsCollection
      .find()
      .sort({ ratings: -1 })
      .toArray();
    res.json(topRatedProducts);
  } catch (error) {
    console.error("Error fetching top-rated products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Routes
app.get("/", (req, res) => {
  res.send("Assignment Eight is runing!");
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
