const express = require('express')
const cors = require('cors')
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tdjlbxg.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req,res,next){
    console.log('token inside',req.headers.authorization);
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('unauthorized access')
    }
    const token=authHeader.split(' ')[1];
    jwt.verify(token,process.env.ACCESS_TOKEN,function(error,decoded){
        if(error){
            return res.status(403).send({message:'forbidden access'})
        }
        req.decoded = decoded;
        next();
    })
}

async function run(){
    try{
        const categoriesCollection = client.db('furnitureReseal').collection('categories');
        const categoriesDetailsCollection = client.db('furnitureReseal').collection('categoriesDetails');
        const bookingCollection = client.db('furnitureReseal').collection('bookings');
        const buyersCollection = client.db('furnitureReseal').collection('buyers');
        const paymentsCollection = client.db('furnitureReseal').collection('payments');
        const productsCollection = client.db('furnitureReseal').collection('products');
        const allBuyersCollection = client.db('furnitureReseal').collection('allBuyers');

        app.get('/categories',async(req,res)=>{
            const query = {};
            const cursor = categoriesCollection.find(query);
            const categories = await cursor.toArray();
            res.send(categories)
        })

          app.post('/bookings',async(req,res)=>{
            const booking = req.body;
            console.log(booking);
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
          })
        
          app.get('/bookings',verifyJWT,async(req,res)=>{
            const email = req.query.email;
            const decodedEmail =req.decoded.email;
            if(email !== decodedEmail){
                return res.status(403).send({message:'forbidden access'})
            }
            const query = {email:email};
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
          })

          app.get('/bookings/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const booking = await bookingCollection.findOne(query);
            res.send(booking)
          })
         

          app.post('/create-payment-intent',async(req,res)=>{
              const booking = req.body;
              const price = booking.price;
              const amount = price * 100;
              const paymentIntent= await stripe.paymentIntents.create({
                currency: "usd",
                amount:amount,
                "payment_method_types": [
                  "card"
                ],
              });
              res.send({
                clientSecret: paymentIntent.client_secret,
              });
          })

          // needed for seller & user

          app.post('/payments',async(req,res)=>{
            const payment=req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = {_id:ObjectId(id)};
            const updateDoc = {
                $set:{
                  paid:true,
                  transactionId:payment.transactionId
                }
            }
            const updateResult = await bookingCollection.updateOne(filter,updateDoc);
            res.send(result);
          })

          app.get('/jwt',async(req,res)=>{
            const email = req.query.email;
            const query={email:email};
            const buyer = await buyersCollection.findOne(query);
            console.log(buyer)
            if(buyer){
                const token=jwt.sign({email},process.env.ACCESS_TOKEN,{expiresIn:'10days'});
                return res.send({accessToken:token});
            }
            res.status(403).send({accessToken:''})
          })

          app.get('/buyers',async(req,res)=>{
                const query = {};
                const buyers = await buyersCollection.find(query).toArray();
                res.send(buyers);
          })

          // seller add product
          
          // app.get('/addproducts',async(req,res)=>{
          //   const query={};
          //   const products = await productsCollection.find(query).toArray();
          //   res.send(products);
          // })

          app.get('/category',async(req,res)=>{
            const query={};
            const products = await productsCollection.find(query).toArray();
            res.send(products);
          })

          // app.get('/addproducts/:category_id',async(req,res)=>{
          //   const id = req.params.category_id;
          //   const query = {category_id:id};
          //   console.log(id,query)
          //   const result = await productsCollection.find(query).toArray();
          //   res.send(result);
          // })
          app.get('/category/:category_id',async(req,res)=>{
            const id = req.params.category_id;
            const query = {category_id:id};
            console.log(id,query)
            const result = await productsCollection.find(query).toArray();
            res.send(result);
          })
          // my products

         app.get('/product',async(req,res)=>{
             const email = req.query.email;
            const query = {email:email};
            const myproducts = await productsCollection.find(query).toArray();
            res.send(myproducts)
          })

          app.get('/product/:id',async(req,res)=>{
            const id = req.params.id;
           const query = { _id: ObjectId(id) };
           const myproducts = await productsCollection.find(query).toArray();
           res.send(myproducts)
         })

          app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    soldstatus: 'true'
                }
            }
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.delete('/product/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

          // app.put('/buyers/:email',async(req,res)=>{
          //   const email = req.params.email;
          //   const user = req.body;
          //   const filter = {email:email};
          //   const options = {upsert:true};
          //   const updateDoc = {
          //     $set:Buyer,
          //   }
          //   const result = await buyersCollection.updateOne(filter,updateDoc,options);
          //   res.send(updateDoc);
          // })
        
          
          app.post('/buyers',async(req,res)=>{
            const buyer = req.body;
            const result = await buyersCollection.insertOne(buyer);
            res.send(result);
          })

          // seller kina
          app.get('/buyers/Seller/:email',async(req,res)=>{
            const email = req.params.email;
            const query = {email:email};
            const buyer = await buyersCollection.findOne(query);
            res.send({isSeller:buyer?.role === 'Seller'});
          })
          
          // all buyer all seller re dekhanir shomoy lagbo
          app.get('/buyers/admin/:email',async(req,res)=>{
            const email = req.params.email;
            const query = {email};
            const buyer = await buyersCollection.findOne(query);
            res.send({isAdmin:buyer?.role === 'admin'});
          })

          app.put('/buyers/admin/:id',verifyJWT,async(req,res)=>{
              const decodedEmail=req.decoded.email;
              const query={email:decodedEmail};
              const buyer = await buyersCollection.findOne(query);
              if(buyer?.role !== 'admin'){
                return res.status(403).send({message:'forbidden access'})
              }
              const id = req.params.id;
              const filter = {_id:ObjectId(id)};
              const options = {upsert:true};
              const updateDoc ={
                $set:{
                    role:'admin'
                }
              }
              const result = await buyersCollection.updateOne(filter,updateDoc,options);
              res.send(result);
          })

          app.put('/buyers/Seller/:id',verifyJWT,async(req,res)=>{
            const decodedEmail=req.decoded.email;
            const query={email:decodedEmail};
            const buyer = await buyersCollection.findOne(query);
            if(buyer?.role !== 'admin'){
              return res.status(403).send({message:'forbidden access'})
            }
            const id = req.params.id;
            const filter = {_id:ObjectId(id)};
            const options = {upsert:true};
            const updateDoc ={
              $set:{
                  verify:'true',
              }
            }
            const result = await buyersCollection.updateOne(filter,updateDoc,options);
            res.send(result);
        })

          app.post('/product',async(req,res)=>{
              const product = req.body;
              const result = await productsCollection.insertOne(product);
              res.send(result);
          })

          app.get('/product',async(req,res)=>{
            const product = req.body;
            const result = await productsCollection.find(product).toArray();
            res.send(result);
          })

          app.get('/categoriesname',async(req,res)=>{
              const query ={};
              const result = await categoriesCollection.find(query).project({category_name:1}).toArray();
              res.send(result);
          })

          // all buyers
          app.get('/allbuyer',async(req,res)=>{
            const query = {role:"Buyer"};
            const sellers = await buyersCollection.find(query).toArray();
            res.send(sellers);
          })
          
        // all sellers
          app.get('/allseller',async(req,res)=>{
            const query = {role:"Seller"};
            const sellers = await buyersCollection.find(query).toArray();
            res.send(sellers);
          })
          
         

         

          app.get('/allseller/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await buyersCollection.findOne(query);
            res.send(result);
          })
          app.delete('/allseller/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await buyersCollection.deleteOne(query);
            res.send(result);
          })

          app.get('/allbuyer/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await buyersCollection.findOne(query);
            res.send(result);
          })
          app.delete('/allbuyer/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await buyersCollection.deleteOne(query);
            res.send(result);
          })
    }
    finally{

    }
}
run().catch(error => console.error(error))

app.get('/',async(req,res)=>{
    res.send('Furniture Reseal Server Running')
})

app.listen(port,()=>{
    console.log(`Furniture server running on port ${port}`)
})