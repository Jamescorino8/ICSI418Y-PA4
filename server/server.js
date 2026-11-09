const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { MongoClient, ObjectId } = require("mongodb");
const client = new MongoClient(process.env.MONGO_URI);

const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({
    message: "Server is running",
  });
});

const db = client.db("pa2");
const users = db.collection("users");
const projects = db.collection("projects");

const projectMemberships = db.collection("projectMemberships");
const userStories = db.collection("userStories");
const PRIORITIES = ["High", "Medium", "Low"];
const STORY_STATUSES = ["To Do", "In Progress", "Done"];

const STATUSES = ["Planning", "Active", "Completed"];

app.post("/signup", async (req, res) => {
  const { f_name, l_name, username, password } = req.body;

  if (!f_name || !l_name || !username || !password) {
    return res.status(400).json({
      message: "Required information is missing",
    });
  }

  try {
    const result = await users.findOne({
      username: username,
    });

    if (result !== null) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    await users.insertOne({
      f_name: f_name,
      l_name: l_name,
      username: username,
      password: password,
    });

    res.status(201).json({
      message: "User created successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // check required fields before using the database; return 400 if either is missing
  if (!username || !password) {
    return res.status(400).json({
      message: "Required information is missing",
    });
  }

  try {
    // search for user
    const user = await users.findOne({
      username: username,
    });

    // return stops the route here so it doesn't read user.password on null
    if (user === null) {
      return res.status(401).json({
        message: "User not found",
      });
    }
    // return stops the route here so it doesn't also send the 200 below
    if (user.password !== password) {
      return res.status(401).json({
        message: "Invalid login credentials",
      });
    }
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// return registered users for the Project Lead and member dropdowns (password left out)
app.get("/api/users", async (req, res) => {
  try {
    const result = await users
      .find({}, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/api/projects", async (req, res) => {
  const { name, description, status, project_lead_id } = req.body;

  if (!name || !description || !status || !project_lead_id) {
    return res.status(400).json({
      message: "Required information is missing",
    });
  }

  if (!STATUSES.includes(status)) {
    return res.status(400).json({
      message: "Invalid status",
    });
  }

  // check before converting; new ObjectId() throws on an invalid string
  if (!ObjectId.isValid(project_lead_id)) {
    return res.status(400).json({
      message: "Invalid Project Lead id",
    });
  }

  try {
    const leadId = new ObjectId(project_lead_id);

    const lead = await users.findOne({
      _id: leadId,
    });

    if (lead === null) {
      return res.status(404).json({
        message: "Project Lead does not exist",
      });
    }

    const result = await projects.insertOne({
      name: name,
      description: description,
      status: status,
      project_lead_id: leadId,
    });

    // the Project Lead is also a member of the new project
    await projectMemberships.insertOne({
      project_id: result.insertedId,
      user_id: leadId,
    });

    res.status(201).json({
      message: "Project created successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.get("/api/projects", async (req, res) => {
  try {
    const result = await projects.find({}).toArray();
    res.status(200).json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// returns the membership documents; the client maps user_id to a name
app.get("/api/projects/:projectId/members", async (req, res) => {
  const { projectId } = req.params;

  if (!ObjectId.isValid(projectId)) {
    return res.status(400).json({
      message: "Invalid project id",
    });
  }

  try {
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
    });

    if (project === null) {
      return res.status(404).json({
        message: "Project does not exist",
      });
    }

    const result = await projectMemberships
      .find({
        project_id: project._id,
      })
      .toArray();

    res.status(200).json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/api/projects/:projectId/members", async (req, res) => {
  const { projectId } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      message: "Required information is missing",
    });
  }

  if (!ObjectId.isValid(projectId) || !ObjectId.isValid(user_id)) {
    return res.status(400).json({
      message: "Invalid project or user id",
    });
  }

  try {
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
    });

    if (project === null) {
      return res.status(404).json({
        message: "Project does not exist",
      });
    }

    const user = await users.findOne({
      _id: new ObjectId(user_id),
    });

    if (user === null) {
      return res.status(404).json({
        message: "User does not exist",
      });
    }

    // a user may only be added to the same project once
    const existingMembership = await projectMemberships.findOne({
      project_id: project._id,
      user_id: user._id,
    });

    if (existingMembership !== null) {
      return res.status(409).json({
        message: "User is already a member of this project",
      });
    }

    await projectMemberships.insertOne({
      project_id: project._id,
      user_id: user._id,
    });

    res.status(201).json({
      message: "Member added successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.delete("/api/projects/:projectId/members/:userId", async (req, res) => {
  const { projectId, userId } = req.params;

  if (!ObjectId.isValid(projectId) || !ObjectId.isValid(userId)) {
    return res.status(400).json({
      message: "Invalid project or user id",
    });
  }

  try {
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
    });

    if (project === null) {
      return res.status(404).json({
        message: "Project does not exist",
      });
    }

    // the current Project Lead cannot be removed
    if (project.project_lead_id.equals(userId)) {
      return res.status(400).json({
        message: "The Project Lead cannot be removed",
      });
    }

    // block removal while the member has any story in THIS project (Done included);
    // stories in other projects do not count
    const assignedStory = await userStories.findOne({
      project_id: project._id,
      assigned_user_id: new ObjectId(userId),
    });

    if (assignedStory !== null) {
      return res.status(409).json({
        message:
          "This member still has stories assigned in this project. Reassign, unassign, or delete them before removing the member.",
      });
    }

    const result = await projectMemberships.deleteOne({
      project_id: project._id,
      user_id: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "User is not a member of this project",
      });
    }

    res.status(200).json({
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// true when the value is missing, not a string, or only whitespace
function isBlank(value) {
  return typeof value !== "string" || value.trim() === "";
}

// checks a story assignment against the project's memberships.
async function checkAssignment(projectObjectId, assigned_user_id) {
  // handle Unassigned
  if (
    assigned_user_id === null ||
    assigned_user_id === undefined ||
    assigned_user_id === ""
  ) {
    return { value: null };
  }

  if (
    typeof assigned_user_id !== "string" ||
    !ObjectId.isValid(assigned_user_id)
  ) {
    return { status: 400, message: "Invalid assigned user id" };
  }

  const userId = new ObjectId(assigned_user_id);

  const user = await users.findOne({
    _id: userId,
  });

  if (user === null) {
    return { status: 404, message: "Assigned user does not exist" };
  }

  // only members of this project may be assigned its stories
  const membership = await projectMemberships.findOne({
    project_id: projectObjectId,
    user_id: userId,
  });

  if (membership === null) {
    return {
      status: 400,
      message: "Assigned user is not a member of this project",
    };
  }

  return { value: userId };
}

// story route
app.get("/api/projects/:projectId/stories", async (req, res) => {
  const { projectId } = req.params;

  if (!ObjectId.isValid(projectId)) {
    return res.status(400).json({
      message: "Invalid project id",
    });
  }

  try {
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
    });

    if (project === null) {
      return res.status(404).json({
        message: "Project does not exist",
      });
    }

    const result = await userStories
      .find({ project_id: project._id })
      .toArray();

    res.status(200).json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/api/projects/:projectId/stories", async (req, res) => {
  const { projectId } = req.params;
  const { title, description, priority, assigned_user_id } = req.body;

  if (!ObjectId.isValid(projectId)) {
    return res.status(400).json({
      message: "Invalid project id",
    });
  }

  if (isBlank(title) || isBlank(description)) {
    return res.status(400).json({
      message: "Title and description are required",
    });
  }

  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({
      message: "Invalid priority",
    });
  }

  try {
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
    });

    if (project === null) {
      return res.status(404).json({
        message: "Project does not exist",
      });
    }

    const assignment = await checkAssignment(project._id, assigned_user_id);

    if (assignment.message) {
      return res.status(assignment.status).json({
        message: assignment.message,
      });
    }

    // new stories always start as To Do
    await userStories.insertOne({
      project_id: project._id,
      title: title.trim(),
      description: description.trim(),
      priority: priority,
      status: "To Do",
      assigned_user_id: assignment.value,
    });

    res.status(201).json({
      message: "User story created successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.put("/api/projects/:projectId/stories/:storyId", async (req, res) => {
  const { projectId, storyId } = req.params;
  const { title, description, priority, status, assigned_user_id } = req.body;

  if (!ObjectId.isValid(projectId) || !ObjectId.isValid(storyId)) {
    return res.status(400).json({
      message: "Invalid project or story id",
    });
  }

  if (isBlank(title) || isBlank(description)) {
    return res.status(400).json({
      message: "Title and description are required",
    });
  }

  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({
      message: "Invalid priority",
    });
  }

  if (!STORY_STATUSES.includes(status)) {
    return res.status(400).json({
      message: "Invalid status",
    });
  }

  try {
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
    });

    if (project === null) {
      return res.status(404).json({
        message: "Project does not exist",
      });
    }

    const assignment = await checkAssignment(project._id, assigned_user_id);

    if (assignment.message) {
      return res.status(assignment.status).json({
        message: assignment.message,
      });
    }

    // both ids in the filter so a story can only be edited through its own project
    const result = await userStories.updateOne(
      {
        _id: new ObjectId(storyId),
        project_id: project._id,
      },
      {
        $set: {
          title: title.trim(),
          description: description.trim(),
          priority: priority,
          status: status,
          assigned_user_id: assignment.value,
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "User story does not exist in this project",
      });
    }

    res.status(200).json({
      message: "User story updated successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.delete("/api/projects/:projectId/stories/:storyId", async (req, res) => {
  const { projectId, storyId } = req.params;

  if (!ObjectId.isValid(projectId) || !ObjectId.isValid(storyId)) {
    return res.status(400).json({
      message: "Invalid project or story id",
    });
  }

  try {
    const result = await userStories.deleteOne({
      _id: new ObjectId(storyId),
      project_id: new ObjectId(projectId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "User story does not exist in this project",
      });
    }

    res.status(200).json({
      message: "User story deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.listen(9000, () => {
  console.log("Server running on port 9000");
});

async function connectDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Could not connect to MongoDB");
    console.error(error);
  }
}

connectDatabase();
