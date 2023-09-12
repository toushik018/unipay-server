const express = require("express");
const cors = require("cors");
const SSLCommerzPayment = require('sslcommerz-lts');

const nodemailer = require("nodemailer");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { ObjectId } = require('mongodb');
require("dotenv").config();
const app = express();

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());



// Send Grid

const paymentConfirmEmail = (order) => {
  const studentEmail = order.order.email;
  const date = order.order.date;
  const orderId = order.transactionId;
  const studentName = order.order.name;
  const studentId = order.order.userId;
  const studentBatch = order.order.userBatch;
  const TourTitle = order.tour.destination;
  const totalPrice = order.tour.cost;


  const pdfDoc = new PDFDocument();

  // Pipe the PDF content to a writable stream
  const pdfStream = fs.createWriteStream('invoice.pdf');
  pdfDoc.pipe(pdfStream);

  // Function to add a heading with styles
  function addHeading(text, fontSize, color, align, margin) {
    pdfDoc.font('Helvetica-Bold')
      .fontSize(fontSize)
      .fillColor(color)
      .text(text, { align: align, continued: false })
      .moveDown(margin);
  }

  // Function to add a paragraph with styles
  function addParagraph(text, fontSize, color, align, margin) {
    pdfDoc.font('Helvetica')
      .fontSize(fontSize)
      .fillColor(color)
      .text(text, { align: align, continued: false })
      .moveDown(margin);
  }

  // Header
  pdfDoc.rect(0, 0, 610, 130)
    .fill('#e1e1e1');

  pdfDoc.image('./logo.png', 60, 30, { width: 80, height: 80 });
  addHeading('Invoice from DPMS', 24, '#0EADF0', 'center', 2);



  // Order Details
  pdfDoc.rect(20, 130, 560, 300)
    .fill('#ffffff');

  addHeading(`Destination: ${TourTitle}`, 18, '#5b5b5b', 'left', 1);

  addParagraph(`Order ID: ${orderId}`, 14, '#5b5b5b', 'left', 0.5);
  addParagraph(`Student Name: ${studentName}`, 14, '#5b5b5b', 'left', 0.5);
  addParagraph(`Student Email: ${studentEmail}`, 14, '#5b5b5b', 'left', 0.5);
  addParagraph(`Date: ${date}`, 14, '#5b5b5b', 'left', 0.5);
  addParagraph(`Total Price: ${totalPrice} BDT`, 14, '#5b5b5b', 'left', 0.5);


  pdfDoc.rect(20, 320, 560, 100)
    .fill('#f7f7f7');

  addHeading('Student Details', 16, '#5b5b5b', 'left', 0.5);

  addParagraph(`Student Batch: ${studentBatch}`, 14, '#5b5b5b', 'left', 0.5);
  addParagraph(`Student Id: ${studentId}`, 14, '#5b5b5b', 'left', 0.5);

  // End the PDF document
  pdfDoc.end();

  // Send email with PDF attachment
  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });

  transporter.sendMail({
    from: 'toushikahmmed@gmail.com',
    to: studentEmail,
    subject: 'Your Invoice from DPMS',
    text: 'Thank you for using DPMS.',
    attachments: [
      {
        filename: 'invoice.pdf',
        content: fs.createReadStream('invoice.pdf')
      }
    ]
  }, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

  // Remove the temporary PDF file
  pdfStream.on('finish', () => {
    fs.unlink('invoice.pdf', (err) => {
      if (err) {
        console.error('Error deleting temporary PDF file:', err);
      }
    });
  });
};

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qesst1e.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const store_id = process.env.SSL_store_id;
const store_passwd = process.env.SSL_store_pass;
const is_live = false; // true for live, false for sandbox

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)

    const toursCollection = client.db("toursDB").collection("tours");
    const clubsCollection = client.db("toursDB").collection("clubs");
    const usersCollection = client.db("toursDB").collection("users");
    const orderCollection = client.db("toursDB").collection("clubOrders");
    const tourOrdersCollection = client.db("toursDB").collection("tourOrders");

    // User APIs

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email, id: user.studentId, photoURL: user.photoURL };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists' });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Admin APIs

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Tour APIs

    app.get("/tours", async (req, res) => {
      const result = await toursCollection.find().toArray();
      res.send(result);
    });

    app.get("/tours/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await toursCollection.findOne(query);
      res.send(result);
    });



    app.post("/tours", async (req, res) => {
      const tour = req.body;
      const result = await toursCollection.insertOne(tour);
      res.send(result);
    });

    // Club APIs

    app.post("/clubs", async (req, res) => {
      const club = req.body;
      const result = await clubsCollection.insertOne(club);
      res.send(result);
    });

    app.get("/clubs", async (req, res) => {
      const result = await clubsCollection.find().toArray();
      res.send(result);
    });

    app.get("/clubs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await clubsCollection.findOne(query);
      res.send(result);
    });





    // -------------------------   Payment APIs - Clubs -------------



    const tran_id = new ObjectId().toString();

    app.post("/order", async (req, res) => {
      const { clubId, price, timestamp,paymentType } = req.body;
      const club = await clubsCollection.findOne({ _id: new ObjectId(clubId) });
      const order = {
        ...req.body, // Include all existing fields from req.body
        paymentType, // Add paymentType
      };

      // console.log(order);

      const data = {
        total_amount: price,
        currency: "BDT",
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `http://localhost:5000/payment/success/${tran_id}`,
        fail_url: `http://localhost:5000/payment/fail/${tran_id}`,
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: club?.clubName,
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: order.name,
        cus_email: order.email,
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: order.mobile,
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
        order_date: order.date,
        timestamp: timestamp,
      };

      console.log(data);

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to the payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });

        const finalOrder = {
          club,
          order,
          paidStatus: false,
          transactionId: tran_id
        };
        const result = orderCollection.insertOne(finalOrder);

        console.log('Redirecting to: ', GatewayPageURL);
      });


      app.post("/payment/success/:tranId", async (req, res) => {
        console.log(req.params.tranId);
        const result = await orderCollection.updateOne({ transactionId: req.params.tranId }, {
          $set: {
            paidStatus: true
          }
        });
        if (result.modifiedCount > 0) {
          res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`);
        }
      });

      app.post("/payment/fail/:tranId", async (req, res) => {
        const result = await orderCollection.deleteOne({ transactionId: req.params.tranId });

        if (result.deletedCount) {
          res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)
        }


      })


    });

    app.get("/orders", async (req, res) => {
      const result = await orderCollection.find({ paidStatus: true }).toArray();
      res.send(result);
    });




    // -------------------------   Payment APIs - Tours -------------




    app.post("/tourorders", async (req, res) => {
      const { tourId } = req.body;
      const tour = await toursCollection.findOne({ _id: new ObjectId(tourId) });
      const order = req.body;
      
      const data = {
        total_amount: tour?.cost,
        currency: "BDT",
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `http://localhost:5000/payment/success/${tran_id}`,
        fail_url: `http://localhost:5000/payment/fail/${tran_id}`,
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: tour?.destination,
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: order.name,
        cus_email: order.email,
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: order.mobile,
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
        order_date: order.date,
        stu_batch: order.userBatch,
        stu_id: order.userId
      };

      console.log(data);

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to the payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });

        const finalOrder = {
          tour,
          order,
          paidStatus: false,
          transactionId: tran_id
        };
        const result = tourOrdersCollection.insertOne(finalOrder);

        console.log('Redirecting to: ', GatewayPageURL);
      });


      app.post('/payment/success/:tranId', async (req, res) => {

        const { tranId } = req.params;

        const clubOrder = await tourOrdersCollection.findOne({ transactionId: tranId });

        paymentConfirmEmail(clubOrder);

        const result = await tourOrdersCollection.updateOne({ transactionId: req.params.tranId }, {
          $set: {
            paidStatus: true,
          },
        });

        if (result.modifiedCount > 0) {
          res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`)
        }
      });

      app.post("/payment/fail/:tranId", async (req, res) => {
        const result = await tourOrdersCollection.deleteOne({ transactionId: req.params.tranId });

        if (result.deletedCount) {
          res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)
        }
      })
    });





    app.get("/tourorders", async (req, res) => {
      const result = await tourOrdersCollection.find({ paidStatus: true }).toArray();
      res.send(result);
    });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Portal is running");
});

app.listen(port, () => {
  console.log(`The portal is up on ${port}`);
});
