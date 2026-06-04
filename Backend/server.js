const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Project = require("./models/Project");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected 🚀");
})
.catch((error) => {
    console.log(error);
});

app.get("/", (req, res) => {
    res.send("Backend server running 🚀");
});

app.get("/api/message", (req, res) => {
    res.json({
        message: "Hello from backend 🚀"
    });
});

app.post("/save-project", async (req, res) => {

    try {

        const newProject = new Project({

            elements: req.body.elements,

            background: req.body.background

        });

        await newProject.save();

        console.log("Project Saved To MongoDB 🚀");

        res.json({
            success: true,
            message: "Project permanently saved 🚀"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Database save failed"
        });

    }

});
app.get("/projects", async (req, res) => {

    try {

        const projects = await Project.find().sort({
            createdAt: -1
        });

        res.json(projects);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Failed to fetch projects"
        });

    }

});
app.delete("/delete-project/:id", async (req, res) => {

    try {

        await Project.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: "Project deleted 🚀"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Delete failed"
        });

    }

});
app.listen(5000, () => {
    console.log("Server started on port 5000");
});