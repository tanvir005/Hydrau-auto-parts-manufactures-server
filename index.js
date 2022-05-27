const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xfp4g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized access.' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECREAT, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbiden Access' })
    }
    req.decoded = decoded;
    next();
  });
}



async function run() {
  try {

    await client.connect();

    const partsCollection = client.db('auto_parts_manufactures').collection('parts');
    const userCollection = client.db('auto_parts_manufactures').collection('users');
    const orderCollection = client.db('auto_parts_manufactures').collection('orders');
    const reviewCollection = client.db('auto_parts_manufactures').collection('reviews');



    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }

    }




    //putting parts in the db
    app.post('/parts', verifyJWT, verifyAdmin, async (req, res) => {
      const parts = req.body;
      const query = { name: parts.name, description: parts.description, availableQuantity: parts.availableQuantity, minOrderQuantity: parts.minOrderQuantity, unitPrice: parts.unitPrice, img: parts.img };
      const exist = await partsCollection.findOne(query);
      if (exist) {
        return res.send({ success: false, parts: exist })
      }
      const result = await partsCollection.insertOne(parts);
      return res.send({ success: true, result });
    });

    //get all parts to show
    app.get('/parts', async (req, res) => {
      const query = {};
      const cursor = partsCollection.find(query);
      const parts = await cursor.toArray();
      res.send(parts);
    });

    //geeting single part for purchase
    app.get('/parts/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await partsCollection.findOne(query);
      res.send(part);
    });


    //updating the quantity after purchase
    app.put('/parts/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const requestedQuantity = req.body.quantity;

      const filter = { _id: ObjectId(id) };
      const part = await partsCollection.findOne(filter);
      const quantity = part.availableQuantity;
      const newQuantity = quantity - requestedQuantity;

      const options = { upsert: true };
      const updatedDoc = {
        $set:
        {
          availableQuantity: newQuantity
        },
      };
      const result = await partsCollection.updateOne(filter, updatedDoc, options);

      res.send(result);
    });



    //make user 
    app.put('/user/:email',  async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updatedDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECREAT, { expiresIn: '1d' });
      res.send({ result, token });
    });

      //checking admin from database
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send(isAdmin);
    });

    //orderCollection 
    app.post('/orders', verifyJWT, async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      return res.send({ success: true, result });
    });

    //reviews
    app.post('/reviews', verifyJWT, async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      return res.send({ success: true, result });
    });
    

    //getting all orders of a user 
    app.get('/orders/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const orders = await orderCollection.find({ email: email }).toArray();
     
      res.send(orders);
    });

     //getting all orders form db
     app.get('/orders', verifyJWT, verifyAdmin, async (req, res) => {
      const orders = await orderCollection.find().toArray();
      res.send(orders);
    });

    //updating status of a order
    app.put('/orders/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const order = req.body;
      const options = { upsert: true };
      const updatedDoc = {
        $set: order,
      };
      const result = await orderCollection.updateOne(filter, updatedDoc, options);
      res.send( result);
    });

  
   

  }
  finally {

  }

}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('auto_parts_manufactures server running perfectly')
})

app.listen(port, () => {
  console.log(`auto_parts_manufactures listening on port ${port}`)
})