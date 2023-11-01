const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oiitlmi.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = async(req,res,next)=>{
    const token =req.cookies?.token;
    // console.log('token from verify token',token)
    if(!token){
        return res.status(401).send({message: 'not authorized'})
    }
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) => {
        if(err){
            console.log(err);
            return res.status(401).send({message: 'unauthorized'})
        }
        // console.log('value in the token',decoded);
        req.user=decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const serviceCollection = client.db('carDoctor').collection('services');
        const bookingsCollection = client.db('carDoctor').collection('bookings');

        //auth related api
        app.post('/jwt',(req,res)=>{
            const user = req.body;
            const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'});
            res
            .cookie('token',token,{
                httpOnly: true,
                secure: true,
                sameSite: "none"
            })
            .send({success: true})

        }) 

        app.post('/logout',async(req,res)=>{
            const user = req.body;
            res.clearCookie('token', {maxAge: 0}).send({success: true})
        })


        //booking related api
        app.get('/services',async(req,res)=>{
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const options = {
                projection: {title: 1, price: 1, img: 1}
            }
            const result = await serviceCollection.findOne(query,options);
            res.send(result);
        })
        
        //Booking collectin...

        app.get('/bookings',verifyToken,async(req,res)=>{
            let query = {};
            // console.log(req.cookies.token)
            // console.log('user in the valid token',req.user)
            if(req.query?.email !== req.user.email){
                return res.status(403).send({message: 'forbidden access'})
            }
            if(req.query?.email){
                query = {email: req.query.email}
            }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/bookings',async(req,res)=>{
            const bookingData = req.body;
            console.log(bookingData)
            const result = await bookingsCollection.insertOne(bookingData);
            res.send(result);
            
        })

        app.patch('/bookings/:id',async(req,res)=>{
            const id = req.params.id;
            const updateBooking =req.body;
            const filter = {_id: new ObjectId(id)};

            const updateDoc = {
                $set: {
                  status: updateBooking.status
                },
              };
              const result = await bookingsCollection.updateOne(filter,updateDoc);
              res.send(result);
        })

        app.delete('/bookings/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('car doctor server is running...');
})

app.listen(port, () => {
    console.log(`car doctor server is running on port: ${port}`)
})