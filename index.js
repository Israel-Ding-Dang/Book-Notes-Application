import express from "express";
import bodyParser from "body-parser";
import pg from "pg"
import axios from "axios";
import env from "dotenv";

const app = express();
const port = 3000;
env.config();

const db = new pg.Client({    
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

db.connect();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Route to render the main page
app.get("/", async (req, res) => {
    
    try {
        const result = await db.query("SELECT * FROM book_notes ORDER BY rating DESC");
        console.log(result.rows);
        
        // Convert each image buffer to base64
        const notes = result.rows.map(note => {
            if (note.image) {                
                note.image = note.image.toString('base64');
            }
            return note;
        });

        res.render("index.ejs", { notes });       
    } catch (error) {
        console.error("Error fetching book notes:", error);
    }
});

//Route to render the form for creating a new book note
app.get("/new", (req, res) => {
    res.render("modify.ejs", {
        heading: "New Book Entry",
        submit: "Create Book Note"
    });
});

//Route for creating a new post
app.post("/newBookEntry", async (req, res) => {    
    try {
        const { isbn, title, authors, date_read, rating, notes } = req.body;

        const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`, { responseType: 'arraybuffer' });        
        const imageData = response.data;

        // Insert the new book entry into the database
        try {
            await db.query("INSERT INTO book_notes (isbn, title, authors, date_read, rating, notes, image) VALUES ($1, $2, $3, $4, $5, $6, $7);", [isbn, title, authors, date_read, rating, notes, imageData]);

            res.redirect("/");
        } catch (error) {
            console.log("Error inserting book entry into database:", error);
        }       

    } catch (error) {
        console.log("Error fetching image cover from API:", error);             
    }
});

//Route for rendering the edit form
app.get("/edit/:id", async (req, res) => {
    const id = req.params.id;
    const result = await db.query("SELECT * FROM book_notes WHERE id = ($1);", [id]);
    const posts = result.rows[0];
    
    res.render("modify.ejs", {
        heading: "Edit Current Note",
        submit: "Update Post",
        note: posts,
    });
    
});

//Route for partially updating an entry
app.post("/edit/note/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const { isbn, title, authors, date_read, rating, notes } = req.body;
        
        await db.query("UPDATE book_notes SET isbn = $1, title = $2, authors = $3, date_read = $4, rating = $5, notes = $6 WHERE id = $7;", [isbn, title, authors, date_read, rating, notes, id]);

        res.redirect("/");
    } catch (error) {
        console.log("Error sending notes to database:", error);        
    }
});

//Route for deleting a book entry
app.get("/delete/:id", async (req, res) => {
    try {
        const id = req.params.id;

        await db.query("DELETE FROM book_notes WHERE id = $1", [id]);
        res.redirect("/");
    } catch (error) {
        console.log("Error deleting entry from database:", error);
    }
});

//Sorting books by title
app.get("/title", async (req, res) => {        
    const result = await db.query("SELECT * FROM book_notes ORDER BY title");    
        
    // Convert each image buffer to base64
    const notes = result.rows.map(note => {        
        if (note.image) {                
            note.image = note.image.toString('base64');
        }
        return note;
    });

    res.render("index.ejs", { notes });    
});

//Sorting book by most recent read
app.get("/newest", async (req, res) => {        
    const result = await db.query("SELECT * FROM book_notes ORDER BY date_read DESC");
    console.log(result.rows);
        
    // Convert each image buffer to base64
    const notes = result.rows.map(note => {        
        if (note.image) {                
            note.image = note.image.toString('base64');
        }
        return note;
    });

    res.render("index.ejs", { notes });    
});

//Sorting according to rating
app.get("/best", (req, res) => {
    res.redirect("/");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});