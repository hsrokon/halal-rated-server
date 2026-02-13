const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());    
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aczhr3x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();

    const HalalRatedDB = client.db('HalalRatedDB');
    const placeCollection = HalalRatedDB.collection('places');

    app.post('/places', async(req, res)=> {
      const placeData = req.body;

      const id = req.query?.selectedPlaceId
      // for existing place
      if (id) {
        const result = await placeCollection.updateOne(
          {_id : new ObjectId(id)},
          { $inc : {reviewCount : 1}})//increase by 1
        return res.send(result);
      } 

      //for new place
      placeData.enlistedIn = new Date();
      placeData.reviewCount = 1;
      const result = await placeCollection.insertOne(placeData);
      res.send({
        insertedId : result.insertedId,
        placeId : result.insertedId
      });
    })

    // Getting the existing shop names for a specific region, country, and city
    app.get('/places', async(req, res)=> {
      const { region, country, city } = req.query;
      const query = { region, country, city };

      const shops = await placeCollection
      .find(query)
      .project({ placeName : 1, placeSpecificLocation: 1, _id: 1 })// querying name and specific location
      .toArray();

      res.send(shops);
    });


    //reviews
    const reviewCollection = HalalRatedDB.collection('reviews');

    app.post('/addReviews', async(req, res)=> {
      const review = req.body;
      
      if (review.placeId) {
        review.createdAt = new Date();
        const result = await reviewCollection.insertOne(review);
        return res.send(result);
      }
      
    })

    app.get('/reviews', async(req, res)=> {
      const result =  await reviewCollection.find().toArray();
      res.send(result);
    })

    app.get('/reviews/:shopId', async(req, res)=> {
      const query = {
        placeId : req.params.shopId
      };

      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    })


    const users = client.db('HalalRatedDB').collection('users');

    app.post('/users', async(req, res)=> {
      const result = await users.insertOne(req.body);
      res.send(result);
    })

    app.patch('/users', async(req, res)=> {
      const query = {email: req.body.email};
      const updateField = {
        $set: {
          lastLoggedIn : req.body.lastLoggedIn
        }
      }
      const result = await users.updateOne(query, updateField)
    })

    app.get('/users/:email', async(req, res)=> {
      const query = {email : req.params.email};
      const user = await users.findOne(query);
      if (user) {
        res.status(200).send(user)
      } else {
        res.status(404).send({message: 'User not found'})
      }
    })


    app.get('/shops', async(req, res)=> {
      const query = {
        placeType : 'Shop'
      }
      const result = await placeCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/shops/:id', async(req, res)=> {
      
      const query = {
        _id : new ObjectId(req.params.id)
      };

      const result = await placeCollection.findOne(query);
      res.send(result); 
    })




    // This helps MongoDB quickly retrieve the latest reviews when you sort like this:
    // const latestReviews = await reviewCollection.find().sort({ createdAt: -1 }).limit(10).toArray();

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close(); 
  }
}
run().catch(console.dir);


app.get('/', (req, res)=> {
    res.send("Halal Rated Server running successfully.");
})

app.listen(port, ()=>{
    console.log(`Server running on port ${port}.`);
})
//Need to fix env