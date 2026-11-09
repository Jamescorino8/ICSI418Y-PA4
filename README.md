# User Stories and Project Backlog

**Author:** James Corino

## Description

User Stories and Project Backlog is a full-stack web application that extends the Projects and Project Memberships application from Programming Assignment 3. Users can sign up and log in, create software projects with a Project Lead, manage project members, and now create user stories for each project and view them in a project backlog. Each story has a title, a description in the "As a [type of user], I want [goal], so that [benefit]" format, a priority, a status, and an optional assigned member. The frontend is built with React, and the backend is built with Node.js and Express, with data stored in MongoDB. The React interface sends requests to the Express server, which validates the data, reads from or writes to the database, and sends back a message that is displayed to the user.

## Features

### From PA3

- Sign up with a first name, last name, username, and password (duplicate usernames and empty fields are rejected)
- Log in with a username and password (empty fields, unknown usernames, and incorrect passwords are rejected)
- Create a project with a name, description, status (Planning, Active, or Completed), and a Project Lead selected from the registered users
- The Project Lead is automatically added as a member of the new project
- View all projects with their name, description, status, and Project Lead's username
- Select a project to view its members, add a registered user, or remove a non-lead member
- A user cannot be added to the same project twice, and the Project Lead cannot be removed

### New in PA4

- Select a project to view its backlog, including stories with every status (To Do, In Progress, and Done)
- Each story shows its title, description, priority, status, and assigned member's username (or Unassigned)
- A message is shown when no project is selected or when the selected project has no stories
- Create a user story with a title, description, priority (High, Medium, or Low), and an assigned member or Unassigned; the server always sets the status of a new story to To Do
- Edit a story's title, description, priority, status, and assigned member; the existing values are loaded into the form, and Cancel leaves the story unchanged
- Any change between the three story statuses is allowed, including reopening a Done story
- Delete a story after a confirmation; canceling the confirmation leaves the story unchanged
- The assignment dropdown lists only members of the selected project (including the Project Lead), plus Unassigned, and refreshes when members are added or removed
- Switching projects shows only the new project's stories and clears any open edit form
- A member cannot be removed from a project while any story in that project (including Done stories) is still assigned to them; stories in other projects do not block removal
- Display a success or failure message after each action, including when the server cannot be reached or a database error occurs

## Data Model

The application uses four MongoDB collections in the `pa2` database:

- `users`: `_id`, `f_name`, `l_name`, `username`, `password`
- `projects`: `_id`, `name`, `description`, `status`, `project_lead_id`
- `projectMemberships`: `_id`, `project_id`, `user_id`
- `userStories`: `_id`, `project_id`, `title`, `description`, `priority`, `status`, `assigned_user_id`

`project_lead_id`, `project_id`, `user_id`, and `assigned_user_id` are stored as MongoDB ObjectId references. Each membership document links one user to one project, so a user can belong to many projects and a project can have many users.

Each user story is stored as a separate document that belongs to exactly one project:

| Field              | Stored value                                                                |
| ------------------ | --------------------------------------------------------------------------- |
| `_id`              | MongoDB-generated ObjectId                                                  |
| `project_id`       | ObjectId of the project the story belongs to (never changes after creation) |
| `title`            | Nonblank string                                                             |
| `description`      | Nonblank string containing the user story                                   |
| `priority`         | `High`, `Medium`, or `Low`                                                  |
| `status`           | `To Do`, `In Progress`, or `Done` (new stories start as `To Do`)            |
| `assigned_user_id` | ObjectId of a current member of the same project, or `null` for Unassigned  |

The `userStories` collection is created automatically by MongoDB when the first story is saved.

## API Routes

| Method | Route                                       | Purpose                                                                                    |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| POST   | `/signup`                                   | Create a user                                                                              |
| POST   | `/login`                                    | Log in                                                                                     |
| GET    | `/api/users`                                | Get registered users                                                                       |
| POST   | `/api/projects`                             | Create a project                                                                           |
| GET    | `/api/projects`                             | Get all projects                                                                           |
| GET    | `/api/projects/:projectId/members`          | Get members of a project                                                                   |
| POST   | `/api/projects/:projectId/members`          | Add a member to a project                                                                  |
| DELETE | `/api/projects/:projectId/members/:userId`  | Remove a non-lead member (rejected with 409 if they have stories assigned in this project) |
| GET    | `/api/projects/:projectId/stories`          | Get all stories of a project                                                               |
| POST   | `/api/projects/:projectId/stories`          | Create a story (status is set to To Do)                                                    |
| PUT    | `/api/projects/:projectId/stories/:storyId` | Update a story's title, description, priority, status, and assigned member                 |
| DELETE | `/api/projects/:projectId/stories/:storyId` | Delete a story                                                                             |

The update and delete routes match on both the story id and the project id, so a story can only be changed through the project it belongs to.

## Validation

The backend validates every request, even when the React form already prevents the mistake:

- Blank titles or descriptions are rejected (400)
- Priorities other than High, Medium, or Low, and statuses other than To Do, In Progress, or Done, are rejected (400)
- Invalid project, story, or user ids are rejected (400)
- Missing projects, stories, or assigned users are rejected (404)
- Assigning a story to a user who is not a member of that project is rejected (400)
- Removing a member who still has stories assigned in that project is rejected (409)

## Technologies

- React (Vite)
- Node.js
- Express
- MongoDB

## How to Run

1. Clone the repository:

```
git clone https://github.com/Jamescorino8/ICSI418Y-PA4.git
```

2. Install the server dependencies:

```
cd ICSI418Y-PA4/server
npm install
```

3. Create a file named `.env` inside the `server` folder with your MongoDB connection string:

```
MONGO_URI=your_mongodb_connection_string
```

4. Start the server (it runs on port 9000):

```
node server.js
```

5. In a second terminal, install the client dependencies and start the React app:

```
cd ICSI418Y-PA4/client
npm install
npm run dev
```

6. Open the local address shown in the terminal (usually `http://localhost:5173`) in a web browser.

## Preparing Test Data

All test data is entered through the application:

1. In **Signup**, create three users, for example `jessv`, `jcorino`, and `carol`.
2. In **Create Project**, create two projects: one with `jessv` as Project Lead and one with `bob` as Project Lead.
3. In **Manage Project Members**, add `carol` to `jessv`'s project only, so `carol` is a non-lead member of one project but not the other.
4. In **Project Backlog**, create at least five stories across both projects, with stories in each project. Use all three priorities, assign some stories to project members, and leave some Unassigned.
5. Edit some stories so that the backlog includes all three statuses (To Do, In Progress, and Done).

To verify the rules:

- `carol` appears in the assignment dropdown for `jessv`'s project but not for `jcorino`'s project.
- Removing `carol` while she has a story assigned in that project (including a Done story) is rejected. After that story is reassigned, unassigned, or deleted, she can be removed.
- After refreshing the page, all created, edited, and deleted stories remain as they were.

## Known Issues

- None at this time.
