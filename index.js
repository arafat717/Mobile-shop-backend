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

// Endpoint to get one product from each brand
app.get("/api/v1/oneProductPerBrand", async (req, res) => {
  try {
    const distinctBrands = await productsCollection.distinct("brand");
    const oneProductPerBrand = [];

    for (const brand of distinctBrands) {
      const brandProduct = await productsCollection.findOne({ brand });
      if (brandProduct) {
        oneProductPerBrand.push(brandProduct);
      }
    }

    res.json(oneProductPerBrand);
  } catch (error) {
    console.error("Error fetching one product per brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/v1/allBrandsWithImages", async (req, res) => {
  try {
    const distinctBrands = await productsCollection.distinct("brand");
    const brandsWithImages = [];

    for (const brand of distinctBrands) {
      const brandData = await productsCollection.findOne({ brand });
      if (brandData && brandData.images && brandData.images.length > 0) {
        // Assuming the first image in the array is the brand image
        const brandImage = brandData.images[0];
        brandsWithImages.push({ brand, brandImage });
      } else {
        // If no image is available for the brand, add a placeholder image
        brandsWithImages.push({ brand, brandImage: "placeholder-image-url" });
      }
    }

    res.json(brandsWithImages);
  } catch (error) {
    console.error("Error fetching brands with images:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/v1/allBrandsWithImagesAndProducts", async (req, res) => {
  try {
    const distinctBrands = await productsCollection.distinct("brand");
    const brandsWithImagesAndProducts = [];

    for (const brand of distinctBrands) {
      const brandData = await productsCollection.find({ brand });
      if (brandData && brandData.length > 0) {
        const brandImage = brandData[0].images[0]; // Assuming the first image in the array is the brand image
        brandsWithImagesAndProducts.push({
          brand,
          brandImage,
          products: brandData,
        });
      } else {
        brandsWithImagesAndProducts.push({
          brand,
          brandImage: null,
          products: [],
        });
      }
    }

    res.json(brandsWithImagesAndProducts);
  } catch (error) {
    console.error("Error fetching brands with images and products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint to retrieve top electronic gadgets brands
// app.get("/api/v1/topElectronicGadgets", async (req, res) => {
//   try {
//     const topBrands = await productsCollection
//       .aggregate([
//         {
//           $group: {
//             _id: "$brand",
//           },
//         },
//       ])
//       .toArray();

//     // Get full data for each top brand
//     const topBrandData = await Promise.all(
//       topBrands.map(async (brand) => {
//         const brandData = await productsCollection
//           .find({ brand: brand._id })
//           .toArray();
//         return {
//           brand: brand._id,
//           products: brandData,
//         };
//       })
//     );
//     res.json(topBrandData);
//   } catch (err) {
//     console.error("Error:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// our top products
app.get("/api/v1/popularitems", async (req, res) => {
  try {
    const topBrands = await productsCollection
      .aggregate([
        {
          $group: {
            _id: "$brand",
            averageRating: { $avg: "$ratings" },
          },
        },
        {
          $sort: { averageRating: -1 },
        },
        {
          $limit: 6,
        },
      ])
      .toArray();

    // Get full data for each top brand
    const topBrandData = await Promise.all(
      topBrands.map(async (brand) => {
        const brandData = await productsCollection
          .find({ brand: brand._id })
          .toArray();
        return {
          brand: brand._id,
          averageRating: brand.averageRating,
          products: brandData,
        };
      })
    );
    res.json(topBrandData);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
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
