import { useEffect, useState } from "react";

// memberChanges is a counter from App that goes up whenever ProjectMembers
// adds or removes a member, so the assignee dropdown can be reloaded
function ProjectBacklog({ projects, users, memberChanges }) {
  const [projectId, setProjectId] = useState("");
  // Props
  const [stories, setStories] = useState([]);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState("");

  // States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("To Do");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [editingId, setEditingId] = useState(null);

  function getUsername(id) {
    if (id === null || id === undefined) {
      return "Unassigned";
    }
    const user = users.find((user) => user._id === id);
    return user ? user.username : "Unknown user";
  }

  // clear the form and leave edit mode
  function resetForm() {
    setTitle("");
    setDescription("");
    setPriority("");
    setStatus("To Do");
    setAssignedUserId("");
    setEditingId(null);
  }

  // reload the selected project's stories after a create, edit, or delete
  async function loadStories() {
    try {
      const response = await fetch(
        `http://localhost:9000/api/projects/${projectId}/stories`,
      );
      const data = await response.json();
      if (response.ok) {
        setStories(data);
      } else {
        setStories([]);
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  }

  // load the selected project's stories
  useEffect(() => {
    if (!projectId) {
      return;
    }
    let ignore = false;

    async function fetchStories() {
      try {
        const response = await fetch(
          `http://localhost:9000/api/projects/${projectId}/stories`,
        );
        const data = await response.json();
        if (ignore) {
          return;
        }
        if (response.ok) {
          setStories(data);
        } else {
          setMessage(data.message);
        }
      } catch (error) {
        if (!ignore) {
          setMessage("Could not connect to the server");
        }
      }
    }

    fetchStories();
    return () => {
      ignore = true;
    };
  }, [projectId]);

  // load the project's members for dropdown
  useEffect(() => {
    if (!projectId) {
      return;
    }
    let ignore = false;

    async function fetchMembers() {
      try {
        const response = await fetch(
          `http://localhost:9000/api/projects/${projectId}/members`,
        );
        const data = await response.json();
        if (!ignore && response.ok) {
          setMembers(data);
        }
      } catch (error) {
        if (!ignore) {
          setMessage("Could not connect to the server");
        }
      }
    }

    fetchMembers();
    return () => {
      ignore = true;
    };
  }, [projectId, memberChanges]);

  // switching projects clears the old project's stories, members, message, and form
  function handleSelectProject(event) {
    setProjectId(event.target.value);
    setStories([]);
    setMembers([]);
    setMessage("");
    resetForm();
  }

  // handlers
  async function handleSubmit(event) {
    event.preventDefault();

    if (title.trim() === "" || description.trim() === "" || priority === "") {
      setMessage("Title, description, and priority are required");
      return;
    }

    const body = {
      title: title,
      description: description,
      priority: priority,
      assigned_user_id: assignedUserId === "" ? null : assignedUserId,
    };

    let url = `http://localhost:9000/api/projects/${projectId}/stories`;
    let method = "POST";
    if (editingId) {
      body.status = status;
      url = `http://localhost:9000/api/projects/${projectId}/stories/${editingId}`;
      method = "PUT";
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      setMessage(data.message);
      if (response.ok) {
        resetForm();
        loadStories();
      }
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  }

  // load the story's saved values into the form
  function handleEdit(story) {
    setEditingId(story._id);
    setTitle(story.title);
    setDescription(story.description);
    setPriority(story.priority);
    setStatus(story.status);
    setAssignedUserId(story.assigned_user_id ?? "");
    setMessage("");
  }

  // discard form changes without sending a request
  function handleCancel() {
    resetForm();
    setMessage("");
  }

  async function handleDelete(story) {
    // canceling the confirmation leaves the story unchanged
    if (!window.confirm(`Delete the story "${story.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:9000/api/projects/${projectId}/stories/${story._id}`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json();
      setMessage(data.message);
      if (response.ok) {
        if (editingId === story._id) {
          resetForm();
        }
        loadStories();
      }
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  }

  // render
  return (
    <div>
      <h2>Project Backlog</h2>
      <select value={projectId} onChange={handleSelectProject}>
        <option value="">Select Project</option>
        {projects.map((project) => (
          <option key={project._id} value={project._id}>
            {project.name}
          </option>
        ))}
      </select>

      {!projectId && <p>Select a project to view its backlog.</p>}

      {projectId && (
        <>
          {stories.length === 0 ? (
            <p>This project has no user stories yet.</p>
          ) : (
            <ul>
              {stories.map((story) => (
                <li key={story._id}>
                  <strong>{story.title}</strong>
                  <br />
                  Priority: {story.priority} | Status: {story.status} |
                  Assigned: {getUsername(story.assigned_user_id)}
                  <br />
                  {story.description}
                  <br />
                  <button onClick={() => handleEdit(story)}>Edit</button>
                  <button onClick={() => handleDelete(story)}>Delete</button>
                </li>
              ))}
            </ul>
          )}

          <h3>{editingId ? "Edit User Story" : "Create User Story"}</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <br />
            <textarea
              placeholder="As a [type of user], I want [goal], so that [benefit]."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <br />
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="">Select Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* only members of this project (including the Project Lead) can be assigned */}
            <select
              value={assignedUserId}
              onChange={(event) => setAssignedUserId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member._id} value={member.user_id}>
                  {getUsername(member.user_id)}
                </option>
              ))}
            </select>

            {/* new stories always start as To Do, so status is only editable */}
            {editingId && (
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            )}
            <br />
            <button type="submit">{editingId ? "Save" : "Create Story"}</button>
            {editingId && (
              <button type="button" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </form>
        </>
      )}

      {message && <p>{message}</p>}
    </div>
  );
}

export default ProjectBacklog;
