const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

//middleware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send("bistro boss server is running")
})




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pdscwoz.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();

    const usersCollection = client.db("restaurantRecipes").collection("users")
    const menuCollection = client.db("restaurantRecipes").collection("menu")
    const cartCollection = client.db("restaurantRecipes").collection("cart")


    //middleware
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token',req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      // if(!token){
      //   return res.status(401).send({message: 'forbidden access'})
      // }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
          return res.status(401).send({message: 'unauthorized access'})
        }
        req.decoded = decoded
        next()
      })
    }

    const verifyAdmin = async(req, res, next)=>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
    }
    //jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" })
      res.send({ token })
    })
    //users related api

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/admin/:email',verifyToken, async(req, res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      let admin= false;
      if(user){
        admin = user?.role === 'admin'
      }
      console.log(admin);
      res.send({admin})
    })

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })

    app.patch("/users/admin/:id",  verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.post("/users", async (req, res) => {
      const users = req.body;
      const query = { email: users.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null })
      }
      const result = await usersCollection.insertOne(users)
      res.send(result)
    })

    app.get("/menus", async (req, res) => {
      const result = await menuCollection.find().toArray()
      res.send(result)
    })

    app.post('/menus', verifyToken, verifyAdmin, async(req, res)=>{
      const item = req.body;
      const result = await menuCollection.insertOne(item)
      res.send(result)
    })
    app.get("/menus/:id", async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menuCollection.findOne(query)
      res.send(result)
    })

    app.patch("/menus/:id", async(req, res)=>{
      const item = req.body;
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }
      const result = await menuCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    app.delete('/menus/:id',verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menuCollection.deleteOne(query)
      res.send(result)
    })


    app.get("/carts", async (req, res) => {
      const queryEmail = req.query.email;
      const query = { email: queryEmail }
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem)
      res.send(result)
    })

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`bistro boss server is running port: ${port}`);
})