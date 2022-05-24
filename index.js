const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

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

        app.post('/parts', async (req, res)=>{
            const parts = req.body;
            const query = {name: parts.name, description: parts.description, availableQuantity: parts.availableQuantity, minOrderQuantity: parts.minOrderQuantity, unitPrice: parts.unitPrice, img: parts.img};
            const exist = await partsCollection.findOne(query);
            if(exist){
                return res.send({ success: false, parts: exist })
            }
            const result = await partsCollection.insertOne(parts);
            return res.send({ success: true, result });
        });

        app.get('/parts',  async (req, res) => {
            const query = {};
            const cursor = partsCollection.find(query);
            const parts = await cursor.toArray();
      
            res.send(parts);
          });



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