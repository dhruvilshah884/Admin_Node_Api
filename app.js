const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("./models/user");
const Admin = require("./models/admin");
const multer = require("multer");
const session = require("express-session");
const stripe = require("stripe")(
  "sk_test_51ONZYOSAJLtohZuHS2V3Qc2dexwtqMVBLEq3J0kVpIGoREaoVCHtDyihllEZEza3vL3XlWfLBNCHauNycXnAMTu000SGNO2iam"
);
const cors = require("cors");
const MongoStore = require("connect-mongo");

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

mongoose.connect("mongodb://127.0.0.1:27017/react-node").then(() => {
  console.log("Database connected");
});
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    secure: true,
    saveUninitialized: true,
    cookie: { secure: false },
    store: MongoStore.create({
      mongoUrl: "mongodb://127.0.0.1:27017/react-node",
      ttl: 24 * 60 * 60,
    }),
  })
);

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Create the multer instance
const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.status(201).json({ message: "Hello from backend API" });
});

app.post("/signup", async (req, res) => {
  let { name, email, password, role } = req.body;
  role = role ? "admin" : "user"; // Default role if not admin

  const token = jwt.sign({ email }, "sjkvdbaskjdvakjs", { expiresIn: "1h" });
  const user = new User({ name, email, password, role, token });
  await user.save();
  res.status(201).json(user);
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (user.password !== password) {
      return res.status(400).json({ message: "Password is incorrect" });
    }
    req.session.user = { _id: user._id, email: user.email };
    res.status(201).json({ message: `${user.role} login successfully`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/add", upload.single("image"), async (req, res) => {
  try {
    const { product_name, product_price } = req.body;
    const product_image = req.file.filename;
    const admin = new Admin({ product_name, product_price, product_image });
    await admin.save();
    res.status(201).json(admin);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

app.get("/user", async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ message: "User not found, please login first" });
    }
    const users = await Admin.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/add-to-cart", async (req, res) => {
  try {
    let { productId } = req.body;
    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res
        .status(401)
        .json({ message: "user not found please login first " });
    }
    const index = await user.cart.findIndex(
      (item) => item.product.toString() === productId
    );
    if (index !== -1) {
      user.cart[index].quantity++;
    } else {
      user.cart.push({ product: productId, quantity: 1 });
    }
    user.isPayment = false;
    await user.save();
    res.status(201).json({ message: "product add successfully" });
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
});
app.get("/cart", async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).populate({
      path: "cart.product",
      model: "admin",
    });
    if (!user) {
      return res
        .status(401)
        .json({ message: "user not found please first login" });
    }
    const cart = user.cart;
    res.status(201).json(cart);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});
app.post("/increment", async (req, res) => {
  try {
    let { productId } = req.body;
    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res
        .status(401)
        .json({ message: "user not found please login first " });
    }
    const cart = await user.cart.find(
      (item) => item.product.toString() === productId
    );
    if (!cart) {
      return res.status(401).json({ message: "product not found in cart" });
    }
    cart.quantity++;
    await user.save();
    res.status(201).json({ message: "quantity incremented successfully" });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});
app.post("/decrement", async (req, res) => {
  try {
    let { productId } = req.body;
    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res
        .status(401)
        .json({ message: "user not found please login first " });
    }
    const cart = await user.cart.find(
      (item) => item.product.toString() === productId
    );
    if (!cart) {
      return res.status(401).json({ message: "product not found in cart" });
    }
    if (cart.quantity > 1) {
      cart.quantity--;
    }
    await user.save();
    res.status(201).json({ message: "quantity decremented successfully" });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});
app.post("/remove", async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user._id; // Assuming you use sessions for authentication

    // Find the user by ID and update the cart
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found. Please login first." });
    }

    // Remove the item from cart based on productId
    user.cart = user.cart.filter(
      (item) => item.product.toString() !== productId
    );

    await user.save();

    res
      .status(200)
      .json({ message: "Product removed successfully from cart." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/payment-process", async (req, res) => {
  const { totalPrice, userEmail, productName, userId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
            },
            unit_amount: totalPrice * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:5000/success", 
      cancel_url: "http://localhost:3000/cancel",
      customer_email: userEmail,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating Stripe session:", error);
    res.status(500).send("Internal Server Error");
  }
});


// GET endpoint to handle successful payment
app.get('/success',async(req,res)=>{
  try{
    let user = await User.findById(req.session.user._id)
    if(!user){
      res.status(401).json({message:"user not found please login first"})
      console.log('user not found ')
    }
    user.isPayment = true
    user.cart = []
    await user.save()
     res.redirect('http://localhost:3000/success')
  }catch(error){
    console.log(error)
  }
})


app.get("/cancel", (req, res) => {
  res.send("payment unsuccessful");
});
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(401).json({ message: "logout cannot be performed " });
    } else {
      res.clearCookie("connect.sid");
      res.status(201).json({ message: "logout successfully please login" });
    }
  });
});

app.listen(5000, () => {
  console.log("connect");
});
