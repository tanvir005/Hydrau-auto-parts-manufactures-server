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


async function run() {
  try {

    await client.connect();
    const partsCollection = client.db('auto_parts_manufactures').collection('parts');
    const userCollection = client.db('auto_parts_manufactures').collection('users');
    const orderCollection = client.db('auto_parts_manufactures').collection('orders');

    //putting parts in the db
    app.post('/parts', async (req, res) => {
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
    app.get('/parts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await partsCollection.findOne(query);
      res.send(part);
    });


    //updating the quantity after purchase
    app.put('/parts/:id', async (req, res) => {
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
    app.put('/user/:email', async (req, res) => {
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

    //chacking admin 
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send(isAdmin);
    });

    //orderCollection 
    app.post('/orders', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      return res.send({ success: true, result });
    });

    //getting all orders of a user
    app.get('/orders/:email', async (req, res) => {
      const email = req.params.email;
      const orders = await orderCollection.find({ email: email }).toArray();
     
      res.send(orders);
    })

  }
  finally {

  }

}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('auto_parts_manufactures server running')
})

app.listen(port, () => {
  console.log(`auto_parts_manufactures listening on port ${port}`)
})